import exec from 'k6/execution';
import { ENDPOINTS, call, validateEndpoint } from './lib/common.js';

const VUS = Number(__ENV.VUS || 10);
const DURATION_S = Number(__ENV.DURATION_S || 120);
const GAP_S = Number(__ENV.GAP_S || 10);

const idsSolicitados = (__ENV.ENDPOINTS || ENDPOINTS.map((ep) => ep.id).join(','))
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (!Number.isInteger(VUS) || VUS < 1) {
  throw new Error('VUS debe ser un entero mayor que cero.');
}
if (!Number.isInteger(DURATION_S) || DURATION_S < 1) {
  throw new Error('DURATION_S debe ser un entero mayor que cero.');
}
if (!Number.isInteger(GAP_S) || GAP_S < 0) {
  throw new Error('GAP_S debe ser un entero igual o mayor que cero.');
}

const endpoints = idsSolicitados.map((id) => {
  const endpoint = ENDPOINTS.find((ep) => ep.id === id);
  if (!endpoint) {
    throw new Error(`Endpoint desconocido: ${id}.`);
  }
  validateEndpoint(endpoint);
  return endpoint;
});

if (endpoints.length === 0) {
  throw new Error('ENDPOINTS debe incluir al menos un identificador.');
}

const porId = Object.fromEntries(endpoints.map((endpoint) => [endpoint.id, endpoint]));
const escenarios = {};
const umbrales = {};

endpoints.forEach((endpoint, indice) => {
  escenarios[endpoint.id] = {
    executor: 'constant-vus',
    vus: VUS,
    duration: `${DURATION_S}s`,
    startTime: `${indice * (DURATION_S + GAP_S)}s`,
    tags: { endpoint: endpoint.id },
  };

  // Estos umbrales neutros hacen que k6 exponga las submétricas por endpoint.
  umbrales[`http_req_duration{endpoint:${endpoint.id}}`] = ['max>=0'];
  umbrales[`http_reqs{endpoint:${endpoint.id}}`] = ['count>=0'];
  umbrales[`http_req_failed{endpoint:${endpoint.id}}`] = ['rate>=0'];
});

export const options = {
  scenarios: escenarios,
  thresholds: umbrales,
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const endpoint = porId[exec.scenario.name];
  call(endpoint);
}

const formato = (valor) => (valor === undefined ? '-' : valor.toFixed(1));

export function handleSummary(data) {
  const filas = endpoints.map((endpoint) => {
    const duracion = data.metrics[`http_req_duration{endpoint:${endpoint.id}}`]?.values || {};
    const peticiones = data.metrics[`http_reqs{endpoint:${endpoint.id}}`]?.values.count || 0;
    const tasaErrores = data.metrics[`http_req_failed{endpoint:${endpoint.id}}`]?.values.rate || 0;

    return {
      endpoint: `${endpoint.method} ${endpoint.path}`,
      p50: duracion.med,
      p95: duracion['p(95)'],
      p99: duracion['p(99)'],
      peticiones,
      errores: Math.round(tasaErrores * peticiones),
      peticionesPorSegundo: peticiones / DURATION_S,
      ratio: duracion.med ? duracion['p(99)'] / duracion.med : 0,
    };
  });

  const ordenadas = [...filas].sort((a, b) => (b.p95 || 0) - (a.p95 || 0));
  let salida = `\n## Línea base (${VUS} VUs, ${DURATION_S} s por endpoint)\n\n`;
  salida += '| endpoint | p50 (ms) | p95 (ms) | p99 (ms) | peticiones | errores |\n';
  salida += '|---|---:|---:|---:|---:|---:|\n';
  ordenadas.forEach((fila) => {
    salida += `| ${fila.endpoint} | ${formato(fila.p50)} | ${formato(fila.p95)} | ${formato(fila.p99)} | ${fila.peticiones} | ${fila.errores} |\n`;
  });

  salida += '\n### Apoyo al análisis\n\n';
  salida += '| endpoint | peticiones/s | p99/p50 |\n|---|---:|---:|\n';
  ordenadas.forEach((fila) => {
    salida += `| ${fila.endpoint} | ${fila.peticionesPorSegundo.toFixed(1)} | ${fila.ratio.toFixed(1)}x |\n`;
  });

  const masLento = ordenadas[0];
  const menorThroughput = [...filas].sort(
    (a, b) => a.peticionesPorSegundo - b.peticionesPorSegundo,
  )[0];
  salida += `\n- Mayor latencia (p95): ${masLento.endpoint}\n`;
  salida += `- Menor throughput: ${menorThroughput.endpoint}\n`;
  salida += `- ¿Coinciden?: ${masLento.endpoint === menorThroughput.endpoint ? 'Sí' : 'No'}\n`;

  return {
    stdout: salida,
    'baseline_resultados.md': salida,
    'baseline_raw.json': JSON.stringify(data, null, 2),
  };
}
