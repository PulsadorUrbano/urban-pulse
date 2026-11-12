// Capa HTTP común. Mismos nombres que frontend-mobile/src/services/http.ts.

// Tiempo máximo de espera por defecto para las peticiones al backend.
export const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// Error específico para distinguir un timeout de un fallo de red genérico.
export class RequestTimeoutError extends Error {
  constructor(message = 'El servidor tardó demasiado en responder.') {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

// El backend respondió con un cuerpo que no cumple el contrato esperado.
export class BackendContractError extends Error {
  constructor(endpoint: string) {
    super(`La respuesta del backend en ${endpoint} no tiene el formato esperado.`);
    this.name = 'BackendContractError';
  }
}

// Envuelve `fetch` con un timeout usando AbortController. Si la petición se
// aborta por superar el tiempo límite, se traduce a un RequestTimeoutError.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 502, 503 y 504 los genera un intermediario (proxy de Vite o nginx) cuando el
// backend no está disponible: equivalen a no tener conexión.
export function isBackendUnavailable(response: Response): boolean {
  return response.status === 502 || response.status === 503 || response.status === 504;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Extrae el `message` del cuerpo de error de NestJS (string o array de
// strings). Devuelve null si el cuerpo no tiene esa forma.
export function extractBackendErrorMessage(rawBody: string): string | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!isRecord(body)) return null;
  const { message } = body;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('; ');
  }
  return null;
}

// Mensaje a mostrar cuando el backend responde pero rechaza la petición:
// incluye el motivo real cuando el cuerpo lo trae.
export async function buildBackendRejectionMessage(
  response: Response,
  genericMessage: string,
): Promise<string> {
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    return genericMessage;
  }
  const backendMessage = extractBackendErrorMessage(rawBody);
  return backendMessage ? `${genericMessage} (${backendMessage})` : genericMessage;
}

// Lee el cuerpo JSON y lo valida con `isExpected`; si no cumple el contrato,
// lanza BackendContractError en lugar de propagar datos mal formados.
export async function readJson<T>(
  response: Response,
  isExpected: (value: unknown) => value is T,
  endpoint: string,
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new BackendContractError(endpoint);
  }
  if (!isExpected(body)) {
    throw new BackendContractError(endpoint);
  }
  return body;
}

export function bearerHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}
