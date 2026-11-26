/// <reference types="jest" />
import {
  buildIncidentClusterIndex,
  getClusterExpansionZoom,
  getClustersForRegion,
  getLongitudeDeltaForZoom,
  getRegionForZoom,
  getZoomForRegion,
  type ClusterItem,
  type ClusterOrPoint,
  type MapRegion,
} from '@/utils/map/incident-clusters';
import type { MapIncident } from '@/types/incident-map';

// Centro de Madrid; los puntos "cercanos" están a ~0.01 grados entre sí.
const MADRID_LATITUDE = 40.4168;
const MADRID_LONGITUDE = -3.7038;
const NEARBY_OFFSET_DEGREES = 0.01;

function buildIncident(overrides: Partial<MapIncident> & { id: string }): MapIncident {
  return {
    title: 'Bache',
    status: 'reported',
    category: 'Bache',
    categoryId: '1',
    latitude: MADRID_LATITUDE,
    longitude: MADRID_LONGITUDE,
    createdAt: '2026-11-20T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

function buildRegion(overrides: Partial<MapRegion> = {}): MapRegion {
  return {
    latitude: MADRID_LATITUDE,
    longitude: MADRID_LONGITUDE,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
    ...overrides,
  };
}

function isClusterItem(item: ClusterOrPoint): item is ClusterItem {
  return item.type === 'cluster';
}

function sumVisibleCount(items: ClusterOrPoint[]): number {
  return items.reduce(
    (total, item) => total + (isClusterItem(item) ? item.count : 1),
    0,
  );
}

describe('buildIncidentClusterIndex', () => {
  it('construye un índice vacío sin lanzar error cuando la lista está vacía', () => {
    const index = buildIncidentClusterIndex([]);

    expect(index.incidentsById.size).toBe(0);
    expect(getClustersForRegion(index, buildRegion())).toEqual([]);
  });

  it('indexa las incidencias por id para resolver los puntos individuales', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({ id: 'b', latitude: 41.3851, longitude: 2.1734 }),
    ];

    const index = buildIncidentClusterIndex(incidentList);

    expect(index.incidentsById.get('a')).toBe(incidentList[0]);
    expect(index.incidentsById.get('b')).toBe(incidentList[1]);
  });
});

describe('getClustersForRegion', () => {
  it('agrupa puntos cercanos en un cluster cuando el zoom es bajo (delta grande)', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({
        id: 'b',
        latitude: MADRID_LATITUDE + NEARBY_OFFSET_DEGREES,
      }),
      buildIncident({
        id: 'c',
        longitude: MADRID_LONGITUDE + NEARBY_OFFSET_DEGREES,
      }),
    ];
    const index = buildIncidentClusterIndex(incidentList);

    const items = getClustersForRegion(index, buildRegion({ longitudeDelta: 0.5 }));

    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('cluster');
  });

  it('separa los mismos puntos en marcadores individuales cuando el delta es pequeño', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({
        id: 'b',
        latitude: MADRID_LATITUDE + NEARBY_OFFSET_DEGREES,
      }),
    ];
    const index = buildIncidentClusterIndex(incidentList);

    // Región centrada entre ambos puntos y con delta pequeño (zoom ~13),
    // suficiente para que la distancia de 0.01 grados supere el radio de cluster.
    const items = getClustersForRegion(
      index,
      buildRegion({
        latitude: MADRID_LATITUDE + NEARBY_OFFSET_DEGREES / 2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }),
    );

    expect(items.every((item) => item.type === 'point')).toBe(true);
    expect(items).toHaveLength(2);
  });

  it('informa el count correcto del cluster con el número de incidencias agrupadas', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({ id: 'b' }),
      buildIncident({ id: 'c' }),
    ];
    const index = buildIncidentClusterIndex(incidentList);

    const items = getClustersForRegion(index, buildRegion({ longitudeDelta: 0.5 }));

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'cluster', count: 3 });
  });

  it('conserva el total de incidencias visibles entre clusters y puntos sueltos', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({ id: 'b' }),
      buildIncident({
        id: 'lejana',
        latitude: MADRID_LATITUDE + 0.2,
        longitude: MADRID_LONGITUDE + 0.2,
      }),
    ];
    const index = buildIncidentClusterIndex(incidentList);

    const items = getClustersForRegion(index, buildRegion({ longitudeDelta: 0.5 }));

    expect(sumVisibleCount(items)).toBe(3);
  });

  it('devuelve el punto individual con la incidencia original', () => {
    const lonelyIncident = buildIncident({
      id: 'sola',
      latitude: MADRID_LATITUDE + 0.2,
      longitude: MADRID_LONGITUDE + 0.2,
    });
    const index = buildIncidentClusterIndex([lonelyIncident]);

    const items = getClustersForRegion(
      index,
      buildRegion({ latitude: lonelyIncident.latitude, longitude: lonelyIncident.longitude, latitudeDelta: 0.001, longitudeDelta: 0.001 }),
    );

    expect(items).toEqual([{ type: 'point', incident: lonelyIncident }]);
  });

  it('no incluye incidencias fuera del bbox de la región visible', () => {
    const insideIncident = buildIncident({ id: 'dentro' });
    const barcelonaIncident = buildIncident({
      id: 'barcelona',
      latitude: 41.3851,
      longitude: 2.1734,
    });
    const index = buildIncidentClusterIndex([insideIncident, barcelonaIncident]);

    const items = getClustersForRegion(
      index,
      buildRegion({ latitudeDelta: 0.05, longitudeDelta: 0.05 }),
    );

    const visibleIncidentIds = items
      .filter((item): item is Extract<ClusterOrPoint, { type: 'point' }> => item.type === 'point')
      .map((item) => item.incident.id);
    expect(visibleIncidentIds).toEqual(['dentro']);
  });

  it('acota la región cuando el delta cubre más del mundo y no lanza error', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({ id: 'b', latitude: -33.8688, longitude: 151.2093 }),
    ];
    const index = buildIncidentClusterIndex(incidentList);

    const items = getClustersForRegion(
      index,
      buildRegion({ latitudeDelta: 400, longitudeDelta: 720 }),
    );

    expect(sumVisibleCount(items)).toBe(2);
  });
});

describe('getClusterExpansionZoom', () => {
  it('devuelve un zoom superior al zoom actual para que el cluster se expanda al pulsarlo', () => {
    const incidentList = [
      buildIncident({ id: 'a' }),
      buildIncident({
        id: 'b',
        latitude: MADRID_LATITUDE + NEARBY_OFFSET_DEGREES,
      }),
    ];
    const index = buildIncidentClusterIndex(incidentList);
    const region = buildRegion({ longitudeDelta: 0.5 });

    const items = getClustersForRegion(index, region);
    const cluster = items.find(isClusterItem);

    expect(cluster).toBeDefined();
    expect(getClusterExpansionZoom(index, cluster!.id)).toBeGreaterThan(
      getZoomForRegion(region),
    );
  });
});

describe('getZoomForRegion', () => {
  it('calcula el zoom aproximado a partir del delta de longitud', () => {
    // log2(360 / 0.5) = 9.49 -> 9
    expect(getZoomForRegion(buildRegion({ longitudeDelta: 0.5 }))).toBe(9);
    // delta de 360 grados = mundo completo -> zoom 0
    expect(getZoomForRegion(buildRegion({ longitudeDelta: 360 }))).toBe(0);
  });

  it('acota el zoom a 0 cuando el delta es enorme', () => {
    expect(getZoomForRegion(buildRegion({ longitudeDelta: 1000 }))).toBe(0);
  });

  it('acota el zoom a 20 cuando el delta es muy pequeño', () => {
    expect(getZoomForRegion(buildRegion({ longitudeDelta: 1e-9 }))).toBe(20);
  });

  it('devuelve zoom 20 cuando el delta es 0 para evitar división por cero', () => {
    expect(getZoomForRegion(buildRegion({ longitudeDelta: 0 }))).toBe(20);
  });

  it('devuelve zoom 20 cuando el delta es negativo', () => {
    expect(getZoomForRegion(buildRegion({ longitudeDelta: -1 }))).toBe(20);
  });
});

describe('getLongitudeDeltaForZoom', () => {
  it('devuelve 360 grados en zoom 0 (mundo completo)', () => {
    expect(getLongitudeDeltaForZoom(0)).toBe(360);
  });

  it('divide a la mitad por cada nivel de zoom (zoom 10 -> 360 / 1024)', () => {
    expect(getLongitudeDeltaForZoom(10)).toBe(360 / 1024);
    expect(getLongitudeDeltaForZoom(1)).toBe(180);
  });
});

describe('getRegionForZoom', () => {
  it('centra la región en el punto indicado', () => {
    const currentRegion = buildRegion({ latitudeDelta: 0.5, longitudeDelta: 0.5 });

    const region = getRegionForZoom(
      { latitude: 39.4699, longitude: -0.3763 },
      10,
      currentRegion,
    );

    expect(region.latitude).toBe(39.4699);
    expect(region.longitude).toBe(-0.3763);
  });

  it('usa el delta de longitud del zoom indicado', () => {
    const region = getRegionForZoom(
      { latitude: MADRID_LATITUDE, longitude: MADRID_LONGITUDE },
      10,
      buildRegion({ latitudeDelta: 0.5, longitudeDelta: 0.5 }),
    );

    expect(region.longitudeDelta).toBe(360 / 1024);
  });

  it('mantiene la proporción latitud/longitud de la región actual', () => {
    // Región actual alargada: proporción lat/lon = 0.5 / 0.25 = 2.
    const currentRegion = buildRegion({ latitudeDelta: 0.5, longitudeDelta: 0.25 });

    const region = getRegionForZoom(
      { latitude: MADRID_LATITUDE, longitude: MADRID_LONGITUDE },
      10,
      currentRegion,
    );

    expect(region.latitudeDelta / region.longitudeDelta).toBeCloseTo(2);
    expect(region.latitudeDelta).toBeCloseTo((360 / 1024) * 2);
  });

  it('con longitudeDelta 0 en la región actual usa proporción 1 (latitudeDelta igual al de longitud)', () => {
    const currentRegion = buildRegion({ latitudeDelta: 0.3, longitudeDelta: 0 });

    const region = getRegionForZoom(
      { latitude: MADRID_LATITUDE, longitude: MADRID_LONGITUDE },
      10,
      currentRegion,
    );

    expect(region.latitudeDelta).toBe(region.longitudeDelta);
    expect(region.latitudeDelta).toBe(360 / 1024);
  });

  it('con longitudeDelta negativo en la región actual también usa proporción 1', () => {
    const region = getRegionForZoom(
      { latitude: MADRID_LATITUDE, longitude: MADRID_LONGITUDE },
      0,
      buildRegion({ latitudeDelta: 0.3, longitudeDelta: -1 }),
    );

    expect(region.latitudeDelta).toBe(360);
    expect(region.longitudeDelta).toBe(360);
  });
});
