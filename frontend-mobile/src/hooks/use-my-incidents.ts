import { useCallback, useEffect, useState } from 'react';

import { BACKEND_FALLBACK_NOTICE } from '@/constants/messages';
import { fetchMyIncidents } from '@/services/incident.service';
import type { IncidentSummary } from '@/types/incident';

export interface UseMyIncidentsResult {
  incidents: IncidentSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  backendFallbackNotice: string | null;
  reload: () => void;
}

const NO_INCIDENTS: IncidentSummary[] = [];

// Carga las incidencias del ciudadano de la sesión activa. Si `civicId` es
// `null` (sesión aún no resuelta) no dispara ninguna petición y deja el
// listado vacío sin quedarse colgado en estado de carga.
export function useMyIncidents(civicId: string | null): UseMyIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentSummary[]>(NO_INCIDENTS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Clave de la última petición que terminó (con éxito o error).
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);

  // Identifica la petición actual (ciudadano + recarga). `isLoading` se deriva
  // de ella: mientras la última petición terminada no sea la actual, se está
  // cargando. Así, al pasar `civicId` de `null` a un valor, `isLoading` es
  // `true` desde el mismo render, sin hacer setState síncrono en el efecto.
  const requestKey = civicId === null ? null : `${civicId}:${reloadToken}`;
  const isLoading = requestKey !== null && settledRequestKey !== requestKey;

  useEffect(() => {
    // Sesión aún no resuelta: no hay ciudadano con el que pedir incidencias.
    if (civicId === null) return;

    // Bandera propia de esta ejecución: si cambia `civicId`, se recarga o se
    // desmonta, el cleanup la apaga y la respuesta antigua no pisa a la nueva.
    let isActive = true;
    const currentRequestKey = `${civicId}:${reloadToken}`;

    fetchMyIncidents(civicId)
      .then((result) => {
        if (!isActive) return;
        setIncidents(result.incidents);
        setErrorMessage(null);
        setBackendFallbackNotice(result.source === 'mock' ? BACKEND_FALLBACK_NOTICE : null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        // Se conserva el listado previo: un error de recarga no debe vaciar
        // lo que ya se había mostrado correctamente.
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar tus incidencias. Inténtalo de nuevo.',
        );
      })
      .finally(() => {
        if (isActive) {
          setSettledRequestKey(currentRequestKey);
        }
      });

    return () => {
      isActive = false;
    };
  }, [civicId, reloadToken]);

  // Se invoca desde eventos de la UI: limpia el error y fuerza una nueva carga
  // incrementando el token (que cambia `requestKey` y por tanto `isLoading`).
  const reload = useCallback(() => {
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return {
    incidents: civicId === null ? NO_INCIDENTS : incidents,
    isLoading,
    errorMessage,
    backendFallbackNotice,
    reload,
  };
}
