import { useCallback, useEffect, useState } from 'react';

import { fetchMyIncidents } from '@/services/incident.service';
import type { IncidentSummary } from '@/types/incident';

export interface UseMyIncidentsResult {
  incidents: IncidentSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  backendFallbackNotice: string | null;
  reload: () => void;
}

const BACKEND_FALLBACK_NOTICE =
  'No se ha podido conectar al backend, mostrando los datos del mock.';

// Carga las incidencias del ciudadano de la sesión activa. Si `civicId` es
// `null` (sesión aún no resuelta) no dispara ninguna petición y deja el
// listado vacío sin quedarse colgado en estado de carga. Si `civicId` ya está
// pero falta `accessToken` (sesión sin token válido), informa del problema en
// vez de intentar la petición real, igual que `useIncidentDetail`.
export function useMyIncidents(
  civicId: string | null,
  accessToken: string | null,
): UseMyIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  // La primera carga arranca al montar solo si ya hay `civicId`; si es `null`
  // el efecto de abajo lo corrige a `false` de inmediato.
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Bandera propia de esta ejecución: si cambian las dependencias, se recarga o se desmonta, el cleanup la apaga y la respuesta antigua no pisa a la nueva.
    let isActive = true;

    if (civicId === null) {
      // Sesión aún no resuelta: no hay ciudadano con el que pedir incidencias.
      // Se difiere a un microtask (igual que los callbacks de la promesa de
      // abajo) para no llamar a setState de forma síncrona dentro del efecto.
      Promise.resolve().then(() => {
        if (!isActive) return;
        setIsLoading(false);
        setIncidents([]);
      });
      return () => {
        isActive = false;
      };
    }

    if (accessToken == null) {
      // Hay civicId pero no token válido (sesión sin accessToken, p. ej. tras
      // un autoLoginFailed): no se intenta la petición real, igual que el
      // guard equivalente de `useIncidentDetail`.
      Promise.resolve().then(() => {
        if (!isActive) return;
        setIncidents([]);
        setErrorMessage('No se pudo identificar tu sesión. Vuelve a iniciar sesión.');
        setIsLoading(false);
      });
      return () => {
        isActive = false;
      };
    }

    fetchMyIncidents(civicId, accessToken)
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
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [civicId, accessToken, reloadToken]);

  // El reseteo de carga y error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { incidents, isLoading, errorMessage, backendFallbackNotice, reload };
}
