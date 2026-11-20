import { useCallback, useEffect, useState } from 'react';

import { BACKEND_FALLBACK_NOTICE } from '@/constants/messages';
import { QUERY_MISSING_TOKEN_MESSAGE, fetchMyIncidents } from '@/services/incident.service';
import type { IncidentSummary } from '@/types/incident';
import type { AuthToken } from '@/types/token';

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
// listado vacío sin quedarse colgado en estado de carga. Si hay ciudadano pero
// no hay `token` (sesión cerrada o caducada) tampoco llama al servicio y expone
// el mensaje de sesión como error.
export function useMyIncidents(
  civicId: string | null,
  token: AuthToken | null,
): UseMyIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentSummary[]>(NO_INCIDENTS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Clave de la última petición que terminó (con éxito o error).
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);

  // Se dependen los campos primitivos del token, no el objeto, para no relanzar
  // la carga si cambia la identidad del objeto pero no su contenido.
  const accessToken = token?.accessToken ?? null;
  const tokenSource = token?.source ?? null;
  const hasMissingToken = civicId !== null && token === null;

  // Identifica la petición actual (ciudadano + token + recarga). `isLoading` se deriva
  // de ella: mientras la última petición terminada no sea la actual, se está
  // cargando. Así, al pasar `civicId` de `null` a un valor, `isLoading` es
  // `true` desde el mismo render, sin hacer setState síncrono en el efecto.
  const requestKey =
    civicId === null || token === null
      ? null
      : `${civicId}:${tokenSource}:${accessToken}:${reloadToken}`;
  const isLoading = requestKey !== null && settledRequestKey !== requestKey;

  useEffect(() => {
    // Sesión aún no resuelta: no hay ciudadano con el que pedir incidencias.
    if (civicId === null) return;
    // Sin token no se llama al servicio; el error de sesión se deriva en el
    // retorno. El cleanup de la ejecución anterior ya apagó su `isActive`, así
    // que una respuesta antigua no restaura datos ni pisa ese error.
    if (accessToken === null || tokenSource === null) return;

    // Bandera propia de esta ejecución: si cambia `civicId`, se recarga o se
    // desmonta, el cleanup la apaga y la respuesta antigua no pisa a la nueva.
    let isActive = true;
    const currentRequestKey = `${civicId}:${tokenSource}:${accessToken}:${reloadToken}`;

    fetchMyIncidents(civicId, { accessToken, source: tokenSource })
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
  }, [civicId, accessToken, tokenSource, reloadToken]);

  // Se invoca desde eventos de la UI: limpia el error y fuerza una nueva carga
  // incrementando el token (que cambia `requestKey` y por tanto `isLoading`).
  const reload = useCallback(() => {
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return {
    incidents: civicId === null || hasMissingToken ? NO_INCIDENTS : incidents,
    isLoading,
    errorMessage: hasMissingToken ? QUERY_MISSING_TOKEN_MESSAGE : errorMessage,
    backendFallbackNotice: hasMissingToken ? null : backendFallbackNotice,
    reload,
  };
}
