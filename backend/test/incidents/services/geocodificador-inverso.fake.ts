import type { IncidentAddress } from '../../../src/incidents/incident.js';
import type { GeocodificacionInversaService } from '../../../src/incidents/services/geocodificacion-inversa.service.js';

export function crearGeocodificadorInversoFalso(
  resolver: (
    latitude: number,
    longitude: number,
  ) => Promise<IncidentAddress | null> = async () => null,
): Pick<GeocodificacionInversaService, 'resolver'> {
  return { resolver };
}
