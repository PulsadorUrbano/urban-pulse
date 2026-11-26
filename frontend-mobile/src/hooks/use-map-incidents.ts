import { useCallback, useEffect, useState } from 'react';

import { BACKEND_FALLBACK_NOTICE } from '@/constants/messages';
import { QUERY_MISSING_TOKEN_MESSAGE, fetchMyMapIncidents } from '@/services/incident.service';
import type { MapIncident } from '@/types/incident-map';
import type { AuthToken } from '@/types/token';

export interface UseMapIncidentsResult {
  incidents: MapIncident[];
  isLoading: boolean;
  errorMessage: string | null;
  backendFallbackNotice: string | null;
  reload: () => void;
}

const NO_MAP_INCIDENTS: MapIncident[] = [];

// Datos cargados junto a la identidad (ciudadano + token) a la que pertenecen.
interface LoadedMapData {
  identityKey: string | null;
  incidents: MapIncident[];
  backendFallbackNotice: string | null;
}

const EMPTY_LOADED_DATA: LoadedMapData = {
  identityKey: null,
  incidents: NO_MAP_INCIDENTS,
  backendFallbackNotice: null,
};

// Carga las incidencias propias con coordenadas (para el mapa) de la sesión activa. Si `civicId` es
// `null` (sesión aún no resuelta) no dispara ninguna petición y deja el
// listado vacío sin quedarse colgado en estado de carga. Si hay ciudadano pero
// no hay `token` (sesión cerrada o caducada) tampoco llama al servicio y expone
// el mensaje de sesión como error.
export function useMapIncidents(
  civicId: string | null,
  token: AuthToken | null,
): UseMapIncidentsResult {
  const [loadedData, setLoadedData] = useState<LoadedMapData>(EMPTY_LOADED_DATA);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Clave de la última petición que terminó (con éxito o error).
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);

  // Se dependen los campos primitivos del token, no el objeto, para no relanzar
  // la carga si cambia la identidad del objeto pero no su contenido.
  const accessToken = token?.accessToken ?? null;
  const tokenSource = token?.source ?? null;
  const identityKey = civicId === null ? null : `${civicId}:${tokenSource}:${accessToken}`;
  // Los datos de otra identidad (cuenta anterior) no se muestran nunca.
  const currentData = loadedData.identityKey === identityKey ? loadedData : EMPTY_LOADED_DATA;
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
    const currentIdentityKey = `${civicId}:${tokenSource}:${accessToken}`;
    const currentRequestKey = `${civicId}:${tokenSource}:${accessToken}:${reloadToken}`;

    fetchMyMapIncidents(civicId, { accessToken, source: tokenSource })
      .then((result) => {
        if (!isActive) return;
        setLoadedData({
          identityKey: currentIdentityKey,
          incidents: result.incidents,
          backendFallbackNotice: result.source === 'mock' ? BACKEND_FALLBACK_NOTICE : null,
        });
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        // Se conserva el listado previo solo si es de la misma identidad: un
        // error de recarga no vacía lo ya mostrado, pero nunca se arrastran
        // datos de otra cuenta.
        setLoadedData((previousData) =>
          previousData.identityKey === currentIdentityKey ? previousData : EMPTY_LOADED_DATA,
        );
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
    incidents: civicId === null || hasMissingToken ? NO_MAP_INCIDENTS : currentData.incidents,
    isLoading,
    errorMessage: hasMissingToken ? QUERY_MISSING_TOKEN_MESSAGE : errorMessage,
    backendFallbackNotice: hasMissingToken ? null : currentData.backendFallbackNotice,
    reload,
  };
}
