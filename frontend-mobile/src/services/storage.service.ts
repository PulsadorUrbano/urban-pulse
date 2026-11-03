// Retardo artificial en milisegundos que simula la latencia de un futuro
// almacenamiento externo (S3, MinIO, etc.). Al no existir todavía ningún
// servicio en la nube, la app conserva la URI local de la imagen.
export const SIMULATED_STORAGE_DELAY_MS = 800;

// Simula el "guardado" de la foto en un almacenamiento externo SIN red ni
// nube: espera el retardo simulado y resuelve devolviendo la misma URI local
// (`file://...`). Esa URI es la que se persistirá en `url` al crear la imagen
// de la incidencia. El retardo permite probar los estados de carga y error de
// la UI y se implementa con `setTimeout` para poder controlarlo con fake
// timers de Jest en los tests.
export async function storePhoto(uri: string): Promise<string> {
  await new Promise<void>((resolve) => setTimeout(resolve, SIMULATED_STORAGE_DELAY_MS));

  return uri;
}
