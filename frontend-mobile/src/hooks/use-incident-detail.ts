import { useCallback, useEffect, useState } from 'react';

import { BACKEND_FALLBACK_NOTICE } from '@/constants/messages';
import {
  IncidentNotFoundError,
  QUERY_MISSING_TOKEN_MESSAGE,
  fetchIncidentById,
} from '@/services/incident.service';
import type { IncidentDetail } from '@/types/incident';
import type { AuthToken } from '@/types/token';

export interface UseIncidentDetailResult {
  incident: IncidentDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  isNotFound: boolean;
  backendFallbackNotice: string | null;
  reload: () => void;
}

// Carga el detalle de una incidencia por `id` al montar (y cuando `id` cambie o
// se llame a `reload`), siguiendo el mismo patrón que `useCategories`/
// `useMyIncidents` (bandera `isActive` por ejecución, `reloadToken`). Sin `token`
// no llama al servicio y expone el mensaje de sesión como error.
export function useIncidentDetail(id: string, token: AuthToken | null): UseIncidentDetailResult {
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Clave de la última petición que terminó (con éxito o error).
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);

  // Se dependen los campos primitivos del token, no el objeto.
  const accessToken = token?.accessToken ?? null;
  const tokenSource = token?.source ?? null;
  const hasMissingToken = token === null;

  // `isLoading` se deriva de la petición actual (id + token + recarga): mientras
  // la última terminada no sea la actual se está cargando. Sin token no hay
  // petición, por lo que nunca queda cargando.
  const requestKey = hasMissingToken ? null : `${id}:${tokenSource}:${accessToken}:${reloadToken}`;
  const isLoading = requestKey !== null && settledRequestKey !== requestKey;

  // La carga se resuelve en los callbacks de la promesa (asíncronos), de modo
  // que el efecto no ejecuta setState de forma síncrona.
  useEffect(() => {
    // Bandera propia de esta ejecución: si cambia `id`, se recarga o se desmonta,
    // el cleanup la apaga y la respuesta antigua no pisa a la nueva.
    let isActive = true;

    // Sin token no se llama al servicio; el estado de sesión se deriva en el
    // retorno. El cleanup anterior ya apagó su `isActive`, así que una respuesta
    // antigua no restaura datos ni pisa el error de sesión.
    if (accessToken === null || tokenSource === null) return;
    const currentRequestKey = `${id}:${tokenSource}:${accessToken}:${reloadToken}`;

    fetchIncidentById(id, { accessToken, source: tokenSource })
      .then((result) => {
        if (!isActive) return;
        setIncident(result.incident);
        setIsNotFound(false);
        setErrorMessage(null);
        setBackendFallbackNotice(result.source === 'mock' ? BACKEND_FALLBACK_NOTICE : null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setIncident(null);
        if (error instanceof IncidentNotFoundError) {
          // Se evita mostrar dos mensajes de error a la vez: el estado "no
          // encontrado" ya es explícito y no necesita `errorMessage`.
          setIsNotFound(true);
          setErrorMessage(null);
        } else {
          setIsNotFound(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.',
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setSettledRequestKey(currentRequestKey);
        }
      });

    return () => {
      isActive = false;
    };
  }, [id, accessToken, tokenSource, reloadToken]);

  // El reseteo de error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsNotFound(false);
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  if (hasMissingToken) {
    return {
      incident: null,
      isLoading: false,
      errorMessage: QUERY_MISSING_TOKEN_MESSAGE,
      isNotFound: false,
      backendFallbackNotice: null,
      reload,
    };
  }

  return { incident, isLoading, errorMessage, isNotFound, backendFallbackNotice, reload };
}
