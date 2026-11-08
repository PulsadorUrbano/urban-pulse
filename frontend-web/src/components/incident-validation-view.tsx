import { useState } from 'react';
import { MapPin, CheckCircle2, Info, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';

import { PRIORITY_LABELS, STATUS_LABELS } from '../constants/incident-labels';
import { useIncidentValidation } from '../hooks/use-incident-validation';
import type { SessionUser } from '../types/user';
import { AppHeader } from './app-header';
import { IncidentGallery } from './incident-gallery';
import { LogoutModal } from './logout-modal';
import { ResolutionForm } from './resolution-form';

interface IncidentValidationViewProps {
  incidentId: string | null;
  user: SessionUser;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString();
}

export function IncidentValidationView({ incidentId, user, isDarkMode, onToggleTheme, onLogout }: IncidentValidationViewProps) {
  const validation = useIncidentValidation(incidentId, user.source === 'backend' ? user.id : null);
  const { incident, loading, loadError, outcome, reset } = validation;
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <CheckCircle2 className="w-16 h-16 text-zinc-900 dark:text-zinc-100 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {outcome === 'validated' ? 'Incidencia validada' : 'Incidencia descartada'}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {outcome === 'validated' && incident
            ? `Prioridad asignada: ${PRIORITY_LABELS[incident.priority]}. La resolución queda registrada en el backend.`
            : 'La resolución y su motivo quedan registrados en el backend.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold rounded-lg shadow-md transition-all"
        >
          Volver al expediente
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="font-bold">
          {incidentId ? (loadError ?? 'No se pudo cargar la incidencia.') : 'No hay ninguna incidencia seleccionada.'}
        </p>
        {!incidentId && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Abre la incidencia a validar con <code className="font-mono">?incidencia=&lt;id&gt;</code> en la URL.
          </p>
        )}
        <div className="flex gap-3">
          {incidentId && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-zinc-200 dark:bg-zinc-800 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const { latitude, longitude, accuracy } = incident.location;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans">

      {/* CABECERA INSTITUCIONAL */}
      <AppHeader
        user={user}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        onRequestLogout={() => setShowLogoutModal(true)}
      />

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-h-0 flex gap-6 p-6">

        {/* COLUMNA IZQUIERDA: EXPEDIENTE */}
        <section className="flex-[5.5] flex flex-col gap-6 min-h-0 overflow-y-auto hide-scroll">

          <div className="grid grid-cols-3 gap-4 shrink-0">
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Expediente</h3>
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">{incident.title}</p>
              <p className="mt-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 break-all">{incident.id}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Categoría</h3>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{incident.category ?? 'Sin categoría'}</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Ubicación</h3>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  {latitude !== null && longitude !== null
                    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                    : 'Sin ubicación'}
                </p>
                {accuracy !== null && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Precisión: {Math.round(accuracy)} m</p>
                )}
              </div>
              {latitude !== null && longitude !== null && (
                <a
                  href={`https://maps.google.com/?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mt-2 transition-colors"
                >
                  <MapPin className="w-4 h-4" /> Abrir Mapa
                </a>
              )}
            </div>
          </div>

          <IncidentGallery title={incident.title} images={incident.images} />

          <div className="bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-4 border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
              Descripción del Ciudadano
            </h3>
            <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
              {incident.description ?? 'El ciudadano no añadió descripción.'}
            </p>
          </div>

        </section>

        {/* COLUMNA DERECHA: AUDITORÍA */}
        <section className="flex-[4.5] flex flex-col gap-6 min-h-0 overflow-y-auto hide-scroll">

          <div className="p-6 rounded-xl border bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 shadow-sm shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-4">
              Estado del Expediente
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Estado</dt>
              <dd className="font-bold text-zinc-900 dark:text-zinc-100">{STATUS_LABELS[incident.status]}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Prioridad</dt>
              <dd className="font-bold text-zinc-900 dark:text-zinc-100">
                {incident.status === 'validated' ? PRIORITY_LABELS[incident.priority] : 'Sin asignar'}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Registrada</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(incident.createdAt)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Ciudadano</dt>
              <dd className="font-mono text-[11px] text-zinc-900 dark:text-zinc-100 break-all">{incident.civicId}</dd>
            </dl>
          </div>

          <ResolutionForm incident={incident} validation={validation} />
        </section>
      </main>

      {/* MODAL INSTITUCIONAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN */}
      {showLogoutModal && (
        <LogoutModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            onLogout();
          }}
        />
      )}
    </div>
  );
}
