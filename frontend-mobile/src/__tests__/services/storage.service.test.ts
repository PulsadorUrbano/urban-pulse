/// <reference types="jest" />
import { SIMULATED_STORAGE_DELAY_MS, storePhoto } from '@/services/storage.service';

// URI local simulada, como las que devuelve expo-image-picker en un dispositivo.
const localPhotoUri = 'file:///data/user/0/app/cache/foto-bache.jpg';

describe('storePhoto', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    // Restaura los timers reales y el fetch original tras cada test.
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('no resuelve antes de SIMULATED_STORAGE_DELAY_MS y devuelve la misma uri después', async () => {
    jest.useFakeTimers();

    const promise = storePhoto(localPhotoUri);

    // Bandera para detectar una resolución anticipada de la promesa.
    let hasSettled = false;
    void promise.then(() => {
      hasSettled = true;
    });

    // Un instante antes del retardo simulado: la promesa sigue pendiente.
    jest.advanceTimersByTime(SIMULATED_STORAGE_DELAY_MS - 1);
    await Promise.resolve();

    expect(hasSettled).toBe(false);

    // El último milisegundo dispara el timer y la promesa resuelve con la MISMA uri.
    jest.advanceTimersByTime(1);
    const storedUri = await promise;

    expect(storedUri).toBe(localPhotoUri);
    expect(hasSettled).toBe(true);
  });

  it('devuelve la misma uri sin realizar llamadas de red (fetch)', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const promise = storePhoto(localPhotoUri);

    jest.advanceTimersByTime(SIMULATED_STORAGE_DELAY_MS);

    await expect(promise).resolves.toBe(localPhotoUri);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
