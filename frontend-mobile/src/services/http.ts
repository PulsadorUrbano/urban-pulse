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
