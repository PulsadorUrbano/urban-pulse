import { CheckCircle2, XCircle } from 'lucide-react';

import { PRIORITY_LABELS, STATUS_LABELS } from '../constants/incident-labels';
import { MIN_JUSTIFICATION_LENGTH, type useIncidentValidation } from '../hooks/use-incident-validation';
import { REJECT_REASONS, type IncidentDetail, type IncidentPriority } from '../types/incident';

interface ResolutionFormProps {
  incident: IncidentDetail;
  validation: ReturnType<typeof useIncidentValidation>;
}

// Orden del control deslizante de prioridad.
const PRIORITY_ORDER: readonly IncidentPriority[] = ['low', 'medium', 'high'];

export function ResolutionForm({ incident, validation }: ResolutionFormProps) {
  const {
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
  } = validation;

  // El formulario solo se ofrece mientras la incidencia está pendiente, o para reintentar
  // la prioridad si la validación quedó a medias en esta misma sesión.
  const canResolve =
    incident.status === 'reported' ||
    (incident.status === 'validated' && decision === 'validate' && submitError !== null);

  return (
    <div className="bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col shrink-0 mb-6 relative overflow-hidden">

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Resolución Técnica</h3>
      </div>

      {!canResolve ? (
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Esta incidencia ya está {STATUS_LABELS[incident.status].toLowerCase()}; solo se pueden resolver las pendientes de validar.
        </p>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => handleDecisionSelect('validate')}
              className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all duration-300 border-2 ${
                decision === 'validate'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-[1.02]'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              Proceder
            </button>

            <button
              type="button"
              disabled={incident.status !== 'reported'}
              onClick={() => handleDecisionSelect('reject')}
              className={`flex-1 py-4 px-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all duration-300 border-2 disabled:opacity-40 ${
                decision === 'reject'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-[1.02]'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <XCircle className="w-5 h-5" />
              Descartar
            </button>
          </div>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${decision ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>

            {decision === 'validate' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <label htmlFor="priority-slider" className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    Nivel de Actuación
                  </label>
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                    {PRIORITY_LABELS[selectedPriority]}
                  </span>
                </div>

                <div className="px-2">
                  <input
                    id="priority-slider"
                    type="range"
                    min="0"
                    max={PRIORITY_ORDER.length - 1}
                    step="1"
                    value={PRIORITY_ORDER.indexOf(selectedPriority)}
                    onChange={(event) => {
                      const priority = PRIORITY_ORDER[Number(event.target.value)];
                      if (priority) setSelectedPriority(priority);
                    }}
                    className="premium-slider"
                  />
                  <div className="flex justify-between text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-3 px-1">
                    {PRIORITY_ORDER.map((priority) => (
                      <span key={priority}>{PRIORITY_LABELS[priority]}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {decision === 'reject' && (
              <div className="mb-6">
                <p className="block text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4">
                  Causa del Descarte
                </p>
                <div className="flex flex-col gap-3">
                  {REJECT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectReason(reason)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                        rejectReason === reason
                          ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        rejectReason === reason
                          ? 'border-zinc-900 dark:border-white'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {rejectReason === reason && <div className="w-2.5 h-2.5 bg-zinc-900 dark:bg-white rounded-full" />}
                      </div>
                      <span className={`text-sm font-bold ${rejectReason === reason ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {reason}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col mt-4">
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="justification" className="block text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                  Justificación Técnica
                </label>
                <span className="text-[11px] text-zinc-400">Mín. {MIN_JUSTIFICATION_LENGTH} caracteres</span>
              </div>
              <textarea
                id="justification"
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                placeholder="Describa el motivo de la resolución de forma objetiva..."
                className="w-full min-h-[140px] p-4 rounded-xl text-base font-medium leading-relaxed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors resize-none hide-scroll"
              />

              {submitError && (
                <div role="alert" className="mt-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700">
                  {submitError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !decision}
                className={`mt-6 w-full py-4 rounded-xl text-base font-black uppercase tracking-widest shadow-lg transition-all duration-300 shrink-0 ${
                  submitting || !decision
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-[1.01] hover:shadow-xl'
                }`}
              >
                {submitting ? 'Procesando...' : 'Confirmar Resolución'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
