/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useIncidentMapFilters } from '@/hooks/use-incident-map-filters';
import type { MapIncident } from '@/types/incident-map';

// Fecha de referencia fija: las ventanas 7d/30d/90d se calculan desde aquí.
const REFERENCE_NOW = new Date('2026-11-26T12:00:00.000Z');

function buildMapIncident(overrides: Partial<MapIncident> & Pick<MapIncident, 'id'>): MapIncident {
  return {
    title: `Incidencia ${overrides.id}`,
    status: 'reported',
    category: 'Vía pública',
    categoryId: 'cat-road',
    latitude: 40.4168,
    longitude: -3.7038,
    createdAt: '2026-11-20T10:00:00.000Z',
    images: [],
    ...overrides,
  };
}

// Dentro de 7 días (límite 2026-11-19T12:00Z).
const recentRoadIncident = buildMapIncident({ id: 'recent-road', createdAt: '2026-11-20T10:00:00.000Z' });
// Dentro de 30 días pero fuera de 7 (límite 2026-10-27T12:00Z).
const monthRoadIncident = buildMapIncident({ id: 'month-road', createdAt: '2026-10-30T10:00:00.000Z' });
// Dentro de 90 días pero fuera de 30 (límite 2026-08-28T12:00Z).
const quarterRoadIncident = buildMapIncident({ id: 'quarter-road', createdAt: '2026-09-15T10:00:00.000Z' });
// Fuera de cualquier ventana salvo 'all'.
const oldRoadIncident = buildMapIncident({ id: 'old-road', createdAt: '2026-01-10T10:00:00.000Z' });
// Sin categoría: solo debe aparecer sin selección de categorías.
const uncategorizedIncident = buildMapIncident({
  id: 'uncategorized',
  category: null,
  categoryId: null,
  createdAt: '2026-11-21T10:00:00.000Z',
});
const recentLightIncident = buildMapIncident({
  id: 'recent-light',
  category: 'Alumbrado',
  categoryId: 'cat-light',
  createdAt: '2026-11-22T10:00:00.000Z',
});
// Rechazada: se considera visible (no está resuelta ni cerrada).
const recentRejectedIncident = buildMapIncident({
  id: 'recent-rejected',
  status: 'rejected',
  createdAt: '2026-11-24T10:00:00.000Z',
});
// Resueltas y cerradas: nunca deben aparecer en el mapa, aunque cumplan el resto de filtros.
const resolvedIncident = buildMapIncident({
  id: 'resolved-road',
  status: 'resolved',
  createdAt: '2026-11-20T10:00:00.000Z',
});
const closedIncident = buildMapIncident({
  id: 'closed-light',
  status: 'closed',
  category: 'Alumbrado',
  categoryId: 'cat-light',
  createdAt: '2026-11-22T10:00:00.000Z',
});

const incidentsFixture: MapIncident[] = [
  recentRoadIncident,
  monthRoadIncident,
  quarterRoadIncident,
  oldRoadIncident,
  uncategorizedIncident,
  recentLightIncident,
  recentRejectedIncident,
  resolvedIncident,
  closedIncident,
];

const unresolvedIncidentIds = [
  'recent-road',
  'month-road',
  'quarter-road',
  'old-road',
  'uncategorized',
  'recent-light',
  'recent-rejected',
];

type IncidentsProps = { incidents: MapIncident[] };

function idsOf(incidentList: MapIncident[]): string[] {
  return incidentList.map((incident) => incident.id);
}

describe('useIncidentMapFilters', () => {
  it('por defecto la antigüedad es "all", no hay categorías y se muestran todas las no resueltas', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    expect(result.current.age).toBe('all');
    expect(result.current.categoryIds).toEqual([]);
    expect(idsOf(result.current.filteredIncidents)).toEqual(unresolvedIncidentIds);
  });

  it('setAge("7d") deja solo las incidencias de los últimos 7 días', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.setAge('7d');
    });

    expect(result.current.age).toBe('7d');
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'uncategorized',
      'recent-light',
      'recent-rejected',
    ]);
  });

  it('setAge("30d") y setAge("90d") amplían la ventana de antigüedad', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.setAge('30d');
    });
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'month-road',
      'uncategorized',
      'recent-light',
      'recent-rejected',
    ]);

    await act(() => {
      result.current.setAge('90d');
    });
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'month-road',
      'quarter-road',
      'uncategorized',
      'recent-light',
      'recent-rejected',
    ]);
  });

  it('volver a setAge("all") restaura todas las no resueltas', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.setAge('7d');
    });
    await act(() => {
      result.current.setAge('all');
    });

    expect(result.current.age).toBe('all');
    expect(idsOf(result.current.filteredIncidents)).toEqual(unresolvedIncidentIds);
  });

  it('toggleCategory añade la categoría y filtra solo sus incidencias', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.toggleCategory('cat-road');
    });

    expect(result.current.categoryIds).toEqual(['cat-road']);
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'month-road',
      'quarter-road',
      'old-road',
      'recent-rejected',
    ]);
  });

  it('toggleCategory sobre una categoría ya seleccionada la quita', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.toggleCategory('cat-road');
    });
    await act(() => {
      result.current.toggleCategory('cat-road');
    });

    expect(result.current.categoryIds).toEqual([]);
    expect(idsOf(result.current.filteredIncidents)).toEqual(unresolvedIncidentIds);
  });

  it('varias categorías seleccionadas muestran la unión de sus incidencias', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.toggleCategory('cat-road');
    });
    await act(() => {
      result.current.toggleCategory('cat-light');
    });

    expect(result.current.categoryIds).toEqual(['cat-road', 'cat-light']);
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'month-road',
      'quarter-road',
      'old-road',
      'recent-light',
      'recent-rejected',
    ]);
  });

  it('clearCategories vacía la selección y conserva la antigüedad elegida', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.setAge('30d');
    });
    await act(() => {
      result.current.toggleCategory('cat-road');
      result.current.toggleCategory('cat-light');
    });
    await act(() => {
      result.current.clearCategories();
    });

    expect(result.current.categoryIds).toEqual([]);
    expect(result.current.age).toBe('30d');
    expect(idsOf(result.current.filteredIncidents)).toEqual([
      'recent-road',
      'month-road',
      'uncategorized',
      'recent-light',
      'recent-rejected',
    ]);
  });

  it('con una categoría seleccionada excluye las incidencias sin categoryId', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.toggleCategory('cat-light');
    });

    expect(idsOf(result.current.filteredIncidents)).not.toContain('uncategorized');
    expect(idsOf(result.current.filteredIncidents)).toEqual(['recent-light']);
  });

  it('resolved y closed quedan fuera aunque cumplan antigüedad y categoría', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, REFERENCE_NOW));

    await act(() => {
      result.current.setAge('7d');
      result.current.toggleCategory('cat-road');
      result.current.toggleCategory('cat-light');
    });

    const filteredIds = idsOf(result.current.filteredIncidents);
    expect(filteredIds).not.toContain('resolved-road');
    expect(filteredIds).not.toContain('closed-light');
    expect(filteredIds).toEqual(['recent-road', 'recent-light', 'recent-rejected']);
  });

  it('una lista compuesta solo por resueltas o cerradas devuelve vacío', async () => {
    const { result } = await renderHook(() =>
      useIncidentMapFilters([resolvedIncident, closedIncident], REFERENCE_NOW),
    );

    expect(result.current.filteredIncidents).toEqual([]);
  });

  it('una lista vacía devuelve filteredIncidents vacío', async () => {
    const { result } = await renderHook(() => useIncidentMapFilters([], REFERENCE_NOW));

    expect(result.current.filteredIncidents).toEqual([]);
  });

  it('filteredIncidents conserva la misma referencia entre renders sin cambios', async () => {
    const { result, rerender } = await renderHook(
      ({ incidents }: IncidentsProps) => useIncidentMapFilters(incidents, REFERENCE_NOW),
      { initialProps: { incidents: incidentsFixture } },
    );

    const firstFilteredIncidents = result.current.filteredIncidents;

    await act(() => {
      rerender({ incidents: incidentsFixture });
    });

    expect(result.current.filteredIncidents).toBe(firstFilteredIncidents);
  });

  it('filteredIncidents se recalcula al cambiar la lista de entrada', async () => {
    const { result, rerender } = await renderHook(
      ({ incidents }: IncidentsProps) => useIncidentMapFilters(incidents, REFERENCE_NOW),
      { initialProps: { incidents: incidentsFixture } },
    );

    const firstFilteredIncidents = result.current.filteredIncidents;

    await act(() => {
      rerender({ incidents: [recentRoadIncident] });
    });

    expect(result.current.filteredIncidents).not.toBe(firstFilteredIncidents);
    expect(idsOf(result.current.filteredIncidents)).toEqual(['recent-road']);
  });

  it('respeta el parámetro now explícito al calcular la antigüedad', async () => {
    // Con now = 2026-12-10, la ventana de 7 días empieza el 2026-12-03: ninguna incidencia de la fixture entra.
    const laterNow = new Date('2026-12-10T12:00:00.000Z');
    const { result } = await renderHook(() => useIncidentMapFilters(incidentsFixture, laterNow));

    await act(() => {
      result.current.setAge('7d');
    });

    expect(result.current.filteredIncidents).toEqual([]);
  });

  it('sin now fija la referencia al montar y no la recalcula en renders posteriores', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2026-11-26T12:00:00.000Z'));

      const { result, rerender } = await renderHook(() => useIncidentMapFilters(incidentsFixture));

      await act(() => {
        result.current.setAge('7d');
      });
      expect(idsOf(result.current.filteredIncidents)).toContain('recent-road');

      // Se avanza el reloj 60 días: si la referencia se recalculara, la incidencia de 7 días quedaría fuera.
      jest.setSystemTime(new Date('2027-01-25T12:00:00.000Z'));
      await act(() => {
        rerender({});
      });

      expect(idsOf(result.current.filteredIncidents)).toContain('recent-road');
    } finally {
      jest.useRealTimers();
    }
  });
});
