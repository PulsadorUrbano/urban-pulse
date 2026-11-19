import { describe, expect, it } from 'vitest';

import type { IncidentListFilters, IncidentSummary } from '../../types/incident';
import {
  applyIncidentFilters,
  DEFAULT_INCIDENT_FILTERS,
  hasActiveFilters,
  isFilterResultPartial,
  parseSortOrder,
  parseStatusFilter,
} from '../../utils/incident-filters';

// Fechas en hora local, como las que genera <input type="date">.
function incident(id: string, status: IncidentSummary['status'], localDateTime: string): IncidentSummary {
  return { id, title: `Incidencia ${id}`, status, createdAt: new Date(localDateTime).toISOString() };
}

// Mismo orden que devuelve el backend: de más reciente a más antigua.
const ITEMS: IncidentSummary[] = [
  incident('d', 'reported', '2026-11-18T09:00:00'),
  incident('c', 'validated', '2026-11-17T23:30:00'),
  incident('b', 'reported', '2026-11-17T00:10:00'),
  incident('a', 'assigned', '2026-11-15T12:00:00'),
];

const filters = (patch: Partial<IncidentListFilters>): IncidentListFilters => ({ ...DEFAULT_INCIDENT_FILTERS, ...patch });
const ids = (items: IncidentSummary[]) => items.map((item) => item.id);

describe('filtros del listado de incidencias', () => {
  it('sin filtros conserva todas las incidencias de más reciente a más antigua', () => {
    expect(ids(applyIncidentFilters(ITEMS, DEFAULT_INCIDENT_FILTERS))).toEqual(['d', 'c', 'b', 'a']);
    expect(hasActiveFilters(DEFAULT_INCIDENT_FILTERS)).toBe(false);
  });

  it('filtra por estado', () => {
    expect(ids(applyIncidentFilters(ITEMS, filters({ status: 'reported' })))).toEqual(['d', 'b']);
    expect(ids(applyIncidentFilters(ITEMS, filters({ status: 'rejected' })))).toEqual([]);
  });

  it('ordena de más antigua a más reciente', () => {
    expect(ids(applyIncidentFilters(ITEMS, filters({ order: 'oldest' })))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('desempata por id cuando dos incidencias tienen la misma fecha', () => {
    const tied = [incident('y', 'reported', '2026-11-17T10:00:00'), incident('x', 'reported', '2026-11-17T10:00:00')];
    expect(ids(applyIncidentFilters(tied, DEFAULT_INCIDENT_FILTERS))).toEqual(['x', 'y']);
  });

  it('filtra un único día completo, incluidos sus extremos', () => {
    expect(ids(applyIncidentFilters(ITEMS, filters({ from: '2026-11-17', to: '2026-11-17' })))).toEqual(['c', 'b']);
  });

  it('admite rangos abiertos por un lado', () => {
    expect(ids(applyIncidentFilters(ITEMS, filters({ from: '2026-11-17' })))).toEqual(['d', 'c', 'b']);
    expect(ids(applyIncidentFilters(ITEMS, filters({ to: '2026-11-16' })))).toEqual(['a']);
  });

  it('intercambia desde y hasta si llegan invertidos', () => {
    expect(ids(applyIncidentFilters(ITEMS, filters({ from: '2026-11-18', to: '2026-11-17' })))).toEqual(['d', 'c', 'b']);
  });

  it('combina estado, rango y orden', () => {
    const result = applyIncidentFilters(ITEMS, filters({ status: 'reported', from: '2026-11-17', order: 'oldest' }));
    expect(ids(result)).toEqual(['b', 'd']);
  });

  it('no modifica la lista recibida', () => {
    const copy = [...ITEMS];
    applyIncidentFilters(ITEMS, filters({ order: 'oldest' }));
    expect(ITEMS).toEqual(copy);
  });

  it('interpreta los valores de los controles y descarta los desconocidos', () => {
    expect(parseStatusFilter('assigned')).toBe('assigned');
    expect(parseStatusFilter('all')).toBe('all');
    expect(parseStatusFilter('cerrada')).toBe('all');
    expect(parseSortOrder('oldest')).toBe('oldest');
    expect(parseSortOrder('cualquiera')).toBe('newest');
  });
});

describe('resultado parcial al filtrar sobre páginas cargadas', () => {
  it('es completo si no quedan páginas o no hay filtros', () => {
    expect(isFilterResultPartial(ITEMS, filters({ status: 'reported' }), false)).toBe(false);
    expect(isFilterResultPartial(ITEMS, DEFAULT_INCIDENT_FILTERS, true)).toBe(false);
  });

  it('es parcial al filtrar por estado u ordenar al revés con páginas pendientes', () => {
    expect(isFilterResultPartial(ITEMS, filters({ status: 'reported' }), true)).toBe(true);
    expect(isFilterResultPartial(ITEMS, filters({ order: 'oldest' }), true)).toBe(true);
  });

  it('es completo si ya se cargó una incidencia anterior al inicio del rango', () => {
    expect(isFilterResultPartial(ITEMS, filters({ status: 'reported', from: '2026-11-17' }), true)).toBe(false);
    expect(isFilterResultPartial(ITEMS, filters({ from: '2026-11-17', order: 'oldest' }), true)).toBe(false);
  });

  it('es parcial si el rango empieza antes de la incidencia más antigua cargada', () => {
    expect(isFilterResultPartial(ITEMS, filters({ from: '2026-11-10' }), true)).toBe(true);
    expect(isFilterResultPartial([], filters({ from: '2026-11-10' }), true)).toBe(true);
  });
});
