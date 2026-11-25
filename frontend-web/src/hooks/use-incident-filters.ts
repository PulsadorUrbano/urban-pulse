import { useMemo, useState } from 'react';

import type { IncidentListFilters, IncidentPageFilters } from '../types/incident';
import {
  applyIncidentFilters,
  DEFAULT_INCIDENT_FILTERS,
  hasActiveFilters,
  isFilterResultPartial,
  parseSortOrder,
  parseStatusFilter,
  withDateRange,
} from '../utils/incident-filters';
import { useIncidentList } from './use-incident-list';

// Prioridad/categoría filtran en servidor. Estado, fecha y orden conservan la implementación local de #198.
export function useIncidentFilters(token: string | null) {
  const [filters, setFilters] = useState<IncidentListFilters>(DEFAULT_INCIDENT_FILTERS);
  const pageFilters: IncidentPageFilters = {
    priority: filters.priority === 'all' ? undefined : filters.priority,
    categoryId: filters.categoryId ?? undefined,
  };
  const list = useIncidentList(token, pageFilters);
  const visibleItems = useMemo(() => applyIncidentFilters(list.items, filters), [list.items, filters]);

  return {
    ...list,
    filters,
    visibleItems,
    isActive: hasActiveFilters(filters),
    isPartial: isFilterResultPartial(list.items, filters, list.hasMore),
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
