import { useCallback, useEffect, useRef, useState } from 'react';

import { IncidentNotFoundError, fetchIncidentById } from '@/services/incident.service';
import type { IncidentDetail } from '@/types/incident';

export interface UseIncidentDetailResult {
  incident: IncidentDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  isNotFound: boolean;
  backendFallbackNotice: string | null;
  reload: () => void;
}

// Aviso exacto a mostrar cuando la respuesta viene del mock en lugar del backend real.
const BACKEND_FALLBACK_NOTICE = 'No se ha podido conectar al backend, mostrando los datos del mock.';

// Carga el detalle de una incidencia por `id` al montar (y cuando `id` cambie o
// se llame a `reload`), siguiendo el mismo patrón que `useCategories`/
// `useMyIncidents` (`isMountedRef`, `reloadToken`).
export function useIncidentDetail(id: string): UseIncidentDetailResult {
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  // La primera carga arranca al montar, por eso el estado inicial es cargando.
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Evita actualizar el estado si el componente se desmontó durante la carga.
  const isMountedRef = useRef(true);

  // La carga se resuelve en los callbacks de la promesa (asíncronos), de modo
  // que el efecto no ejecuta setState de forma síncrona.
  useEffect(() => {
    isMountedRef.current = true;

    fetchIncidentById(id)
      .then((result) => {
        if (!isMountedRef.current) return;
        setIncident(result.incident);
        setIsNotFound(false);
        setErrorMessage(null);
        setBackendFallbackNotice(result.source === 'mock' ? BACKEND_FALLBACK_NOTICE : null);
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) return;
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
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [id, reloadToken]);

  // El reseteo de carga y error vive aquí porque se invoca desde eventos de la UI,
  // no desde un efecto, y fuerza una nueva carga incrementando el token.
  const reload = useCallback(() => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);
    setReloadToken((value) => value + 1);
  }, []);

  return { incident, isLoading, errorMessage, isNotFound, backendFallbackNotice, reload };
}
