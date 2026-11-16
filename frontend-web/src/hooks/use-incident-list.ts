import { useEffect, useState } from 'react';

import { fetchIncidentPage } from '../services/incident.service';
import type { IncidentSummary } from '../types/incident';

interface PageRequest {
  cursor?: string;
}

interface ListResult {
  request: PageRequest;
  items: IncidentSummary[];
  nextCursor: string | null;
  error: string | null;
}

export function useIncidentList(token: string | null) {
  const [request, setRequest] = useState<PageRequest>({});
  const [result, setResult] = useState<ListResult | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchIncidentPage(token, request.cursor)
      .then(({ items, nextCursor }) => {
        if (!active) return;
        setResult((previous) => ({
          request,
          items: request.cursor ? [...(previous?.items ?? []), ...items] : items,
          nextCursor,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult((previous) => ({
          request,
          items: previous?.items ?? [],
          nextCursor: previous?.nextCursor ?? null,
          error: error instanceof Error ? error.message : 'No se pudo cargar el listado de incidencias.',
        }));
      });
    return () => { active = false; };
  }, [request, token]);

  const isCurrent = result?.request === request;
  const loading = Boolean(token && !isCurrent);
  const error = isCurrent ? result?.error ?? null : null;

  const loadMore = () => {
    if (loading || !result?.nextCursor || error) return;
    setRequest({ cursor: result.nextCursor });
  };

  return {
    items: result?.items ?? [],
    hasMore: Boolean(result?.nextCursor),
    loading,
    error,
    loadMore,
    retry: () => setRequest({ ...request }),
  };
}
