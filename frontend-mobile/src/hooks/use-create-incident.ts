import { useCallback, useState } from 'react';

import { IMAGES_UPLOAD_ERROR_MESSAGE, createIncident, uploadIncidentImages } from '@/services/incident.service';
import type { CreateIncidentInput, CreateIncidentResult } from '@/types/incident';
import type { AuthToken } from '@/types/token';

export interface UseCreateIncidentResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  submitIncident: (
    input: CreateIncidentInput,
    imageUris?: string[],
  ) => Promise<CreateIncidentResult | null>;
  // Reintenta subir solo las fotos pendientes de una incidencia ya creada,
  // sin volver a crearla. Devuelve el resultado actualizado; nunca lanza.
  uploadPendingImages: (result: CreateIncidentResult) => Promise<CreateIncidentResult>;
}

// Encapsula el estado de envío de una incidencia para que la UI solo consuma
// `isSubmitting`, `errorMessage` y `submitIncident`. Recibe el `civicId` y el
// token de la sesión activa: el token autentica la petición contra el backend
// (que deriva el ciudadano del JWT) y el `civicId` asocia la incidencia en el mock.
export function useCreateIncident(
  civicId: string | null,
  token: AuthToken | null,
): UseCreateIncidentResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitIncident = useCallback(
    async (input: CreateIncidentInput, imageUris?: string[]): Promise<CreateIncidentResult | null> => {
      setErrorMessage(null);

      // Sin `civicId` no hay sesión identificable: no se intenta el envío.
      if (civicId == null) {
        setErrorMessage('No se pudo identificar tu sesión. Vuelve a iniciar sesión.');
        return null;
      }

      setIsSubmitting(true);

      try {
        const result = await createIncident(input, { civicId, token }, imageUris);
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado al registrar la incidencia.';
        setErrorMessage(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [civicId, token],
  );

  const uploadPendingImages = useCallback(
    async (result: CreateIncidentResult): Promise<CreateIncidentResult> => {
      try {
        const upload = await uploadIncidentImages(
          result.incident.id,
          result.pendingImageUris,
          result.source,
          token,
        );
        return {
          ...result,
          incident: {
            ...result.incident,
            images: [...result.incident.images, ...upload.images],
          },
          pendingImageUris: upload.pendingImageUris,
          imagesUploadErrorMessage: upload.errorMessage,
        };
      } catch {
        // Un fallo inesperado (p. ej. respuesta ilegible) deja las fotos pendientes.
        return { ...result, imagesUploadErrorMessage: IMAGES_UPLOAD_ERROR_MESSAGE };
      }
    },
    [token],
  );

  return { isSubmitting, errorMessage, submitIncident, uploadPendingImages };
}
