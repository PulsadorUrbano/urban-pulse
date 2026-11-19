import { useMemo, useState } from 'react';

import type { IncidentListFilters, IncidentSummary } from '../types/incident';
import {
  applyIncidentFilters,
  DEFAULT_INCIDENT_FILTERS,
  hasActiveFilters,
  isFilterResultPartial,
  parseSortOrder,
  parseStatusFilter,
} from '../utils/incident-filters';

// Filtros del listado aplicados sobre las páginas ya cargadas. Cuando GET /incidents acepte filtros (#44),
// este hook pasará a enviarlos al backend y a reiniciar la paginación.
export function useIncidentFilters(items: readonly IncidentSummary[], hasMore: boolean) {
  const [filters, setFilters] = useState<IncidentListFilters>(DEFAULT_INCIDENT_FILTERS);
  const visibleItems = useMemo(() => applyIncidentFilters(items, filters), [items, filters]);

  return {
    filters,
    visibleItems,
    isActive: hasActiveFilters(filters),
    isPartial: isFilterResultPartial(items, filters, hasMore),
    setStatus: (value: string) => setFilters((current) => ({ ...current, status: parseStatusFilter(value) })),
    setOrder: (value: string) => setFilters((current) => ({ ...current, order: parseSortOrder(value) })),
    setFrom: (value: string) => setFilters((current) => ({ ...current, from: value || null })),
    setTo: (value: string) => setFilters((current) => ({ ...current, to: value || null })),
    reset: () => setFilters(DEFAULT_INCIDENT_FILTERS),
  };
}
