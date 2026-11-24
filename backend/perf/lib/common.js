import { check } from 'k6';
import http from 'k6/http';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const TOKEN = __ENV.TOKEN || '';
const CIVIC_ID = __ENV.CIVIC_ID || '';
const INCIDENT_ID = __ENV.INCIDENT_ID || '';

export const ENDPOINTS = [
  { id: 'health', method: 'GET', path: '/health' },
  { id: 'categories', method: 'GET', path: '/categories' },
  {
    id: 'incidents',
    method: 'GET',
    path: CIVIC_ID
      ? `/incidents?limit=10&civicId=${encodeURIComponent(CIVIC_ID)}`
      : '/incidents?limit=10',
    requiereToken: true,
  },
  {
    id: 'assignment_options',
    method: 'GET',
    path: '/incidents/assignment-options',
    requiereToken: true,
  },
  { id: 'auth_me', method: 'GET', path: '/auth/me', requiereToken: true },
  ...(INCIDENT_ID
    ? [
        {
          id: 'incident_detail',
          method: 'GET',
          path: `/incidents/${encodeURIComponent(INCIDENT_ID)}`,
          requiereToken: true,
        },
        {
          id: 'incident_assignments',
          method: 'GET',
          path: `/incidents/${encodeURIComponent(INCIDENT_ID)}/assignments`,
          requiereToken: true,
        },
      ]
    : []),
];

export function validateEndpoint(endpoint) {
  if (endpoint.requiereToken && !TOKEN) {
    throw new Error(`El endpoint ${endpoint.id} requiere configurar TOKEN.`);
  }
}

export function call(endpoint) {
  const headers = { Accept: 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const respuesta = http.request(
    endpoint.method,
    `${BASE_URL}${endpoint.path}`,
    endpoint.body ? JSON.stringify(endpoint.body) : null,
    { headers, tags: { endpoint: endpoint.id } },
  );
  check(respuesta, {
    'respuesta 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  return respuesta;
}
