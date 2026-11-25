import { STATUS_FILTER_OPTIONS } from '../constants/incident-labels';
import type {
  IncidentListFilters,
  IncidentPageFilters,
  IncidentSortOrder,
  IncidentStatusFilter,
} from '../types/incident';

export const DEFAULT_INCIDENT_FILTERS: IncidentListFilters = {
  status: 'all',
  order: 'newest',
  from: null,
  to: null,
  priority: 'all',
  categoryId: null,
};

export function parseStatusFilter(value: string): IncidentStatusFilter {
  return STATUS_FILTER_OPTIONS.find((status) => status === value) ?? 'all';
}

export function parseSortOrder(value: string): IncidentSortOrder {
  return value === 'oldest' ? 'oldest' : 'newest';
}

export function hasActiveFilters(filters: IncidentListFilters): boolean {
  return filters.status !== 'all' || filters.order !== 'newest' || filters.from !== null || filters.to !== null
    || filters.priority !== 'all' || filters.categoryId !== null;
}

// Traduce los controles a los parámetros de GET /incidents: los valores por defecto no se envían.
export function toPageFilters(filters: IncidentListFilters): IncidentPageFilters {
  return {
    ...(filters.status === 'all' ? {} : { status: filters.status }),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.order === 'oldest' ? { order: filters.order } : {}),
    ...(filters.priority === 'all' ? {} : { priority: filters.priority }),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };
}

// Guarda el rango ordenado: si `from` queda posterior a `to` se intercambian, para que los calendarios muestren
// el mismo rango que se aplica. Un valor vacío del <input type="date"> deja ese extremo abierto.
export function withDateRange(filters: IncidentListFilters, from: string, to: string): IncidentListFilters {
  const [first, last] = from && to && from > to ? [to, from] : [from, to];
  return { ...filters, from: first || null, to: last || null };
}
