import { useState, useEffect, useCallback } from 'react';
import { fetchPendingIncident, submitValidationDecision } from '../services/incidentService';

export const useIncidentValidation = (incidentId) => {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Decision state
  const [decision, setDecision] = useState(null); // 'validate' | 'reject'
  const [selectedPriority, setSelectedPriority] = useState(''); // 'Baja' | 'Media' | 'Alta'
  const [rejectReason, setRejectReason] = useState(''); // 'Improcedente' | 'Duplicado' | 'Fuera de competencia'
  const [justification, setJustification] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const loadIncident = async () => {
      try {
        setLoading(true);
        const data = await fetchPendingIncident(incidentId);
        setIncident(data);
        // Pre-select AI suggested priority if we validate
        if (data?.aiSuggestion?.priority) {
          setSelectedPriority(data.aiSuggestion.priority);
        }
      } catch (err) {
        setError('Error al cargar los datos de la incidencia.');
      } finally {
        setLoading(false);
      }
    };
    loadIncident();
  }, [incidentId]);

  const handleDecisionSelect = useCallback((action) => {
    setDecision(action);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!justification || justification.trim().length < 10) {
      setError('La justificación técnica es obligatoria (mín. 10 caracteres) para trazabilidad.');
      return;
    }
    if (decision === 'reject' && !rejectReason) {
      setError('Debe seleccionar un motivo de rechazo.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await submitValidationDecision(incident.id, {
        action: decision,
        priority: decision === 'validate' ? selectedPriority : null,
        rejectReason: decision === 'reject' ? rejectReason : null,
        justification
      });
      setSubmitSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [decision, justification, rejectReason, selectedPriority, incident]);

  const reset = useCallback(() => {
    setDecision(null);
    setJustification('');
    setSubmitSuccess(false);
    setError(null);
  }, []);

  return {
    incident,
    loading,
    error,
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
    submitSuccess,
    reset
  };
};
