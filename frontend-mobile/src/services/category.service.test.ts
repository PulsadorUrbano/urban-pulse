/// <reference types="jest" />
import { CATEGORIES_ENDPOINT, fetchCategories } from './category.service';
import type { Category } from '@/types/category';

const categoriesFixture: Category[] = [
  { id: '1', name: 'Vías' },
  { id: '2', name: 'Alumbrado' },
];

describe('fetchCategories', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    // Restaura los timers reales tras cada test que active fake timers.
    jest.useRealTimers();
  });

  it('hace GET al endpoint de categorías', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => categoriesFixture,
    });

    await fetchCategories();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(CATEGORIES_ENDPOINT);
    expect(options.method).toBe('GET');
  });

  it('devuelve el array de categorías cuando response.ok es true', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => categoriesFixture,
    });

    const categories = await fetchCategories();

    expect(categories).toEqual(categoriesFixture);
  });

  it('lanza un Error cuando response.ok es false', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(fetchCategories()).rejects.toThrow(Error);
  });

  it('lanza un Error cuando fetch rechaza (fallo de red)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(fetchCategories()).rejects.toThrow(Error);
  });

  it('lanza un Error de timeout cuando fetch no responde en 10s', async () => {
    jest.useFakeTimers();

    // fetch devuelve una promesa que nunca resuelve; solo se rechaza al abortar.
    fetchMock.mockImplementationOnce(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const promise = fetchCategories();

    // Avanza el reloj hasta disparar el AbortController del servicio.
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(/tardó demasiado/i);
  });
});
