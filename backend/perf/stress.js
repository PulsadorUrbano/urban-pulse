import { ENDPOINTS, call, validateEndpoint } from './lib/common.js';

const ep = ENDPOINTS.find((e) => e.id === __ENV.ENDPOINT);
if (!ep) throw new Error(`Usa -e ENDPOINT=<${ENDPOINTS.map((e) => e.id).join('|')}>`);
validateEndpoint(ep);

const MODE = __ENV.MODE || 'steps';          // steps | constant | ramping
const SLO_P95 = Number(__ENV.SLO_P95 || 500); // ms
const SLO_ERR = 0.01;                         // 1 %

const LEVELS = [10, 25, 50, 100];             // ajusta a tu hardware
const HOLD = 120, GAP = 10;

const scenarios = {};
const thresholds = {};

if (MODE === 'steps') {
  // Experimento 1: escalones de VUs (carga cerrada), uno tras otro
  LEVELS.forEach((n, i) => {
    scenarios[`vus_${n}`] = {
      executor: 'constant-vus', vus: n, duration: `${HOLD}s`,
      startTime: `${i * (HOLD + GAP)}s`, tags: { level: String(n) },
    };
    thresholds[`http_req_duration{level:${n}}`] = [`p(95)<${SLO_P95}`];
    thresholds[`http_req_failed{level:${n}}`] = [`rate<${SLO_ERR}`];
    thresholds[`http_reqs{level:${n}}`] = ['count>=0'];
  });
} else if (MODE === 'constant') {
  // Experimento 2: tasa fija, independiente del tiempo de respuesta
  scenarios.constant_rate = {
    executor: 'constant-arrival-rate',
    rate: Number(__ENV.RATE || 50), timeUnit: '1s', duration: '2m',
    preAllocatedVUs: 50, maxVUs: 300,
  };
  thresholds.http_req_duration = [`p(95)<${SLO_P95}`];
  thresholds.http_req_failed = [`rate<${SLO_ERR}`];
  thresholds.dropped_iterations = ['count==0']; // si hay drops, no llega a esa tasa
} else {
  // Experimento 3: rampa de tasa; se aborta al incumplir el SLO
  scenarios.ramp_rate = {
    executor: 'ramping-arrival-rate',
    startRate: 10, timeUnit: '1s', preAllocatedVUs: 50, maxVUs: 500,
    stages: [
      { target: 25,  duration: '1m' }, { target: 50,  duration: '1m' },
      { target: 100, duration: '1m' }, { target: 150, duration: '1m' },
      { target: 200, duration: '1m' }, { target: 300, duration: '1m' },
    ],
  };
  thresholds.http_req_duration = [{ threshold: `p(95)<${SLO_P95}`, abortOnFail: true, delayAbortEval: '20s' }];
  thresholds.http_req_failed = [{ threshold: `rate<${SLO_ERR}`, abortOnFail: true, delayAbortEval: '20s' }];
}

export const options = {
  scenarios, thresholds,
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

export default function () { call(ep); }

const f = (v) => (v === undefined ? '-' : v.toFixed(1));

export function handleSummary(data) {
  let out = `\n## ${ep.method} ${ep.path} · modo ${MODE} · SLO p95<${SLO_P95}ms, err<1%\n\n`;

  if (MODE === 'steps') {
    out += '| VUs | req/s | p50 | p95 | p99 | peticiones | errores | ¿cumple SLO? |\n|---:|---:|---:|---:|---:|---:|---:|:--:|\n';
    LEVELS.forEach((n) => {
      const d = data.metrics[`http_req_duration{level:${n}}`]?.values || {};
      const cnt = data.metrics[`http_reqs{level:${n}}`]?.values.count || 0;
      const er = data.metrics[`http_req_failed{level:${n}}`]?.values.rate || 0;
      const ok = d['p(95)'] < SLO_P95 && er < SLO_ERR;
      out += `| ${n} | ${(cnt / HOLD).toFixed(1)} | ${f(d.med)} | ${f(d['p(95)'])} | ${f(d['p(99)'])} | ${cnt} | ${Math.round(er * cnt)} | ${ok ? '✅' : '❌'} |\n`;
    });
    out += '\nCapacidad ≈ último nivel con ✅. Si el req/s deja de crecer al subir VUs, has saturado.\n';
  } else {
    const d = data.metrics.http_req_duration.values;
    const cnt = data.metrics.http_reqs.values.count;
    const dropped = data.metrics.dropped_iterations?.values.count || 0;
    out += '| req/s reales | p50 | p95 | p99 | peticiones | errores | iter. descartadas |\n|---:|---:|---:|---:|---:|---:|---:|\n';
    out += `| ${data.metrics.http_reqs.values.rate.toFixed(1)} | ${f(d.med)} | ${f(d['p(95)'])} | ${f(d['p(99)'])} | ${cnt} | ${Math.round(data.metrics.http_req_failed.values.rate * cnt)} | ${dropped} |\n`;
    if (MODE === 'ramping') out += '\nSi el test se abortó, la tasa en ese instante marca el límite de capacidad.\n';
  }
  return { stdout: out, [`stress_${MODE}_${ep.id}.md`]: out };
}
