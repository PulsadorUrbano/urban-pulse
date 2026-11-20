// Avisos de fallback al mock cuando no hay conexión con el backend real.

// Aviso al enviar una acción (login, registro, creación de incidencia) contra el mock.
export const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, realizando en el mock';

// Aviso al leer datos (listado y detalle de incidencias) desde el mock.
export const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';
