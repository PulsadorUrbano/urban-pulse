import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { iniciarDesarrollo } from './desarrollo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

class FakeChild extends EventEmitter {
  constructor(pid, extra = {}) {
    super();
    this.pid = pid;
    this.extra = extra;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kills = [];
    this.exitCode = null;
    this.signalCode = null;
  }
  kill(signal = 'SIGTERM') {
    this.kills.push(signal);
    this.exitCode = 0;
    queueMicrotask(() => this.emit('close', 0, signal));
    return true;
  }
}

function fakeEnvironment({ lan = ['192.168.1.20'], ports = [41001, 41002, 41003, 41004], backendPort = 49152, backendMessage = true, readiness = true, collisions = new Map(), timeout = false, platform = 'linux' } = {}) {
  const children = [];
  const forks = [];
  const spawns = [];
  const stdout = [];
  const stderr = [];
  const handlers = new Map();
  let nextPid = 1000;
  let portIndex = 0;
  const fakeProcess = {
    env: { PATH: 'keep' }, platform,
    on(event, handler) { handlers.set(event, handler); },
    off(event, handler) { if (handlers.get(event) === handler) handlers.delete(event); },
    emit(event, ...args) { handlers.get(event)?.(...args); },
    kill(pid, signal) {
      const child = children.find((item) => item.pid === Math.abs(pid));
      if (child && child.exitCode === null) child.kill(signal);
    },
  };
  const net = {
    createServer() {
      return {
        once() { return this; },
        listen(_port, _host, callback) {
          this.address = () => ({ port: ports[portIndex++] });
          queueMicrotask(callback);
          return this;
        },
        close(callback) { queueMicrotask(() => callback?.()); },
      };
    },
    createConnection({ port }) {
      const socket = new EventEmitter();
      socket.destroy = () => {};
      queueMicrotask(() => {
        const spawn = spawns.find((item) => item.port === port);
        if (readiness && !timeout && (!spawn || !spawn.neverReady)) socket.emit('connect');
        else if (!timeout) socket.emit('error', Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }));
      });
      return socket;
    },
  };
  const childProcess = {
    execFile(_command, _args, _options, callback) {
      const child = new FakeChild(nextPid++);
      children.push(child);
      queueMicrotask(() => {
        child.exitCode = 0;
        child.emit('close', 0, null);
        callback(null, '', '');
      });
      return child;
    },
    fork(_file, _args, options) {
      const child = new FakeChild(nextPid++);
      forks.push({ child, options });
      children.push(child);
      if (backendMessage && !timeout) queueMicrotask(() => child.emit('message', { tipo: 'backend-listo', puerto: backendPort }));
      return child;
    },
    spawn(command, args, options) {
      const port = Number(args[args.indexOf('--port') + 1]);
      const child = new FakeChild(nextPid++);
      const collision = collisions.get(spawns.length);
      const row = { child, command, args, options, port, neverReady: !readiness || timeout };
      spawns.push(row);
      children.push(child);
      if (collision) queueMicrotask(() => {
        child.stderr.emit('data', Buffer.from(collision));
        child.exitCode = 1;
        child.emit('close', 1, null);
      });
      return child;
    },
  };
  const deps = {
    rootDir: root,
    fs: { existsSync: () => true },
    os: { networkInterfaces: () => ({ Ethernet: lan.map((address) => ({ address, family: 'IPv4', internal: false })) }) },
    net,
    childProcess,
    process: fakeProcess,
    platform,
    setTimeout(callback, delay) {
      const expedited = delay === 100 || delay === 5_000 || (timeout && delay === 60_000);
      const id = setTimeout(callback, expedited ? 0 : delay);
      return id;
    },
    clearTimeout(id) { clearTimeout(id); },
    writeOut: (message) => stdout.push(String(message)),
    writeErr: (message) => stderr.push(String(message)),
  };
  return { deps, children, forks, spawns, stdout, stderr, fakeProcess, handlers };
}

async function runUntilStopped(fake, options, expectedSpawns) {
  const running = iniciarDesarrollo(options, fake.deps);
  running.catch(() => {});
  try {
    await waitForSpawns(fake, expectedSpawns);
    fake.fakeProcess.emit('SIGINT');
    await running;
  } catch (error) {
    fake.fakeProcess.emit('SIGINT');
    await running.catch(() => {});
    throw error;
  }
}

async function waitForSpawns(fake, count) {
  for (let attempts = 0; fake.spawns.length < count && attempts < 2_000; attempts += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.equal(fake.spawns.length, count);
}

test('sin --mock arranca backend, web y Expo sin reservar puerto mock', async () => {
  const fake = fakeEnvironment();
  await runUntilStopped(fake, {}, 2);
  assert.equal(fake.spawns.length, 2);
  assert.equal(fake.spawns.some(({ command }) => command.includes('json-server')), false);
  assert.equal(fake.forks[0].options.env.PORT, '0');
  assert.match(fake.spawns[0].options.env.URBAN_PULSE_PROXY_URL, /49152$/);
  assert.equal(fake.spawns[1].options.env.EXPO_PUBLIC_BACKEND_URL, 'http://192.168.1.20:49152');
  assert.equal(Object.hasOwn(fake.spawns[1].options.env, 'EXPO_PUBLIC_API_URL'), false);
});

test('con --mock arranca cuatro servicios e inyecta la URL efectiva en Expo', async () => {
  const fake = fakeEnvironment();
  await runUntilStopped(fake, { mock: true }, 3);
  assert.equal(fake.spawns.length, 3);
  assert.match(fake.spawns[0].args[0], /json-server/);
  assert.equal(fake.spawns[2].options.env.EXPO_PUBLIC_API_URL, 'http://192.168.1.20:41001');
  assert.equal(fake.spawns[2].options.env.CI, '1');
});

test('backend anuncia 49152 para proxy web y URL móvil', async () => {
  const fake = fakeEnvironment({ backendPort: 49152 });
  await runUntilStopped(fake, {}, 2);
  assert.equal(fake.spawns[0].options.env.URBAN_PULSE_PROXY_URL, 'http://127.0.0.1:49152');
  assert.equal(fake.spawns[1].options.env.EXPO_PUBLIC_BACKEND_URL, 'http://192.168.1.20:49152');
});

test('rechaza puerto IPC inválido sin consumidores y cierra backend', async () => {
  const fake = fakeEnvironment({ backendPort: 0 });
  await assert.rejects(iniciarDesarrollo({}, fake.deps));
  assert.equal(fake.spawns.length, 0);
  assert.ok(fake.forks[0].child.kills.length > 0);
});

test('opción inválida o LAN ambigua no crea hijos', async () => {
  const invalid = fakeEnvironment();
  await assert.rejects(iniciarDesarrollo({ wat: true }, invalid.deps));
  assert.equal(invalid.children.length, 0);
  const ambiguous = fakeEnvironment({ lan: ['192.168.1.20', '10.0.0.3'] });
  await assert.rejects(iniciarDesarrollo({}, ambiguous.deps));
  assert.equal(ambiguous.children.length, 0);
});

test('candidato repetido no se asigna a dos servicios', async () => {
  const fake = fakeEnvironment({ ports: [41001, 41001, 41002, 41003] });
  await runUntilStopped(fake, {}, 2);
  assert.notEqual(fake.spawns[0].port, fake.spawns[1].port);
});

test('colisión explícita cambia de candidato y limita a tres intentos por servicio', async () => {
  const fake = fakeEnvironment({
    ports: [41001, 41002, 41003, 41004, 41005, 41006],
    collisions: new Map([[0, 'Error: Port 41001 is already in use'], [1, 'Port 41002 is being used by another process']]),
  });
  await runUntilStopped(fake, { mock: true }, 5);
  assert.equal(fake.spawns.length, 5);
  assert.notEqual(fake.spawns[0].port, fake.spawns[1].port);
});

test('error de configuración no relacionado con puerto no se reintenta', async () => {
  const fake = fakeEnvironment({ collisions: new Map([[0, 'Unknown option']]) });
  await assert.rejects(iniciarDesarrollo({}, fake.deps));
  assert.equal(fake.spawns.length, 1);
  assert.ok(fake.forks[0].child.kills.length > 0);
});

test('backend sin anuncio o CLI sin escucha agota timeout y cierra hijos propios', async () => {
  const backend = fakeEnvironment({ backendMessage: false, timeout: true });
  await assert.rejects(iniciarDesarrollo({}, backend.deps));
  assert.equal(backend.spawns.length, 0);
  const cli = fakeEnvironment({ readiness: false, timeout: true });
  await assert.rejects(iniciarDesarrollo({}, cli.deps));
  assert.ok(cli.spawns.every(({ child }) => child.kills.length > 0));
});

test('Ctrl+C y salida de hijo cierran el resto sin duplicar terminaciones', async () => {
  const signalCase = fakeEnvironment();
  const signalRun = iniciarDesarrollo({}, signalCase.deps);
  try {
    await waitForSpawns(signalCase, 2);
    signalCase.fakeProcess.emit('SIGINT');
    await signalRun;
  } catch (error) {
    signalCase.fakeProcess.emit('SIGINT');
    await signalRun.catch(() => {});
    throw error;
  }
  const signalCounts = signalCase.children.map((child) => child.kills.length);
  signalCase.fakeProcess.emit('SIGTERM');
  assert.deepEqual(signalCase.children.map((child) => child.kills.length), signalCounts);

  const exitCase = fakeEnvironment();
  const exitRun = iniciarDesarrollo({}, exitCase.deps);
  await waitForSpawns(exitCase, 2);
  exitCase.spawns[0].child.exitCode = 1;
  exitCase.spawns[0].child.emit('close', 1, null);
  await assert.rejects(exitRun);
  assert.ok(exitCase.spawns.slice(1).every(({ child }) => child.kills.length > 0));
  assert.ok(exitCase.forks[0].child.kills.length > 0);
});


test('tres colisiones agotan intentos y cierran el backend', async () => {
  const fake = fakeEnvironment({ collisions: new Map([[0, 'EADDRINUSE'], [1, 'EADDRINUSE'], [2, 'EADDRINUSE']]) });
  await assert.rejects(iniciarDesarrollo({}, fake.deps), /EADDRINUSE/);
  assert.equal(fake.spawns.length, 3);
  assert.ok(fake.forks[0].child.kills.length > 0);
});

test('dependencia ausente detiene el arranque sin crear hijos', async () => {
  const fake = fakeEnvironment();
  fake.deps.fs.existsSync = () => false;
  await assert.rejects(iniciarDesarrollo({}, fake.deps), /Falta el archivo requerido/);
  assert.equal(fake.children.length, 0);
});

test('Ctrl+C mientras se espera el backend cancela sin error ni consumidores', async () => {
  const fake = fakeEnvironment({ backendMessage: false });
  const running = iniciarDesarrollo({}, fake.deps);
  for (let i = 0; fake.forks.length === 0 && i < 100; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  fake.fakeProcess.emit('SIGINT');
  await running;
  assert.equal(fake.spawns.length, 0);
  assert.ok(fake.forks[0].child.kills.length > 0);
});


test('cancelar un socket pendiente no abre conexiones nuevas', async () => {
  const fake = fakeEnvironment({ readiness: false });
  fake.deps.setTimeout = (fn, delay) => setTimeout(fn, delay === 5000 ? 50 : delay === 100 ? 0 : delay);
  let connections = 0;
  fake.deps.net.createConnection = () => {
    connections += 1;
    const socket = new EventEmitter();
    let destroyed = false;
    socket.destroy = () => {
      if (!destroyed) {
        destroyed = true;
        queueMicrotask(() => socket.emit('error', new Error('socket cerrado')));
      }
    };
    return socket;
  };
  const running = iniciarDesarrollo({}, fake.deps);
  for (let i = 0; connections === 0 && i < 100; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  for (const child of fake.children) {
    if (child.exitCode === null) child.kill = () => true;
  }
  const atStop = connections;
  fake.fakeProcess.emit('SIGINT');
  await running;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(connections, atStop);
});
