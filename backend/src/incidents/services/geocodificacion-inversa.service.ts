import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AddressDistrict } from '../../generated/prisma/enums.js';
import type { IncidentAddress } from '../incident.js';

const DIRECCION_NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT_POR_DEFECTO =
  'UrbanPulse/1.0 (https://github.com/PulsadorUrbano/UrbanPulse)';
const INTERVALO_MINIMO_MS = 1_000;
const ESPERA_MAXIMA_COLA_MS = 5_000;
const DURACION_CACHE_MS = 24 * 60 * 60 * 1_000;
const LIMITE_CACHE = 2_000;
const TIEMPO_ESPERA_POR_DEFECTO_MS = 2_500;

const distritoPorNombre: Readonly<Record<string, AddressDistrict>> = {
  centro: 'centro',
  centro_historico: 'centro',
  distrito_centro: 'centro',
  este: 'este',
  distrito_este: 'este',
  ciudad_jardin: 'ciudad_jardin',
  bailen_miraflores: 'bailen_miraflores',
  palma_palmilla: 'palma_palmilla',
  cruz_del_humilladero: 'cruz_del_humilladero',
  carretera_de_cadiz: 'carretera_de_cadiz',
  churriana: 'churriana',
  campanillas: 'campanillas',
  puerto_de_la_torre: 'puerto_de_la_torre',
  teatinos_universidad: 'teatinos_universidad',
};

interface EntradaCache {
  direccion: IncidentAddress | null;
  caducaEn: number;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const normalizado = valor.normalize('NFC').replace(/\s+/g, ' ').trim();
  return normalizado || null;
}

function claveNormalizada(valor: string): string {
  return valor
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buscarDistrito(
  direcciones: Record<string, unknown>,
): AddressDistrict | null {
  for (const nombreCampo of ['borough', 'city_district', 'suburb']) {
    const nombre = texto(direcciones[nombreCampo]);
    if (!nombre) continue;
    const distrito = distritoPorNombre[claveNormalizada(nombre)];
    if (distrito) return distrito;
  }
  return null;
}

export function normalizarRespuestaNominatim(
  respuesta: unknown,
): IncidentAddress | null {
  if (!esRegistro(respuesta) || !esRegistro(respuesta.address)) return null;
  const datos = respuesta.address;
  const via = texto(datos.road);
  const numero = texto(datos.house_number);
  const zipCode = texto(datos.postcode);
  const district = buscarDistrito(datos);

  if (!via || !numero || !zipCode || !/^[0-9]{5}$/.test(zipCode) || !district) {
    return null;
  }

  return {
    street: `${via}, ${numero}`,
    zipCode,
    district,
  };
}

@Injectable()
export class GeocodificacionInversaService {
  private readonly logger = new Logger(GeocodificacionInversaService.name);
  private readonly endpoint: string;
  private readonly userAgent: string;
  private readonly tiempoEsperaMs: number;
  private readonly cache = new Map<string, EntradaCache>();
  private readonly consultasEnCurso = new Map<
    string,
    Promise<IncidentAddress | null>
  >();
  private colaSolicitudes: Promise<void> = Promise.resolve();
  private ultimaSolicitudEnviada = 0;

  constructor(config: ConfigService) {
    this.endpoint =
      config.get<string>('NOMINATIM_ENDPOINT')?.trim() || DIRECCION_NOMINATIM;
    this.userAgent =
      config.get<string>('NOMINATIM_USER_AGENT')?.trim() ||
      USER_AGENT_POR_DEFECTO;
    this.tiempoEsperaMs = this.obtenerTiempoEspera(config);
  }

  async resolver(
    latitude: number,
    longitude: number,
  ): Promise<IncidentAddress | null> {
    const clave = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const entrada = this.cache.get(clave);
    if (entrada && entrada.caducaEn > Date.now()) return entrada.direccion;
    this.cache.delete(clave);

    const consultaEnCurso = this.consultasEnCurso.get(clave);
    if (consultaEnCurso) return consultaEnCurso;

    const consulta = this.consultar(latitude, longitude)
      .then((direccion) => {
        if (direccion !== undefined) this.guardarEnCache(clave, direccion);
        return direccion ?? null;
      })
      .finally(() => this.consultasEnCurso.delete(clave));
    this.consultasEnCurso.set(clave, consulta);
    return consulta;
  }

  private async consultar(
    latitude: number,
    longitude: number,
  ): Promise<IncidentAddress | null | undefined> {
    try {
      const respuesta = await this.consultarConLimite(latitude, longitude);
      if (!respuesta) return undefined;
      if (!respuesta.ok) throw new Error('Respuesta HTTP no satisfactoria');
      return normalizarRespuestaNominatim(await respuesta.json());
    } catch {
      this.logger.warn(
        'No se pudo resolver la dirección de una ubicación mediante Nominatim.',
      );
      return undefined;
    }
  }

  private async consultarConLimite(
    latitude: number,
    longitude: number,
  ): Promise<Response | null> {
    const encoladoEn = Date.now();
    const anterior = this.colaSolicitudes;
    let liberar = () => {};
    this.colaSolicitudes = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    await anterior;

    try {
      if (Date.now() - encoladoEn > ESPERA_MAXIMA_COLA_MS) return null;
      const esperaMs = Math.max(
        0,
        this.ultimaSolicitudEnviada + INTERVALO_MINIMO_MS - Date.now(),
      );
      if (esperaMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, esperaMs));
      }
      if (Date.now() - encoladoEn > ESPERA_MAXIMA_COLA_MS) return null;
      this.ultimaSolicitudEnviada = Date.now();

      const url = new URL(this.endpoint);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('zoom', '18');
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));

      const abortController = new AbortController();
      const timeout = setTimeout(
        () => abortController.abort(),
        this.tiempoEsperaMs,
      );
      try {
        return await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'es',
          },
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      liberar();
    }
  }

  private guardarEnCache(
    clave: string,
    direccion: IncidentAddress | null,
  ): void {
    if (this.cache.size >= LIMITE_CACHE) {
      const primeraClave = this.cache.keys().next().value;
      if (primeraClave) this.cache.delete(primeraClave);
    }
    this.cache.set(clave, {
      direccion,
      caducaEn: Date.now() + DURACION_CACHE_MS,
    });
  }

  private obtenerTiempoEspera(config: ConfigService): number {
    const configurado = Number(config.get<string>('NOMINATIM_TIMEOUT_MS'));
    if (Number.isInteger(configurado) && configurado >= 250) {
      return Math.min(configurado, 10_000);
    }
    return TIEMPO_ESPERA_POR_DEFECTO_MS;
  }
}
