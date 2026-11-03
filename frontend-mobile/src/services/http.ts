// Tiempo máximo de espera por defecto para las peticiones al servidor mock.
export const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// Error específico para distinguir un timeout de un fallo de red genérico.
export class RequestTimeoutError extends Error {
  constructor(message = 'El servidor tardó demasiado en responder.') {
    super(message);
    this.name = 'RequestTimeoutError';
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

// Extrae el `message` del cuerpo de error de NestJS (string o array de
// strings de class-validator). Devuelve null si el cuerpo no tiene esa forma.
export function extractBackendErrorMessage(rawBody: string): string | null {
  try {
    const body = JSON.parse(rawBody) as { message?: string | string[] };
    if (typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return body.message.join('; ');
    }
  } catch {
    // Cuerpo no-JSON: se ignora y se usa el mensaje genérico.
  }
  return null;
}

// Construye el mensaje de error a mostrar en la UI cuando el backend
// responde pero rechaza la petición: incluye el motivo real cuando el
// cuerpo de la respuesta lo trae, y conserva un log en consola para depurar
// casos en los que no. El mensaje genérico de cada caso se recibe por
// parámetro porque esta función se reutiliza entre varios servicios.
export async function buildBackendRejectionMessage(
  response: Response,
  genericMessage: string,
): Promise<string> {
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    if (__DEV__) {
      console.warn(`[http] El backend rechazó la petición (${response.status}).`);
    }
    return genericMessage;
  }

  if (__DEV__) {
    console.warn(`[http] El backend rechazó la petición (${response.status}):`, rawBody);
  }

  const backendMessage = extractBackendErrorMessage(rawBody);
  return backendMessage ? `${genericMessage} (${backendMessage})` : genericMessage;
}
