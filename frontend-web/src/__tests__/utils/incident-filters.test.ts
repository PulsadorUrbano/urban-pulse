import { describe, expect, it } from 'vitest';

import type { IncidentListFilters } from '../../types/incident';
import {
  DEFAULT_INCIDENT_FILTERS,
  hasActiveFilters,
  parseSortOrder,
  parseStatusFilter,
  toPageFilters,
  withDateRange,
} from '../../utils/incident-filters';

const filters = (patch: Partial<IncidentListFilters>): IncidentListFilters => ({ ...DEFAULT_INCIDENT_FILTERS, ...patch });

describe('filtros del listado de incidencias', () => {
  it('sin filtros no envía ningún criterio al servidor', () => {
    expect(toPageFilters(DEFAULT_INCIDENT_FILTERS)).toEqual({});
    expect(hasActiveFilters(DEFAULT_INCIDENT_FILTERS)).toBe(false);
  });

  it('traduce cada control a su parámetro de GET /incidents', () => {
    expect(toPageFilters(filters({ status: 'reported' }))).toEqual({ status: 'reported' });
    expect(toPageFilters(filters({ order: 'oldest' }))).toEqual({ order: 'oldest' });
    expect(toPageFilters(filters({ from: '2026-11-17', to: '2026-11-18' }))).toEqual({
      from: '2026-11-17', to: '2026-11-18',
    });
    expect(toPageFilters(filters({ priority: 'high', categoryId: 'cat-1' }))).toEqual({
      priority: 'high', categoryId: 'cat-1',
    });
  });

  it('combina todos los criterios en una sola consulta', () => {
    const current = filters({
      status: 'assigned', order: 'oldest', from: '2026-11-01', to: '2026-11-30', priority: 'medium', categoryId: 'cat-2',
    });
    expect(toPageFilters(current)).toEqual({
      status: 'assigned', order: 'oldest', from: '2026-11-01', to: '2026-11-30', priority: 'medium', categoryId: 'cat-2',
    });
    expect(hasActiveFilters(current)).toBe(true);
  });

  it('cualquier criterio, también el orden, activa los filtros', () => {
    expect(hasActiveFilters(filters({ order: 'oldest' }))).toBe(true);
    expect(hasActiveFilters(filters({ to: '2026-11-16' }))).toBe(true);
    expect(hasActiveFilters(filters({ categoryId: 'cat-1' }))).toBe(true);
  });

  it('guarda el rango ordenado para que los calendarios muestren lo que se envía', () => {
    expect(withDateRange(DEFAULT_INCIDENT_FILTERS, '2026-11-20', '2026-11-15')).toMatchObject({
      from: '2026-11-15', to: '2026-11-20',
    });
    expect(withDateRange(DEFAULT_INCIDENT_FILTERS, '2026-11-15', '2026-11-20')).toMatchObject({
      from: '2026-11-15', to: '2026-11-20',
    });
  });

  it('deja abierto el extremo vacío y conserva el resto de filtros', () => {
    const current = filters({ status: 'assigned', order: 'oldest', from: '2026-11-15', to: '2026-11-20' });
    expect(withDateRange(current, '', '2026-11-20')).toEqual({ ...current, from: null });
    expect(withDateRange(current, '2026-11-15', '')).toEqual({ ...current, to: null });
  });

  it('interpreta los valores de los controles y descarta los desconocidos', () => {
    expect(parseStatusFilter('assigned')).toBe('assigned');
    expect(parseStatusFilter('reopened')).toBe('reopened');
    expect(parseStatusFilter('all')).toBe('all');
    expect(parseStatusFilter('cerrada')).toBe('all');
    expect(parseSortOrder('oldest')).toBe('oldest');
    expect(parseSortOrder('cualquiera')).toBe('newest');
  });
});
