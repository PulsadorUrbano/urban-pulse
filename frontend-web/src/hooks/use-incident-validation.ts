import { useCallback, useEffect, useState } from 'react';

import {
  changeIncidentPriority,
  changeIncidentStatus,
  fetchIncidentById,
} from '../services/incident.service';
import type {
  IncidentDetail,
  IncidentPriority,
  RejectReason,
  ValidationDecision,
} from '../types/incident';

// La vista exige una justificación mínima para la trazabilidad; el backend solo exige que no esté vacía.
export const MIN_JUSTIFICATION_LENGTH = 10;

export type ValidationOutcome = 'validated' | 'rejected';

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Carga una incidencia del backend y aplica la decisión del operador:
// validar (PATCH status + PATCH priority) o descartar (PATCH status con motivo).
// `actorId` es el usuario de una sesión real del backend, que este recibe como `civicId`
// (actor declarado); es null con una sesión simulada, que no puede resolver incidencias.
export function useIncidentValidation(incidentId: string | null, actorId: string | null) {
  // Resultado de la última carga, etiquetado con la petición que lo produjo: así "cargando"
  // se deriva sin actualizar estado de forma síncrona dentro del efecto.
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = incidentId ? `${incidentId}#${reloadKey}` : null;
  const [loaded, setLoaded] = useState<{
    key: string;
    incident: IncidentDetail | null;
    error: string | null;
  } | null>(null);

  const [decision, setDecision] = useState<ValidationDecision | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<IncidentPriority>('medium');
  const [rejectReason, setRejectReason] = useState<RejectReason | null>(null);
  const [justification, setJustification] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);

  useEffect(() => {
    if (!incidentId || !requestKey) return;
    let active = true;
    fetchIncidentById(incidentId)
      .then((incidentDetail) => {
        if (active) setLoaded({ key: requestKey, incident: incidentDetail, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setLoaded({ key: requestKey, incident: null, error: messageOf(error, 'No se pudo cargar la incidencia.') });
        }
      });
    return () => {
      active = false;
    };
  }, [incidentId, requestKey]);

  const isCurrent = requestKey !== null && loaded?.key === requestKey;
  const incident = isCurrent ? loaded.incident : null;
  const loadError = isCurrent ? loaded.error : null;
  const loading = requestKey !== null && !isCurrent;

  // Sustituye la incidencia cargada por la respuesta de un PATCH.
  const setIncident = useCallback(
    (updated: IncidentDetail) => {
      if (requestKey) setLoaded({ key: requestKey, incident: updated, error: null });
    },
    [requestKey],
  );

  const handleDecisionSelect = useCallback((action: ValidationDecision) => {
    setDecision(action);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!incident || !decision) return;
    const cause = justification.trim();

    if (cause.length < MIN_JUSTIFICATION_LENGTH) {
      setSubmitError(
        `La justificación técnica es obligatoria (mín. ${MIN_JUSTIFICATION_LENGTH} caracteres) para trazabilidad.`,
      );
      return;
    }
    if (decision === 'reject' && !rejectReason) {
      setSubmitError('Debe seleccionar un motivo de descarte.');
      return;
    }
    if (!actorId) {
      setSubmitError('La sesión actual es simulada. Cierra sesión e inicia sesión con el backend para resolver incidencias.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (decision === 'reject') {
        const rejected = await changeIncidentStatus(incident.id, {
          status: 'rejected',
          cause: `${rejectReason}: ${cause}`,
          civicId: actorId,
        });
        setIncident(rejected);
        setOutcome('rejected');
        return;
      }

      // Si un intento anterior ya validó la incidencia, solo falta la prioridad.
      let current = incident;
      if (current.status === 'reported') {
        current = await changeIncidentStatus(current.id, { status: 'validated', cause, civicId: actorId });
        setIncident(current);
      }
      try {
        const prioritized = await changeIncidentPriority(current.id, {
          priority: selectedPriority,
          cause,
          civicId: actorId,
        });
        setIncident(prioritized);
        setOutcome('validated');
      } catch (priorityError) {
        setSubmitError(
          `La incidencia se ha validado, pero no se pudo asignar la prioridad: ${messageOf(priorityError, 'error desconocido')}. Vuelve a confirmar para reintentarlo.`,
        );
      }
    } catch (statusError) {
      setSubmitError(messageOf(statusError, 'No se pudo registrar la resolución.'));
    } finally {
      setSubmitting(false);
    }
  }, [actorId, decision, incident, justification, rejectReason, selectedPriority, setIncident]);

  // Vuelve a cargar la incidencia y limpia el formulario.
  const reset = useCallback(() => {
    setDecision(null);
    setRejectReason(null);
    setJustification('');
    setSubmitError(null);
    setOutcome(null);
    setReloadKey((key) => key + 1);
  }, []);

  return {
    incident,
    loading,
    loadError,
    decision,
    handleDecisionSelect,
    selectedPriority,
    setSelectedPriority,
    rejectReason,
    setRejectReason,
    justification,
    setJustification,
    handleSubmit,
    submitting,
    submitError,
    outcome,
    reset,
  };
}
