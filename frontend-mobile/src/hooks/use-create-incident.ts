import { useCallback, useState } from 'react';

import { createIncident } from '@/services/incident.service';
import type { CreateIncidentInput, IncidentPayload } from '@/types/incident';

// Incidencia creada: el payload enviado más el id asignado por json-server
type CreatedIncident = IncidentPayload & { id: string };

export interface UseCreateIncidentResult {
  isSubmitting: boolean;
  errorMessage: string | null;
  submitIncident: (input: CreateIncidentInput) => Promise<CreatedIncident | null>;
}

// Encapsula el estado de envío de una incidencia para que la UI solo consuma
// `isSubmitting`, `errorMessage` y `submitIncident`.
export function useCreateIncident(): UseCreateIncidentResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitIncident = useCallback(
    async (input: CreateIncidentInput): Promise<CreatedIncident | null> => {
      setErrorMessage(null);
      setIsSubmitting(true);

      try {
        const incident = await createIncident(input);
        return incident;
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
    [],
  );

  return { isSubmitting, errorMessage, submitIncident };
}
