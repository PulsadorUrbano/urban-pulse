import { useEffect, useMemo, useState } from 'react';

import { fetchIncidentCategories } from '../services/incident.service';
import type { IncidentCategory } from '../types/incident';

interface CategoryResult {
  request: object;
  items: IncidentCategory[];
  error: string | null;
}

export function useIncidentCategories(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ enabled, attempt }), [enabled, attempt]);
  const [result, setResult] = useState<CategoryResult | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchIncidentCategories()
      .then((items) => {
        if (active) setResult({ request, items, error: null });
      })
      .catch((error: unknown) => {
        if (active) setResult({
          request,
          items: [],
          error: error instanceof Error ? error.message : 'No se pudo cargar el catálogo de categorías.',
        });
      });
    return () => { active = false; };
  }, [enabled, request]);

  const current = enabled && result?.request === request ? result : null;
  const loading = enabled && !current;
  return {
    items: current?.items ?? [],
    loading,
    error: current?.error ?? null,
    retry: () => {
      if (enabled && !loading) setAttempt((previous) => previous + 1);
    },
  };
}
