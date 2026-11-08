/**
 * URL base del backend NestJS (equivale a BACKEND_API_URL en frontend-mobile/src/constants/config.ts).
 *
 * Se define con `VITE_BACKEND_URL` (ver `.env.example`). Por defecto es `/api`: en desarrollo,
 * el proxy de Vite lo redirige al backend (vite.config.ts) y, en Docker, nginx hace lo mismo
 * (nginx/default.conf.template). Se lee en cada llamada para que los tests puedan cambiarla.
 */
export function resolveBackendApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL?.trim();
  return configuredUrl ? configuredUrl.replace(/\/+$/, '') : '/api';
}

/**
 * Convierte una ruta del backend (p. ej. `/uploads/incidents/<id>/<archivo>.jpg`) en una URL
 * accesible desde el navegador. Las URL absolutas se devuelven sin cambios.
 */
export function resolveBackendAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${resolveBackendApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
