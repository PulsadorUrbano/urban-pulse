import { execFile, fork, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_TIMEOUT = 120_000;
const START_TIMEOUT = 60_000;
const SHUTDOWN_GRACE = 5_000;
const MAX_ATTEMPTS = 3;

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Las opciones deben ser un objeto.');
  const unknown = Object.keys(options).find((key) => !['mock', 'host'].includes(key));
  if (unknown) throw new Error(`Opción desconocida: ${unknown}`);
  if (options.mock !== undefined && typeof options.mock !== 'boolean') throw new Error('La opción --mock no recibe valor.');
  if (options.host !== undefined && (typeof options.host !== 'string' || !net.isIPv4(options.host))) {
    throw new Error('El valor de --host debe ser una dirección IPv4.');
  }
}

function chooseHost(options, osApi) {
  if (options.host) return options.host;
  const candidates = [...new Set(Object.values(osApi.networkInterfaces()).flatMap((items) => items ?? [])
    .filter((item) => (item.family === 'IPv4' || item.family === 4) && !item.internal)
    .map((item) => item.address))];
  if (candidates.length === 1) return candidates[0];
  throw new Error(`No se pudo elegir una IP LAN. Candidatas: ${candidates.length ? candidates.join(', ') : '(ninguna)'}. Indica --host IPv4.`);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--mock') {
      if (options.mock) throw new Error('La opción --mock está repetida.');
      options.mock = true;
    } else if (argument === '--host') {
      if (options.host !== undefined || !argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error('Falta un valor IPv4 después de --host.');
      }
      options.host = argv[++index];
    } else {
      throw new Error(`Opción desconocida: ${argument}`);
    }
  }
  validateOptions(options);
  return options;
}

function prefixOutput(stream, service, write) {
  let remainder = '';
  stream?.on('data', (chunk) => {
    remainder += chunk.toString();
    const lines = remainder.split(/(?<=\n)/);
    remainder = lines.pop() ?? '';
    for (const line of lines) write(`[${service}] ${line}`);
  });
  stream?.on('end', () => { if (remainder) write(`[${service}] ${remainder}\n`); });
}

function isPortCollision(output) {
  return /EADDRINUSE|address already in use|port\s+\d+\s+(?:is\s+)?(?:already\s+)?in use|port\s+\d+\s+is being used by another process/i.test(output);
}

export async function iniciarDesarrollo(options = {}, dependencies = {}) {
  const fs = dependencies.fs ?? { existsSync };
  const osApi = dependencies.os ?? os;
  const netApi = dependencies.net ?? net;
  const childProcess = dependencies.childProcess ?? { execFile, fork, spawn };
  const proc = dependencies.process ?? process;
  const platform = dependencies.platform ?? proc.platform;
  const setTimer = dependencies.setTimeout ?? setTimeout;
  const clearTimer = dependencies.clearTimeout ?? clearTimeout;
  const writeOut = dependencies.writeOut ?? ((text) => console.log(text));
  const writeErr = dependencies.writeErr ?? ((text) => console.error(text));
  const root = dependencies.rootDir ?? ROOT;
  const children = [];
  const usedPorts = new Set();
  const pendingSockets = new Set();
  const timers = new Set();
  let failure = null;
  let closing = false;
  let complete = false;
  let shutdownPromise;
  let resolveEnded;
  const ended = new Promise((resolve) => { resolveEnded = resolve; });

  const timer = (fn, delay) => {
    const id = setTimer(() => { timers.delete(id); fn(); }, delay);
    timers.add(id);
    return id;
  };
  const cancelTimer = (id) => { clearTimer(id); timers.delete(id); };
  const stop = (error = null) => {
    if (error && !failure) failure = error instanceof Error ? error : new Error(String(error));
    if (closing) return shutdownPromise;
    closing = true;
    resolveEnded();
    for (const id of timers) clearTimer(id);
    timers.clear();
    for (const socket of pendingSockets) socket.destroy();
    pendingSockets.clear();
    for (const [signal, handler] of signalHandlers) proc.off?.(signal, handler);
    shutdownPromise = (async () => {
      const owned = children.filter(({ child }) => child.pid);
      for (const { child } of [...owned].reverse()) {
        if (child.exitCode === null && child.signalCode === null) {
          if (platform === 'win32') {
            await new Promise((resolve) => childProcess.execFile('taskkill', ['/PID', String(child.pid), '/T'], { windowsHide: true }, () => resolve()));
          } else {
            try { proc.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
          }
        }
      }
      if (owned.some(({ child }) => child.exitCode === null && child.signalCode === null)) {
        await new Promise((resolve) => timer(resolve, SHUTDOWN_GRACE));
      }
      for (const { child } of [...owned].reverse()) {
        if (child.exitCode !== null || child.signalCode !== null) continue;
        if (platform === 'win32') {
          await new Promise((resolve) => childProcess.execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
        } else {
          try { proc.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
        }
      }
      complete = true;
    })();
    return shutdownPromise;
  };
  const signalHandlers = ['SIGINT', 'SIGTERM'].map((signal) => [signal, () => { void stop(); }]);
  for (const [signal, handler] of signalHandlers) proc.on?.(signal, handler);

  function addChild(child, name, watchUnexpected = true) {
    const record = { child, name, output: '', stopped: false, intentional: false, watchUnexpected, error: null };
    children.push(record);
    prefixOutput(child.stdout, name, writeOut);
    prefixOutput(child.stderr, name, writeErr);
    child.stdout?.on('data', (chunk) => { record.output = (record.output + chunk.toString()).slice(-16_384); });
    child.stderr?.on('data', (chunk) => { record.output = (record.output + chunk.toString()).slice(-16_384); });
    child.on('close', (code, signal) => {
      record.stopped = true;
      if (record.watchUnexpected && !record.intentional && !closing && !complete) {
        void stop(new Error(`${name} terminó inesperadamente (código ${code ?? 'desconocido'}, señal ${signal ?? 'ninguna'}). ${record.output}`));
      }
    });
    child.on('error', (error) => {
      record.error = error;
      record.output = (record.output + `${error?.message ?? error}\n`).slice(-16_384);
      if (record.watchUnexpected && !closing && !complete) void stop(error);
    });
    return record;
  }

  async function stopChild(record) {
    record.intentional = true;
    if (record.child.exitCode !== null || record.child.signalCode !== null || record.stopped) return;
    try { record.child.kill('SIGTERM'); } catch {}
  }

  function assertRunning() {
    if (failure) throw failure;
    if (closing) throw new Error('Arranque cancelado.');
  }

  async function compileBackend(directory) {
    await Promise.race([
      new Promise((resolve, reject) => {
        const command = platform === 'win32' ? 'npm.cmd' : 'npm';
        const child = childProcess.execFile(command, ['run', 'build'], {
          cwd: directory, windowsHide: true, shell: platform === 'win32', detached: platform !== 'win32',
        }, (error, stdout = '', stderr = '') => {
          cancelTimer(watchdog);
          record.watchUnexpected = false;
          if (error) reject(new Error(`Falló la compilación del backend: ${stderr || stdout || error.message}`));
          else resolve();
        });
        const record = addChild(child, 'compilación', false);
        const watchdog = timer(() => {
          void stop(new Error('La compilación del backend superó 120 segundos.'));
          reject(new Error('La compilación del backend superó 120 segundos.'));
        }, BUILD_TIMEOUT);
      }),
      ended.then(() => { throw failure ?? new Error('Arranque cancelado.'); }),
    ]);
    assertRunning();
  }

  async function awaitBackend(record) {
    return Promise.race([
      new Promise((resolve, reject) => {
        const watchdog = timer(() => reject(new Error('El backend no anunció su puerto en 60 segundos.')), START_TIMEOUT);
        record.child.on('message', (message) => {
          if (message?.tipo !== 'backend-listo') return;
          cancelTimer(watchdog);
          if (!Number.isInteger(message.puerto) || message.puerto < 1 || message.puerto > 65535) {
            reject(new Error('El backend anunció un puerto inválido.'));
          } else resolve(message.puerto);
        });
        record.child.once('close', (code, signal) => {
          cancelTimer(watchdog);
          reject(new Error(`El backend terminó antes de anunciar puerto (código ${code ?? 'desconocido'}, señal ${signal ?? 'ninguna'}).`));
        });
        record.child.once('error', (error) => {
          cancelTimer(watchdog);
          reject(new Error(`Falló el proceso backend: ${error.message}`));
        });
      }),
      ended.then(() => { throw failure ?? new Error('Arranque cancelado.'); }),
    ]);
  }

  async function choosePort() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const port = await new Promise((resolve, reject) => {
        const server = netApi.createServer();
        server.once('error', reject);
        server.listen(0, '0.0.0.0', () => {
          const address = server.address();
          server.close((error) => error ? reject(error) : resolve(address.port));
        });
      });
      assertRunning();
      if (!usedPorts.has(port)) {
        usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No se pudo encontrar un puerto distinto para el servicio.');
  }

  async function waitForListen(record, port) {
    const started = Date.now();
    return Promise.race([
      new Promise((resolve, reject) => {
        let connected = false;
        let settled = false;
        let watchdog;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          cancelTimer(watchdog);
          if (error) reject(error); else resolve();
        };
        const check = () => {
          if (settled) return;
          if (closing) { finish(new Error('Arranque cancelado.')); return; }
          if (record.error && record.error.code !== 'EADDRINUSE') {
            finish(new Error(`${record.name}: ${record.error.message}. ${record.output}`));
            return;
          }
          if (record.stopped || record.child.exitCode !== null || record.child.signalCode !== null) {
            finish(new Error(`${record.name} terminó antes de escuchar. ${record.output}`));
            return;
          }
          if (connected) { record.watchUnexpected = true; finish(); return; }
          if (Date.now() - started >= START_TIMEOUT) {
            finish(new Error(`${record.name} no abrió el puerto ${port} en 60 segundos. ${record.output}`));
            return;
          }
          const socket = netApi.createConnection({ host: '127.0.0.1', port });
          pendingSockets.add(socket);
          let socketSettled = false;
          const retry = () => {
            if (socketSettled || closing) return;
            socketSettled = true;
            socket.destroy();
            pendingSockets.delete(socket);
            timer(check, 100);
          };
          socket.once('connect', () => {
            if (socketSettled || closing) return;
            socketSettled = true;
            connected = true;
            socket.destroy();
            pendingSockets.delete(socket);
            // Confirma que el hijo no salió con EADDRINUSE antes de aceptar el TCP listener.
            timer(check, 100);
          });
          socket.once('error', retry);
        };
        watchdog = timer(() => finish(new Error(`${record.name} no abrió el puerto ${port} en 60 segundos. ${record.output}`)), START_TIMEOUT);
        check();
      }),
      ended.then(() => { throw failure ?? new Error('Arranque cancelado.'); }),
    ]);
  }

  async function startService({ name, project, binary, args, env }) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      assertRunning();
      const port = await choosePort();
      const child = childProcess.spawn(process.execPath, [path.join(root, project, binary), ...args(port)], {
        cwd: path.join(root, project), env: env(port), shell: false,
        stdio: ['inherit', 'pipe', 'pipe'], detached: platform !== 'win32', windowsHide: true,
      });
      const record = addChild(child, name, false);
      try {
        await waitForListen(record, port);
        assertRunning();
        record.watchUnexpected = true;
        return port;
      } catch (error) {
        lastError = error;
        const output = `${record.output}\n${error.message}`;
        if (!record.stopped || !isPortCollision(output) || attempt === MAX_ATTEMPTS) throw new Error(`${name}: ${output}`);
        writeErr(`[${name}] Puerto ocupado; se probará otro (${attempt + 1}/${MAX_ATTEMPTS}).`);
        await stopChild(record);
        assertRunning();
      }
    }
    throw lastError;
  }

  try {
    validateOptions(options);
    const host = chooseHost(options, osApi);
    const required = [
      ['backend', 'node_modules/@nestjs/cli/bin/nest.js'],
      ['backend', 'node_modules/prisma/build/index.js'],
      ['frontend-web', 'node_modules/vite/bin/vite.js'],
      ['frontend-mobile', 'node_modules/expo/bin/cli'],
    ];
    if (options.mock) required.push(['frontend-mobile', 'node_modules/json-server/lib/bin.js'], ['frontend-mobile', 'db.json']);
    for (const [project, file] of required) {
      const fullPath = path.join(root, project, file);
      if (!fs.existsSync(fullPath)) throw new Error(`Falta el archivo requerido: ${fullPath}`);
    }

    const backendDir = path.join(root, 'backend');
    await compileBackend(backendDir);
    assertRunning();

    const backend = addChild(childProcess.fork(path.join(backendDir, 'dist/main.js'), [], {
      cwd: backendDir,
      env: { ...proc.env, URBAN_PULSE_COORDINADO: '1', PORT: '0' },
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      detached: platform !== 'win32', windowsHide: true,
    }), 'backend', false);
    const backendPort = await awaitBackend(backend);
    assertRunning();
    backend.watchUnexpected = true;
    usedPorts.add(backendPort);

    const ports = {};
    if (options.mock) {
      ports.mock = await startService({
        name: 'mock', project: 'frontend-mobile', binary: 'node_modules/json-server/lib/bin.js',
        args: (port) => ['db.json', '--port', String(port), '--host', '0.0.0.0'],
        env: () => ({ ...proc.env }),
      });
    }
    ports.web = await startService({
      name: 'web', project: 'frontend-web', binary: 'node_modules/vite/bin/vite.js',
      args: (port) => ['--host', '0.0.0.0', '--port', String(port), '--strictPort'],
      env: () => ({ ...proc.env, URBAN_PULSE_PROXY_URL: `http://127.0.0.1:${backendPort}`, VITE_BACKEND_URL: '/api' }),
    });
    ports.expo = await startService({
      name: 'Expo', project: 'frontend-mobile', binary: 'node_modules/expo/bin/cli',
      args: (port) => ['start', '--lan', '--port', String(port)],
      env: () => {
        const result = { ...proc.env, EXPO_PUBLIC_BACKEND_URL: `http://${host}:${backendPort}`, REACT_NATIVE_PACKAGER_HOSTNAME: host, CI: '1' };
        if (options.mock) result.EXPO_PUBLIC_API_URL = `http://${host}:${ports.mock}`;
        return result;
      },
    });

    writeOut(`Backend: http://${host}:${backendPort}`);
    writeOut(`Web: http://${host}:${ports.web}`);
    writeOut(`Expo: exp://${host}:${ports.expo}`);
    if (options.mock) writeOut(`Mock: http://${host}:${ports.mock}`);
    else writeOut('Mock desactivado; el fallback móvil puede fallar si no hay un servidor externo');
    await ended;
    await shutdownPromise;
    if (failure) throw failure;
    return { ...ports, backend: backendPort, host };
  } catch (error) {
    if (closing && !failure) {
      await shutdownPromise;
      return;
    }
    if (!failure) failure = error instanceof Error ? error : new Error(String(error));
    await stop(failure);
    throw failure;
  } finally {
    for (const [signal, handler] of signalHandlers) proc.off?.(signal, handler);
    for (const id of timers) clearTimer(id);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    iniciarDesarrollo(options).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
