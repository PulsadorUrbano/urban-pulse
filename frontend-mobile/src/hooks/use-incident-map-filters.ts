import { useCallback, useMemo, useState } from 'react';

import type { IncidentAgeFilter, IncidentMapFilters, MapIncident } from '@/types/incident-map';
import { applyIncidentMapFilters } from '@/utils/map/incident-map-filters';

export interface UseIncidentMapFiltersResult {
  age: IncidentAgeFilter;
  categoryIds: string[];
  setAge: (age: IncidentAgeFilter) => void;
  toggleCategory: (categoryId: string) => void;
  clearCategories: () => void;
  filteredIncidents: MapIncident[];
}

// Gestiona los filtros del mapa (antigüedad y categorías) y devuelve las
// incidencias filtradas. Si no se pasa `now`, se fija una vez al montar para
// que la memoización no se invalide en cada render.
export function useIncidentMapFilters(
  incidents: MapIncident[],
  now?: Date,
): UseIncidentMapFiltersResult {
  const [filters, setFilters] = useState<IncidentMapFilters>({ age: 'all', categoryIds: [] });
  const [mountedAt] = useState(() => new Date());
  const referenceDate = now ?? mountedAt;

  const setAge = useCallback((age: IncidentAgeFilter) => {
    setFilters((previous) => ({ ...previous, age }));
  }, []);

  // Añade la categoría si no estaba seleccionada y la quita si lo estaba.
  const toggleCategory = useCallback((categoryId: string) => {
    setFilters((previous) => ({
      ...previous,
      categoryIds: previous.categoryIds.includes(categoryId)
        ? previous.categoryIds.filter((id) => id !== categoryId)
        : [...previous.categoryIds, categoryId],
    }));
  }, []);

  const clearCategories = useCallback(() => {
    setFilters((previous) => ({ ...previous, categoryIds: [] }));
  }, []);

  const filteredIncidents = useMemo(
    () => applyIncidentMapFilters(incidents, filters, referenceDate),
    [incidents, filters, referenceDate],
  );

  return {
    age: filters.age,
    categoryIds: filters.categoryIds,
    setAge,
    toggleCategory,
    clearCategories,
    filteredIncidents,
  };
}
