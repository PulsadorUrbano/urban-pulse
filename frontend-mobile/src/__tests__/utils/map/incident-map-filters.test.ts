/// <reference types="jest" />
import {
  applyIncidentMapFilters,
  isUnresolvedIncident,
  isWithinAge,
} from '@/utils/map/incident-map-filters';
import type { MapIncident, IncidentMapFilters } from '@/types/incident-map';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date('2026-11-26T12:00:00.000Z');

// Devuelve una fecha ISO situada `days` días antes de FIXED_NOW (en milisegundos exactos).
function isoDaysBeforeNow(days: number, extraMilliseconds = 0): string {
  return new Date(
    FIXED_NOW.getTime() - days * MILLISECONDS_PER_DAY - extraMilliseconds,
  ).toISOString();
}

function buildIncident(overrides: Partial<MapIncident> & { id: string }): MapIncident {
  return {
    title: 'Bache en la calzada',
    status: 'reported',
    category: 'Bache',
    categoryId: 'cat-bache',
    latitude: 40.4168,
    longitude: -3.7038,
    createdAt: isoDaysBeforeNow(1),
    images: [],
    ...overrides,
  };
}

const ALL_FILTERS: IncidentMapFilters = { age: 'all', categoryIds: [] };

describe('isUnresolvedIncident', () => {
  it.each(['reported', 'validated', 'assigned', 'in_progress', 'reopened', 'rejected'] as const)(
    'considera "%s" como incidencia visible en el mapa',
    (status) => {
      expect(isUnresolvedIncident(status)).toBe(true);
    },
  );

  it.each(['resolved', 'closed'] as const)(
    'considera "%s" como resuelta y la oculta',
    (status) => {
      expect(isUnresolvedIncident(status)).toBe(false);
    },
  );
});

describe('isWithinAge', () => {
  it('acepta cualquier fecha con el filtro "all", incluso inválida', () => {
    expect(isWithinAge(isoDaysBeforeNow(3650), 'all', FIXED_NOW)).toBe(true);
    expect(isWithinAge('no-es-una-fecha', 'all', FIXED_NOW)).toBe(true);
  });

  it('rechaza fechas inválidas con filtros de antigüedad', () => {
    expect(isWithinAge('no-es-una-fecha', '7d', FIXED_NOW)).toBe(false);
    expect(isWithinAge('', '30d', FIXED_NOW)).toBe(false);
    expect(isWithinAge('2026-13-45T99:00:00Z', '90d', FIXED_NOW)).toBe(false);
  });

  it.each([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ] as const)('incluye exactamente el límite inclusivo de %s', (age, days) => {
    expect(isWithinAge(isoDaysBeforeNow(days), age, FIXED_NOW)).toBe(true);
  });

  it.each([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ] as const)('excluye una incidencia 1 ms más antigua que el límite de %s', (age, days) => {
    expect(isWithinAge(isoDaysBeforeNow(days, 1), age, FIXED_NOW)).toBe(false);
  });

  it('incluye incidencias recientes y con fecha futura dentro de la ventana', () => {
    expect(isWithinAge(isoDaysBeforeNow(0), '7d', FIXED_NOW)).toBe(true);
    expect(isWithinAge(isoDaysBeforeNow(-1), '7d', FIXED_NOW)).toBe(true);
  });

  it('excluye incidencias de 8 días con el filtro de 7 días y las incluye con 30 días', () => {
    const eightDaysOld = isoDaysBeforeNow(8);

    expect(isWithinAge(eightDaysOld, '7d', FIXED_NOW)).toBe(false);
    expect(isWithinAge(eightDaysOld, '30d', FIXED_NOW)).toBe(true);
  });

  it('usa el "now" recibido por parámetro y no la fecha real del sistema', () => {
    const createdAt = '2026-11-20T12:00:00.000Z';
    const laterNow = new Date('2027-01-01T00:00:00.000Z');

    expect(isWithinAge(createdAt, '7d', FIXED_NOW)).toBe(true);
    expect(isWithinAge(createdAt, '7d', laterNow)).toBe(false);
  });
});

describe('applyIncidentMapFilters', () => {
  it('devuelve una lista vacía cuando no hay incidencias', () => {
    expect(applyIncidentMapFilters([], ALL_FILTERS, FIXED_NOW)).toEqual([]);
  });

  it('oculta siempre las incidencias resueltas y cerradas, también con filtro "all"', () => {
    const resolvedIncident = buildIncident({ id: 'resuelta', status: 'resolved' });
    const closedIncident = buildIncident({ id: 'cerrada', status: 'closed' });
    const openIncident = buildIncident({ id: 'abierta', status: 'in_progress' });

    const visibleIncidents = applyIncidentMapFilters(
      [resolvedIncident, closedIncident, openIncident],
      ALL_FILTERS,
      FIXED_NOW,
    );

    expect(visibleIncidents.map((incident) => incident.id)).toEqual(['abierta']);
  });

  it('muestra las incidencias rechazadas', () => {
    const rejectedIncident = buildIncident({ id: 'rechazada', status: 'rejected' });

    expect(applyIncidentMapFilters([rejectedIncident], ALL_FILTERS, FIXED_NOW)).toEqual([
      rejectedIncident,
    ]);
  });

  it('con categoryIds vacío muestra todas las categorías, incluida categoryId null', () => {
    const bacheIncident = buildIncident({ id: 'bache', categoryId: 'cat-bache' });
    const nullCategoryIncident = buildIncident({
      id: 'sin-categoria',
      category: null,
      categoryId: null,
    });

    const visibleIncidents = applyIncidentMapFilters(
      [bacheIncident, nullCategoryIncident],
      { age: 'all', categoryIds: [] },
      FIXED_NOW,
    );

    expect(visibleIncidents.map((incident) => incident.id)).toEqual([
      'bache',
      'sin-categoria',
    ]);
  });

  it('con un filtro de categoría activo deja fuera las incidencias con categoryId null', () => {
    const nullCategoryIncident = buildIncident({
      id: 'sin-categoria',
      category: null,
      categoryId: null,
    });

    const visibleIncidents = applyIncidentMapFilters(
      [nullCategoryIncident],
      { age: 'all', categoryIds: ['cat-bache'] },
      FIXED_NOW,
    );

    expect(visibleIncidents).toEqual([]);
  });

  it('filtra por las categorías seleccionadas y descarta el resto', () => {
    const bacheIncident = buildIncident({ id: 'bache', categoryId: 'cat-bache' });
    const alumbradoIncident = buildIncident({
      id: 'alumbrado',
      categoryId: 'cat-alumbrado',
      category: 'Alumbrado',
    });
    const limpiezaIncident = buildIncident({
      id: 'limpieza',
      categoryId: 'cat-limpieza',
      category: 'Limpieza',
    });

    const visibleIncidents = applyIncidentMapFilters(
      [bacheIncident, alumbradoIncident, limpiezaIncident],
      { age: 'all', categoryIds: ['cat-bache', 'cat-limpieza'] },
      FIXED_NOW,
    );

    expect(visibleIncidents.map((incident) => incident.id)).toEqual([
      'bache',
      'limpieza',
    ]);
  });

  it('combina filtro de antigüedad y de categoría (intersección)', () => {
    const recentBache = buildIncident({
      id: 'bache-reciente',
      categoryId: 'cat-bache',
      createdAt: isoDaysBeforeNow(2),
    });
    const oldBache = buildIncident({
      id: 'bache-antiguo',
      categoryId: 'cat-bache',
      createdAt: isoDaysBeforeNow(40),
    });
    const recentAlumbrado = buildIncident({
      id: 'alumbrado-reciente',
      categoryId: 'cat-alumbrado',
      createdAt: isoDaysBeforeNow(2),
    });

    const visibleIncidents = applyIncidentMapFilters(
      [recentBache, oldBache, recentAlumbrado],
      { age: '7d', categoryIds: ['cat-bache'] },
      FIXED_NOW,
    );

    expect(visibleIncidents.map((incident) => incident.id)).toEqual([
      'bache-reciente',
    ]);
  });

  it('aplica el límite inclusivo de 30 días dentro del flujo completo', () => {
    const boundaryIncident = buildIncident({
      id: 'limite',
      createdAt: isoDaysBeforeNow(30),
    });
    const justOutsideIncident = buildIncident({
      id: 'fuera',
      createdAt: isoDaysBeforeNow(30, 1),
    });

    const visibleIncidents = applyIncidentMapFilters(
      [boundaryIncident, justOutsideIncident],
      { age: '30d', categoryIds: [] },
      FIXED_NOW,
    );

    expect(visibleIncidents.map((incident) => incident.id)).toEqual(['limite']);
  });

  it('no modifica la lista de entrada', () => {
    const incidentList = [
      buildIncident({ id: 'a', status: 'closed' }),
      buildIncident({ id: 'b' }),
    ];
    const snapshotBefore = [...incidentList];

    applyIncidentMapFilters(incidentList, ALL_FILTERS, FIXED_NOW);

    expect(incidentList).toEqual(snapshotBefore);
  });
});
