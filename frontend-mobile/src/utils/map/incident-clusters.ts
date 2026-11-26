import Supercluster from 'supercluster';

import type { MapIncident } from '@/types/incident-map';

const MIN_ZOOM = 0;
const MAX_ZOOM = 20;

// Propiedades de cada punto GeoJSON: solo el id, para no duplicar datos.
interface IncidentPointProperties {
  incidentId: string;
}

export interface IncidentClusterIndex {
  supercluster: Supercluster<IncidentPointProperties, Record<string, never>>;
  incidentsById: Map<string, MapIncident>;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface ClusterItem {
  type: 'cluster';
  id: number;
  count: number;
  latitude: number;
  longitude: number;
}

export interface PointItem {
  type: 'point';
  incident: MapIncident;
}

export type ClusterOrPoint = ClusterItem | PointItem;

// Construye el índice de supercluster a partir de las incidencias.
export function buildIncidentClusterIndex(
  incidentList: MapIncident[],
): IncidentClusterIndex {
  const supercluster = new Supercluster<
    IncidentPointProperties,
    Record<string, never>
  >({ minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, radius: 60 });

  supercluster.load(
    incidentList.map((incident) => ({
      type: 'Feature' as const,
      properties: { incidentId: incident.id },
      // GeoJSON usa [longitud, latitud]
      geometry: {
        type: 'Point' as const,
        coordinates: [incident.longitude, incident.latitude],
      },
    })),
  );

  return {
    supercluster,
    incidentsById: new Map(incidentList.map((incident) => [incident.id, incident])),
  };
}

// Zoom aproximado de la región visible a partir del ancho en grados.
export function getZoomForRegion(region: MapRegion): number {
  if (region.longitudeDelta <= 0) return MAX_ZOOM;
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// Devuelve clusters y puntos individuales visibles en la región.
export function getClustersForRegion(
  index: IncidentClusterIndex,
  region: MapRegion,
): ClusterOrPoint[] {
  const west = Math.max(-180, region.longitude - region.longitudeDelta / 2);
  const east = Math.min(180, region.longitude + region.longitudeDelta / 2);
  const south = Math.max(-90, region.latitude - region.latitudeDelta / 2);
  const north = Math.min(90, region.latitude + region.latitudeDelta / 2);

  const features = index.supercluster.getClusters(
    [west, south, east, north],
    getZoomForRegion(region),
  );

  const items: ClusterOrPoint[] = [];
  for (const feature of features) {
    const [longitude, latitude] = feature.geometry.coordinates;
    const properties = feature.properties;
    if ('cluster' in properties && properties.cluster) {
      items.push({
        type: 'cluster',
        id: properties.cluster_id,
        count: properties.point_count,
        latitude,
        longitude,
      });
      continue;
    }
    const incident = index.incidentsById.get(properties.incidentId);
    if (incident) items.push({ type: 'point', incident });
  }
  return items;
}

// Zoom al que un cluster se expande en sus hijos.
export function getClusterExpansionZoom(
  index: IncidentClusterIndex,
  clusterId: number,
): number {
  return index.supercluster.getClusterExpansionZoom(clusterId);
}

// Delta de longitud (grados) equivalente a un nivel de zoom.
export function getLongitudeDeltaForZoom(zoom: number): number {
  return 360 / 2 ** zoom;
}

// Región centrada en un punto para un zoom dado; la latitud mantiene la proporción de la región actual.
export function getRegionForZoom(
  center: { latitude: number; longitude: number },
  zoom: number,
  currentRegion: MapRegion,
): MapRegion {
  const longitudeDelta = getLongitudeDeltaForZoom(zoom);
  const aspectRatio =
    currentRegion.longitudeDelta > 0
      ? currentRegion.latitudeDelta / currentRegion.longitudeDelta
      : 1;
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: longitudeDelta * aspectRatio,
    longitudeDelta,
  };
}
