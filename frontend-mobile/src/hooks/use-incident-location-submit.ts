import { useRef, useState } from 'react';
import { Linking } from 'react-native';

import { MOCK_FALLBACK_NOTICE } from '@/constants/messages';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import type { CreateIncidentInput, CreateIncidentResult, CreatedIncident } from '@/types/incident';
import type { LocationCoordinates } from '@/types/location';
import { confirmAction } from '@/utils/confirm-action';

export interface UseIncidentLocationSubmitParams {
  isLocationEnabled: boolean;
  title: string;
  description: string;
  categoryId: string | null;
  category: string | null;
  selectedPhotoUris: string[];
  submitIncident: (
    input: CreateIncidentInput,
    imageUris?: string[],
  ) => Promise<CreateIncidentResult | null>;
}

export interface UseIncidentLocationSubmitResult {
  // `true` mientras hay un envío en curso: resolución de ubicación, diálogo de confirmación a la
  // espera de respuesta de la usuaria o petición de registro.
  isResolvingLocation: boolean;
  // Aviso sobre la ubicación (o su ausencia) de la incidencia registrada.
  locationNotice: string | null;
  // Aviso de que el registro se hizo en el mock por falta de conexión al backend.
  backendFallbackNotice: string | null;
  // Mensaje amigable si el flujo de ubicación o envío falló de forma inesperada.
  submitErrorMessage: string | null;
  // Incidencia creada tras un envío correcto.
  createdIncident: CreatedIncident | null;
  // Punto de entrada del envío: resuelve la ubicación y registra la incidencia.
  startSubmit: () => void;
}

const UNEXPECTED_SUBMIT_ERROR_MESSAGE =
  'No se pudo registrar la incidencia. Inténtalo de nuevo.';

// Orquesta la resolución de ubicación (preferencia, servicios del dispositivo y
// permisos) antes de registrar una incidencia, degradando a un registro sin
// posición cuando algo falla, y expone el estado resultante para la pantalla.
export function useIncidentLocationSubmit(
  params: UseIncidentLocationSubmitParams,
): UseIncidentLocationSubmitResult {
  const {
    isLocationEnabled,
    title,
    description,
    categoryId,
    category,
    selectedPhotoUris,
    submitIncident,
  } = params;

  const [createdIncident, setCreatedIncident] = useState<CreatedIncident | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  // Bloqueo síncrono contra el doble envío. El ref es imprescindible: dos
  // toques en el mismo tick leerían el mismo estado (aún `false`) y pasarían
  // ambos. El estado `isResolvingLocation` se mantiene solo para que la UI
  // pueda deshabilitar el botón; el guardián real es el ref.
  const isSubmittingRef = useRef(false);

  const lockSubmit = () => {
    isSubmittingRef.current = true;
    setIsResolvingLocation(true);
  };

  const releaseSubmit = () => {
    isSubmittingRef.current = false;
    setIsResolvingLocation(false);
  };

  // Convierte cualquier fallo inesperado en un mensaje para la UI.
  // El mensaje es fijo y en español: un `Error` inesperado puede traer texto técnico.
  const reportSubmitFailure = () => {
    setSubmitErrorMessage(UNEXPECTED_SUBMIT_ERROR_MESSAGE);
  };

  // Envía la incidencia con las coordenadas indicadas (o sin ellas) y conserva los
  // avisos asociados (ubicación) para mostrarlos en la pantalla de confirmación.
  const submitWithCoordinates = async (
    coordinates: LocationCoordinates | null,
    notice: string | null = null,
  ) => {
    const result = await submitIncident(
      {
        title,
        description,
        categoryId,
        category,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        accuracy: coordinates?.accuracy ?? null,
      },
      selectedPhotoUris,
    );

    if (!result) {
      return;
    }

    setLocationNotice(notice);
    setBackendFallbackNotice(result.source === 'mock' ? MOCK_FALLBACK_NOTICE : null);
    setCreatedIncident(result.incident);
  };

  // Envío lanzado desde un botón del diálogo de confirmación: mantiene el bloqueo hasta que
  // termina, captura los errores y libera el bloqueo al final.
  const submitFromAlert = (notice: string) => {
    setSubmitErrorMessage(null);
    submitWithCoordinates(null, notice)
      .catch(reportSubmitFailure)
      .finally(releaseSubmit);
  };

  // Resuelve la ubicación según la preferencia, los servicios del dispositivo y
  // los permisos. Devuelve `true` si ya terminó el envío y se puede liberar el
  // bloqueo, o `false` si queda un diálogo de confirmación abierto que lo libera por
  // su cuenta (en web el diálogo es síncrono, en native es asíncrono).
  const resolveLocationAndSubmit = async (): Promise<boolean> => {
    if (!isLocationEnabled) {
      await submitWithCoordinates(null);
      return true;
    }

    const isDeviceLocationEnabled = await areLocationServicesEnabled();
    if (!isDeviceLocationEnabled) {
      confirmAction({
        title: 'Ubicación del dispositivo desactivada',
        message:
          'La ubicación del dispositivo está desactivada. Actívala en los Ajustes para registrar la incidencia con su posición.',
        cancel: { text: 'Cancelar', onPress: releaseSubmit },
        confirm: {
          text: 'Enviar sin ubicación',
          onPress: () =>
            submitFromAlert(
              'La incidencia se registró sin ubicación porque la ubicación del dispositivo está desactivada.',
            ),
        },
      });
      return false;
    }

    const isPermissionGranted = await requestLocationPermission();
    if (!isPermissionGranted) {
      confirmAction({
        title: 'Permiso de ubicación',
        message:
          'No podemos acceder a tu ubicación. Actívala en los Ajustes para registrar la incidencia con su posición.',
        cancel: { text: 'Cancelar', onPress: releaseSubmit },
        nativeOnlyOptions: [
          {
            text: 'Abrir Ajustes',
            onPress: () => {
              // Se sale a Ajustes: se libera el bloqueo para poder reintentar al volver.
              releaseSubmit();
              Linking.openSettings().catch(reportSubmitFailure);
            },
          },
        ],
        confirm: {
          text: 'Enviar sin ubicación',
          onPress: () =>
            submitFromAlert(
              'La incidencia se registró sin ubicación porque no hay permiso de ubicación.',
            ),
        },
      });
      return false;
    }

    const coordinates = await getCurrentCoordinates();
    if (!coordinates) {
      await submitWithCoordinates(
        null,
        'No se pudo obtener la ubicación; la incidencia se registró sin posición.',
      );
      return true;
    }

    await submitWithCoordinates(coordinates);
    return true;
  };

  // Punto de entrada del envío: ignora llamadas mientras haya un envío o una
  // resolución en curso y libera el bloqueo al terminar (éxito o error). Si
  // queda un diálogo de confirmación abierto, el bloqueo lo libera el propio diálogo.
  const startSubmit = () => {
    if (isSubmittingRef.current) return;

    lockSubmit();
    setSubmitErrorMessage(null);
    resolveLocationAndSubmit()
      .then((canRelease) => {
        if (canRelease) releaseSubmit();
      })
      .catch(() => {
        reportSubmitFailure();
        releaseSubmit();
      });
  };

  return {
    isResolvingLocation,
    locationNotice,
    backendFallbackNotice,
    submitErrorMessage,
    createdIncident,
    startSubmit,
  };
}
