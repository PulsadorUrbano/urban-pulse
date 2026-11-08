/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend. Por defecto `/api` (proxy de Vite o nginx hacia el backend). */
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
