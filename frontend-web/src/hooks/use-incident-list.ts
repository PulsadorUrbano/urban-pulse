import { useEffect, useMemo, useState } from 'react';

import { fetchIncidentPage } from '../services/incident.service';
import type { IncidentPageFilters, IncidentSummary } from '../types/incident';

interface ListQuery {
  token: string | null;
  filters: IncidentPageFilters;
}

interface PageRequest {
  query: ListQuery;
  cursor?: string;
}

interface ListResult {
  request: PageRequest;
  items: IncidentSummary[];
  nextCursor: string | null;
  error: string | null;
}

export function useIncidentList(token: string | null, filters: IncidentPageFilters = {}) {
  const { priority, categoryId } = filters;
  // La identidad cambia solo al cambiar sesión o criterios, no al renderizar ni al cargar otra página.
  const query = useMemo(() => ({ token, filters: { priority, categoryId } }), [token, priority, categoryId]);
  const [requestedPage, setRequestedPage] = useState<PageRequest | null>(null);
  const [result, setResult] = useState<ListResult | null>(null);
  const request = useMemo(
    () => requestedPage?.query === query ? requestedPage : { query },
    [requestedPage, query],
  );

  useEffect(() => {
    if (!query.token) return;
    let active = true;
    fetchIncidentPage(query.token, request.cursor, query.filters)
      .then(({ items, nextCursor }) => {
        if (!active) return;
        setResult((previous) => ({
          request,
          items: request.cursor && previous?.request.query === query
            ? [...previous.items, ...items] : items,
          nextCursor,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult((previous) => ({
          request,
          items: request.cursor && previous?.request.query === query ? previous.items : [],
          nextCursor: request.cursor && previous?.request.query === query ? previous.nextCursor : null,
          error: error instanceof Error ? error.message : 'No se pudo cargar el listado de incidencias.',
        }));
      });
    return () => { active = false; };
  }, [request, query]);

  // Oculta inmediatamente los datos de otra búsqueda, incluso antes de ejecutar el nuevo efecto.
  const currentResult = result?.request.query === query && token
    && (request.cursor || result.request === request) ? result : null;
  const loading = Boolean(token && currentResult?.request !== request);
  const error = currentResult?.request === request ? currentResult.error : null;

  const loadMore = () => {
    if (!token || loading || !currentResult?.nextCursor || error) return;
    setRequestedPage({ query, cursor: currentResult.nextCursor });
  };

  return {
    items: currentResult?.items ?? [],
    hasMore: Boolean(currentResult?.nextCursor),
    loading,
    error,
    loadMore,
    reload: () => {
      if (token) setRequestedPage({ query });
    },
    retry: () => {
      if (!token || loading) return;
      setRequestedPage({ ...request });
    },
  };
}
