import { STATUS_FILTER_OPTIONS } from '../constants/incident-labels';
import type {
  IncidentListFilters,
  IncidentSortOrder,
  IncidentStatusFilter,
  IncidentSummary,
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
  return hasActiveLocalFilters(filters) || filters.priority !== 'all' || filters.categoryId !== null;
}

function hasActiveLocalFilters(filters: IncidentListFilters): boolean {
  return filters.status !== 'all' || filters.order !== 'newest' || filters.from !== null || filters.to !== null;
}

// Guarda el rango ordenado: si `from` queda posterior a `to` se intercambian, para que los calendarios muestren
// el mismo rango que se aplica. Un valor vacío del <input type="date"> deja ese extremo abierto.
export function withDateRange(filters: IncidentListFilters, from: string, to: string): IncidentListFilters {
  const [first, last] = from && to && from > to ? [to, from] : [from, to];
  return { ...filters, from: first || null, to: last || null };
}

// Límites del rango en milisegundos. También ordena los extremos por si los filtros no pasaron por withDateRange.
function rangeBounds({ from, to }: IncidentListFilters): { start: number; end: number } {
  const [first, last] = from && to && from > to ? [to, from] : [from, to];
  return {
    start: first ? new Date(`${first}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY,
    end: last ? new Date(`${last}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY,
  };
}

function timeOf(incident: IncidentSummary): number {
  return new Date(incident.createdAt).getTime();
}

// Filtra por estado y rango de días y ordena por fecha de creación; a igual fecha, por id para que el orden sea estable.
export function applyIncidentFilters(
  items: readonly IncidentSummary[],
  filters: IncidentListFilters,
): IncidentSummary[] {
  const { start, end } = rangeBounds(filters);
  const direction = filters.order === 'newest' ? -1 : 1;
  return items
    .filter((incident) => filters.status === 'all' || incident.status === filters.status)
    .filter((incident) => {
      const time = timeOf(incident);
      return time >= start && time <= end;
    })
    .sort((a, b) => direction * (timeOf(a) - timeOf(b)) || a.id.localeCompare(b.id));
}

// Indica si el resultado puede estar incompleto porque quedan páginas sin cargar. El backend devuelve las
// incidencias de más reciente a más antigua, así que si ya se cargó alguna anterior al inicio del rango,
// todas las del rango están en memoria y el resultado es completo.
export function isFilterResultPartial(
  items: readonly IncidentSummary[],
  filters: IncidentListFilters,
  hasMore: boolean,
): boolean {
  if (!hasMore || !hasActiveLocalFilters(filters)) return false;
  const { start } = rangeBounds(filters);
  const rangeLoaded = Number.isFinite(start) && items.some((incident) => timeOf(incident) < start);
  return !rangeLoaded;
}
