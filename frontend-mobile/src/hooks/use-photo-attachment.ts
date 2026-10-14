import { useCallback, useRef, useState } from 'react';

import { pickPhotoFromCamera, pickPhotoFromLibrary } from '@/services/photo-picker';
import { storePhoto } from '@/services/storage.service';

export interface UsePhotoAttachmentResult {
  // URIs locales (`file://...`) de las fotos ya adjuntadas a la incidencia.
  selectedPhotoUris: string[];
  // `true` mientras se captura y "guarda" una foto (deshabilita nuevos adjuntos).
  isProcessingPhoto: boolean;
  // Último error amigable en español, ya sea del picker o del almacenamiento.
  errorMessage: string | null;
  attachPhotoFromCamera: () => Promise<void>;
  attachPhotoFromLibrary: () => Promise<void>;
  removePhoto: (uri: string) => void;
}

// Encapsula el ciclo completo de adjuntar fotos a una incidencia: captura con
// el picker del dispositivo, "guardado" simulado vía `storePhoto` y gestión de
// la lista de URIs seleccionadas. La UI solo consume el estado derivado y las
// acciones expuestas, sin conocer los servicios subyacentes.
export function usePhotoAttachment(): UsePhotoAttachmentResult {
  const [selectedPhotoUris, setSelectedPhotoUris] = useState<string[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref espejo del estado de procesamiento: permite leer el valor más reciente
  // dentro de los callbacks sin quedar ligados a una clausura vieja, evitando
  // así adjuntos simultáneos desde cámara y galería.
  const isProcessingPhotoRef = useRef(false);

  // Punto común para cámara y galería: recibe el lanzador concreto del servicio
  // y orquesta el mismo flujo de carga, cancelación y error para ambos orígenes.
  const attachPhoto = useCallback(async (launchPhotoPicker: () => Promise<string | null>) => {
    // Si ya hay una foto en proceso, se ignora la nueva solicitud.
    if (isProcessingPhotoRef.current) return;

    isProcessingPhotoRef.current = true;
    setIsProcessingPhoto(true);
    setErrorMessage(null);

    try {
      const pickedPhotoUri = await launchPhotoPicker();

      // Cancelación del usuario: acción legítima, sin error y sin cambios.
      if (pickedPhotoUri === null) return;

      // Simula el guardado externo (con retardo) y añade la URI al final.
      await storePhoto(pickedPhotoUri);
      setSelectedPhotoUris((currentUris) => [...currentUris, pickedPhotoUri]);
    } catch (error) {
      // Los servicios ya lanzan errores con mensaje amigable en español;
      // el mensaje genérico cubre cualquier fallo inesperado.
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos adjuntar la foto. Inténtalo de nuevo.',
      );
    } finally {
      isProcessingPhotoRef.current = false;
      setIsProcessingPhoto(false);
    }
  }, []);

  // Abre la cámara del dispositivo para capturar una foto de la incidencia.
  const attachPhotoFromCamera = useCallback(
    () => attachPhoto(pickPhotoFromCamera),
    [attachPhoto],
  );

  // Abre la galería del dispositivo para elegir una foto ya existente.
  const attachPhotoFromLibrary = useCallback(
    () => attachPhoto(pickPhotoFromLibrary),
    [attachPhoto],
  );

  // Elimina de la lista la foto cuya URI coincida con la indicada.
  const removePhoto = useCallback((uri: string) => {
    setSelectedPhotoUris((currentUris) =>
      currentUris.filter((photoUri) => photoUri !== uri),
    );
  }, []);

  return {
    selectedPhotoUris,
    isProcessingPhoto,
    errorMessage,
    attachPhotoFromCamera,
    attachPhotoFromLibrary,
    removePhoto,
  };
}
