import { useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

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
  selectedPhotoUris: string[];
  submitIncident: (
    input: CreateIncidentInput,
    imageUris?: string[],
  ) => Promise<CreateIncidentResult | null>;
  uploadPendingImages: (result: CreateIncidentResult) => Promise<CreateIncidentResult>;
}

export interface UseIncidentLocationSubmitResult {
  // `true` mientras hay un envío en curso: resolución de ubicación o petición de registro.
  isResolvingLocation: boolean;
  // Aviso de que el registro se hizo en el mock por falta de conexión al backend.
  backendFallbackNotice: string | null;
  // Mensaje amigable si no se pudo registrar (p. ej. sin ubicación); el botón
  // queda liberado para reintentar.
  submitErrorMessage: string | null;
  // Incidencia creada tras un envío correcto.
  createdIncident: CreatedIncident | null;
  // Motivo por el que no se pudieron subir las fotos de la incidencia creada.
  imagesUploadErrorMessage: string | null;
  // `true` mientras se reintenta la subida de las fotos pendientes.
  isRetryingImageUpload: boolean;
  // Punto de entrada del envío: resuelve la ubicación y registra la incidencia.
  startSubmit: () => void;
  // Reintenta subir solo las fotos pendientes, sin volver a crear la incidencia.
  retryImageUpload: () => void;
}

const UNEXPECTED_SUBMIT_ERROR_MESSAGE =
  'No se pudo registrar la incidencia. Inténtalo de nuevo.';

export const LOCATION_DISABLED_MESSAGE =
  'La ubicación es obligatoria para registrar la incidencia. Actívala e inténtalo de nuevo.';
export const DEVICE_LOCATION_DISABLED_MESSAGE =
  'La ubicación del dispositivo está desactivada. Sin ubicación no se puede registrar la incidencia: actívala en los Ajustes e inténtalo de nuevo.';
export const LOCATION_PERMISSION_DENIED_MESSAGE =
  'No hay permiso de ubicación. Sin ubicación no se puede registrar la incidencia: concede el permiso en los Ajustes e inténtalo de nuevo.';
export const LOCATION_UNAVAILABLE_MESSAGE =
  'No se pudo obtener tu ubicación y sin ella no se puede registrar la incidencia. Inténtalo de nuevo.';
export const CATEGORY_REQUIRED_MESSAGE = 'Elige una categoría del catálogo para registrar la incidencia.';

// Orquesta la resolución de ubicación (preferencia, servicios del dispositivo y
// permisos) antes de registrar una incidencia. La ubicación es obligatoria: si
// falta, no se envía nada y se explica el motivo para que se pueda reintentar.
export function useIncidentLocationSubmit(
  params: UseIncidentLocationSubmitParams,
): UseIncidentLocationSubmitResult {
  const {
    isLocationEnabled,
    title,
    description,
    categoryId,
    selectedPhotoUris,
    submitIncident,
    uploadPendingImages,
  } = params;

  const [creationResult, setCreationResult] = useState<CreateIncidentResult | null>(null);
  const [backendFallbackNotice, setBackendFallbackNotice] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isRetryingImageUpload, setIsRetryingImageUpload] = useState(false);

  // Bloqueo síncrono contra el doble envío. El ref es imprescindible: dos
  // toques en el mismo tick leerían el mismo estado (aún `false`) y pasarían
  // ambos. El estado `isResolvingLocation` se mantiene solo para que la UI
  // pueda deshabilitar el botón; el guardián real es el ref.
  const isSubmittingRef = useRef(false);
  // Mismo motivo para el reintento de la subida de fotos.
  const isRetryingImageUploadRef = useRef(false);

  const lockSubmit = () => {
    isSubmittingRef.current = true;
    setIsResolvingLocation(true);
  };

  const releaseSubmit = () => {
    isSubmittingRef.current = false;
    setIsResolvingLocation(false);
  };

  // Ofrece abrir los Ajustes del sistema para conceder el permiso. Solo en
  // native: en web no hay Ajustes que abrir y basta con el mensaje en pantalla.
  const offerOpenSettings = () => {
    if (Platform.OS === 'web') return;

    confirmAction({
      title: 'Permiso de ubicación',
      message: LOCATION_PERMISSION_DENIED_MESSAGE,
      cancel: { text: 'Cerrar', onPress: () => {} },
      confirm: {
        text: 'Abrir Ajustes',
        onPress: () => {
          Linking.openSettings().catch(() => setSubmitErrorMessage(UNEXPECTED_SUBMIT_ERROR_MESSAGE));
        },
      },
    });
  };

  // Envía la incidencia con las coordenadas resueltas y conserva el resultado
  // (incluido el estado de la subida de fotos) para la pantalla de confirmación.
  const submitWithCoordinates = async (coordinates: LocationCoordinates, selectedCategoryId: string) => {
    const result = await submitIncident(
      {
        title,
        description,
        categoryId: selectedCategoryId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      },
      selectedPhotoUris,
    );

    if (!result) {
      return;
    }

    setBackendFallbackNotice(result.source === 'mock' ? MOCK_FALLBACK_NOTICE : null);
    setCreationResult(result);
  };

  // Resuelve la ubicación según la preferencia, los servicios del dispositivo y
  // los permisos. Si no se consigue, deja un mensaje explicando por qué no se
  // envía; nunca registra la incidencia sin coordenadas.
  const resolveLocationAndSubmit = async (): Promise<void> => {
    if (categoryId == null) {
      setSubmitErrorMessage(CATEGORY_REQUIRED_MESSAGE);
      return;
    }

    if (!isLocationEnabled) {
      setSubmitErrorMessage(LOCATION_DISABLED_MESSAGE);
      return;
    }

    const isDeviceLocationEnabled = await areLocationServicesEnabled();
    if (!isDeviceLocationEnabled) {
      setSubmitErrorMessage(DEVICE_LOCATION_DISABLED_MESSAGE);
      return;
    }

    const isPermissionGranted = await requestLocationPermission();
    if (!isPermissionGranted) {
      setSubmitErrorMessage(LOCATION_PERMISSION_DENIED_MESSAGE);
      offerOpenSettings();
      return;
    }

    const coordinates = await getCurrentCoordinates();
    if (!coordinates) {
      setSubmitErrorMessage(LOCATION_UNAVAILABLE_MESSAGE);
      return;
    }

    await submitWithCoordinates(coordinates, categoryId);
  };

  // Punto de entrada del envío: ignora llamadas mientras haya un envío o una
  // resolución en curso y libera el bloqueo al terminar (éxito o error).
  const startSubmit = () => {
    if (isSubmittingRef.current) return;

    lockSubmit();
    setSubmitErrorMessage(null);
    resolveLocationAndSubmit()
      .catch(() => {
        setSubmitErrorMessage(UNEXPECTED_SUBMIT_ERROR_MESSAGE);
      })
      .finally(releaseSubmit);
  };

  // Reintenta solo la subida de las fotos pendientes de la incidencia creada.
  const retryImageUpload = () => {
    if (isRetryingImageUploadRef.current || !creationResult) return;
    if (creationResult.pendingImageUris.length === 0) return;

    isRetryingImageUploadRef.current = true;
    setIsRetryingImageUpload(true);
    uploadPendingImages(creationResult)
      .then(setCreationResult)
      .finally(() => {
        isRetryingImageUploadRef.current = false;
        setIsRetryingImageUpload(false);
      });
  };

  return {
    isResolvingLocation,
    backendFallbackNotice,
    submitErrorMessage,
    createdIncident: creationResult?.incident ?? null,
    imagesUploadErrorMessage: creationResult?.imagesUploadErrorMessage ?? null,
    isRetryingImageUpload,
    startSubmit,
    retryImageUpload,
  };
}
