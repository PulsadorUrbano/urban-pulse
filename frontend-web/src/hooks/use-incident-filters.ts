import { useState } from 'react';

import type { IncidentListFilters } from '../types/incident';
import {
  DEFAULT_INCIDENT_FILTERS,
  hasActiveFilters,
  parseSortOrder,
  parseStatusFilter,
  toPageFilters,
  withDateRange,
} from '../utils/incident-filters';
import { useIncidentList } from './use-incident-list';

// Todos los filtros se envían a GET /incidents (#213): cambiar uno vuelve a pedir la primera página
// y las páginas siguientes llegan ya filtradas y ordenadas por el backend.
export function useIncidentFilters(token: string | null) {
  const [filters, setFilters] = useState<IncidentListFilters>(DEFAULT_INCIDENT_FILTERS);
  const list = useIncidentList(token, toPageFilters(filters));

  return {
    ...list,
    filters,
    isActive: hasActiveFilters(filters),
    setPriority: (value: string) => setFilters((current) => ({
      ...current,
      priority: value === 'low' || value === 'medium' || value === 'high' ? value : 'all',
    })),
    setCategory: (value: string) => setFilters((current) => ({ ...current, categoryId: value || null })),
    setStatus: (value: string) => setFilters((current) => ({ ...current, status: parseStatusFilter(value) })),
    setOrder: (value: string) => setFilters((current) => ({ ...current, order: parseSortOrder(value) })),
    setFrom: (value: string) => setFilters((current) => withDateRange(current, value, current.to ?? '')),
    setTo: (value: string) => setFilters((current) => withDateRange(current, current.from ?? '', value)),
    reset: () => {
      setFilters(DEFAULT_INCIDENT_FILTERS);
      list.reload();
    },
  };
}
