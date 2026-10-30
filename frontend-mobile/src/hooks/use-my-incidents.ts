import { useCallback, useEffect, useRef, useState } from 'react';

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
// listado vacío sin quedarse colgado en estado de carga.
export function useMyIncidents(civicId: string | null): UseMyIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  // La primera carga arranca al montar solo si ya hay `civicId`; si es `null`
  // el efecto de abajo lo corrige a `false` de inmediato.
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Evita actualizar el estado si el componente se desmontó durante la carga.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (civicId === null) {
      // Sesión aún no resuelta: no hay ciudadano con el que pedir incidencias.
      // Se difiere a un microtask (igual que los callbacks de la promesa de
      // abajo) para no llamar a setState de forma síncrona dentro del efecto.
      Promise.resolve().then(() => {
        if (!isMountedRef.current) return;
        setIsLoading(false);
        setIncidents([]);
      });
      return () => {
        isMountedRef.current = false;
      };
    }

    fetchMyIncidents(civicId)
      .then((result) => {
        if (!isMountedRef.current) return;
        setIncidents(result.incidents);
        setErrorMessage(null);
        setBackendFallbackNotice(result.source === 'mock' ? BACKEND_FALLBACK_NOTICE : null);
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) return;
        // Se conserva el listado previo: un error de recarga no debe vaciar
        // lo que ya se había mostrado correctamente.
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar tus incidencias. Inténtalo de nuevo.',
        );
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [civicId, reloadToken]);

  // El reseteo de carga y error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { incidents, isLoading, errorMessage, backendFallbackNotice, reload };
}
