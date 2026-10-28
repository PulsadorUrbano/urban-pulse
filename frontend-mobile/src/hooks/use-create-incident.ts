import { useCallback, useState } from 'react';

import { createIncident } from '@/services/incident.service';
import type { CreateIncidentInput, CreateIncidentResult } from '@/types/incident';

export interface UseCreateIncidentResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  submitIncident: (
    input: CreateIncidentInput,
    imageUris?: string[],
  ) => Promise<CreateIncidentResult | null>;
}

// Encapsula el estado de envío de una incidencia para que la UI solo consuma
// `isSubmitting`, `errorMessage` y `submitIncident`. Recibe el `civicId` de la
// sesión activa, necesario para asociar la incidencia a su autor real.
export function useCreateIncident(civicId: string | null): UseCreateIncidentResult {
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
        const result = await createIncident(input, civicId, imageUris);
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
    [civicId],
  );

  return { isSubmitting, errorMessage, submitIncident };
}
