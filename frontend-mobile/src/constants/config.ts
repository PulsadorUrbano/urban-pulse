import Constants from 'expo-constants';

const MOCK_SERVER_PORT = 3001;

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

  const devServerHost = Constants.expoConfig?.hostUri?.split(':')[0];
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

export const API_BASE_URL = resolveApiBaseUrl();

// Registro de depuración para verificar a qué host apunta la app en desarrollo.
if (__DEV__) {
  console.log('[config] API_BASE_URL =', API_BASE_URL);
}
