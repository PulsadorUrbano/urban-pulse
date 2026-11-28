import type { ConfigService } from '@nestjs/config';
import {
  GeocodificacionInversaService,
  normalizarRespuestaNominatim,
} from '../../../src/incidents/services/geocodificacion-inversa.service.js';

function crearConfiguracion(
  valores: Record<string, string | undefined> = {},
): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as ConfigService;
}

describe('normalizarRespuestaNominatim', () => {
  it('compone la vía y el número y traduce el distrito al enum del modelo', () => {
    expect(
      normalizarRespuestaNominatim({
        address: {
          road: '  Calle Larios  ',
          house_number: ' 12 A ',
          postcode: '29005',
          borough: 'Centro',
        },
      }),
    ).toEqual({
      street: 'Calle Larios, 12 A',
      zipCode: '29005',
      district: 'centro',
    });
  });

  it('normaliza los guiones y acentos de distritos conocidos', () => {
    expect(
      normalizarRespuestaNominatim({
        address: {
          road: 'Avenida de Plutarco',
          house_number: '1',
          postcode: '29010',
          borough: 'Teatinos-Universidad',
        },
      }),
    ).toEqual({
      street: 'Avenida de Plutarco, 1',
      zipCode: '29010',
      district: 'teatinos_universidad',
    });
  });

  it.each([
    { house_number: undefined, postcode: '29005', borough: 'Centro' },
    { house_number: '1', postcode: '2900', borough: 'Centro' },
    { house_number: '1', postcode: '29005', borough: 'Málaga' },
  ])('no inventa los componentes ausentes o no reconocidos: %j', (address) => {
    expect(
      normalizarRespuestaNominatim({
        address: { road: 'Calle Larios', ...address },
      }),
    ).toBeNull();
  });

  it('rechaza una respuesta sin objeto address', () => {
    expect(
      normalizarRespuestaNominatim({ display_name: 'Calle Larios' }),
    ).toBeNull();
  });
});

describe('GeocodificacionInversaService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta Nominatim con identidad de aplicación y reutiliza la caché', async () => {
    const respuesta = {
      address: {
        road: 'Calle Larios',
        house_number: '12',
        postcode: '29005',
        borough: 'Centro',
      },
    };
    const fetchFalso = vi.fn(async () => ({
      ok: true,
      json: async () => respuesta,
    }));
    vi.stubGlobal('fetch', fetchFalso);
    const servicio = new GeocodificacionInversaService(
      crearConfiguracion({
        NOMINATIM_ENDPOINT: 'https://geocoder.test/reverse',
        NOMINATIM_USER_AGENT: 'UrbanPulse/test',
      }),
    );

    await expect(servicio.resolver(36.7213, -4.4214)).resolves.toEqual({
      street: 'Calle Larios, 12',
      zipCode: '29005',
      district: 'centro',
    });
    await expect(servicio.resolver(36.7213, -4.4214)).resolves.toEqual({
      street: 'Calle Larios, 12',
      zipCode: '29005',
      district: 'centro',
    });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchFalso.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('lat')).toBe('36.7213');
    expect(url.searchParams.get('lon')).toBe('-4.4214');
    expect(opciones.headers).toMatchObject({
      'User-Agent': 'UrbanPulse/test',
      'Accept-Language': 'es',
    });
  });

  it('deduplica consultas concurrentes para las mismas coordenadas', async () => {
    const fetchFalso = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        address: {
          road: 'Calle Larios',
          house_number: '12',
          postcode: '29005',
          borough: 'Centro',
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchFalso);
    const servicio = new GeocodificacionInversaService(crearConfiguracion());

    const resultados = await Promise.all([
      servicio.resolver(36.7213, -4.4214),
      servicio.resolver(36.7213, -4.4214),
    ]);

    expect(resultados[0]).toEqual(resultados[1]);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('devuelve null y no lanza cuando falla la consulta externa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('red no disponible');
      }),
    );
    const servicio = new GeocodificacionInversaService(crearConfiguracion());

    await expect(servicio.resolver(36.7213, -4.4214)).resolves.toBeNull();
  });

  it('cancela la consulta externa cuando vence el tiempo configurado', async () => {
    const fetchFalso = vi.fn(
      (_url: URL, opciones: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          opciones.signal?.addEventListener('abort', () => {
            reject(new Error('consulta agotó el tiempo'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchFalso);
    const servicio = new GeocodificacionInversaService(
      crearConfiguracion({ NOMINATIM_TIMEOUT_MS: '250' }),
    );

    await expect(servicio.resolver(36.7213, -4.4214)).resolves.toBeNull();
  });
});
