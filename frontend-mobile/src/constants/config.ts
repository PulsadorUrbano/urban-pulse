import Constants from 'expo-constants';

const MOCK_SERVER_PORT = 3001;
const BACKEND_SERVER_PORT = 4000;

/**
 * Host del dev server de Metro (`Constants.expoConfig.hostUri`), sin puerto.
 * Devuelve `undefined` si no está disponible (p. ej. en producción o tests).
 */
function resolveDevServerHost(): string | undefined {
  return Constants.expoConfig?.hostUri?.split(':')[0];
}

/**
 * URL base del servidor mock (json-server).
 *
 * Se puede forzar con `EXPO_PUBLIC_API_URL` para apuntar a otro host sin
 * recompilar. Si no se define, se reutiliza el host del dev server de Metro
 * (`Constants.expoConfig.hostUri`), de modo que apunta a la misma máquina tanto
 * en el simulador como en un dispositivo físico. Esto evita el problema de
 * `localhost`: en un móvil físico `localhost` es el propio teléfono, no el
 * ordenador que sirve la app.
 */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  const devServerHost = resolveDevServerHost();
  if (devServerHost) {
    // El modo túnel expone solo el dev server; el mock no es accesible desde el dispositivo.
    const isTunnelHost = devServerHost.includes('exp.direct') || devServerHost.includes('ngrok');
    if (__DEV__ && isTunnelHost) {
      console.warn(
        `[config] El dev server está en modo túnel (${devServerHost}). El servidor mock (puerto ${MOCK_SERVER_PORT}) no será accesible desde el dispositivo: usa LAN (npm run start) o define EXPO_PUBLIC_API_URL.`,
      );
    }

    return `http://${devServerHost}:${MOCK_SERVER_PORT}`;
  }

  return `http://localhost:${MOCK_SERVER_PORT}`;
}

/**
 * URL base del backend NestJS (usada para solicitar el token).
 *
 * Prioridad: `EXPO_PUBLIC_BACKEND_URL` (tal cual) > host del dev server de Metro
 * con el puerto del backend > `localhost` como último recurso.
 */
function resolveBackendApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  const devServerHost = resolveDevServerHost();
  if (devServerHost) {
    return `http://${devServerHost}:${BACKEND_SERVER_PORT}`;
  }

  return `http://localhost:${BACKEND_SERVER_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const BACKEND_API_URL = resolveBackendApiUrl();

// Registro de depuración para verificar a qué host apunta la app en desarrollo.
if (__DEV__) {
  console.log('[config] API_BASE_URL =', API_BASE_URL);
}
