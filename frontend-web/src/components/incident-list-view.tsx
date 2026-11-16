import { useState } from 'react';

import { STATUS_LABELS } from '../constants/incident-labels';
import { useIncidentList } from '../hooks/use-incident-list';
import type { SessionUser } from '../types/user';
import { AppHeader } from './app-header';
import { LogoutModal } from './logout-modal';

interface IncidentListViewProps {
  user: SessionUser;
  token: string | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenIncident: (id: string) => void;
  onOpenAssignmentDemo?: () => void;
}

export function IncidentListView({
  user, token, isDarkMode, onToggleTheme, onLogout, onOpenIncident, onOpenAssignmentDemo,
}: IncidentListViewProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { items, hasMore, loading, error, loadMore, retry } = useIncidentList(token);

  return (
    <>
      <AppHeader
        user={user}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        onRequestLogout={() => setShowLogoutModal(true)}
      />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6" aria-labelledby="incident-list-title">
        <h2 id="incident-list-title" className="mb-5 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Incidencias
        </h2>
        {!token && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <p>Inicia sesión con el backend para consultar las incidencias.</p>
            {onOpenAssignmentDemo && (
              <button type="button" onClick={onOpenAssignmentDemo} className="mt-2 font-semibold underline">
                Abrir demostración de asignaciones
              </button>
            )}
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40">
            {items.map((incident) => (
              <li key={incident.id}>
                <button
                  type="button"
                  onClick={() => onOpenIncident(incident.id)}
                  className="flex w-full flex-col gap-2 rounded-lg px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:flex-row sm:items-center"
                >
                  <span className="min-w-0 flex-1 break-words font-semibold text-zinc-900 dark:text-zinc-100">
                    {incident.title}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{STATUS_LABELS[incident.status]}</span>
                  <time dateTime={incident.createdAt} className="text-sm text-zinc-600 dark:text-zinc-400 sm:w-28 sm:text-right">
                    {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && <p role="status" className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Cargando incidencias…</p>}
        {token && !loading && !error && items.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay incidencias.</p>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <p role="alert">{error}</p>
            <button type="button" onClick={retry} className="mt-2 font-semibold underline">Reintentar</button>
          </div>
        )}
        {hasMore && !error && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Cargar más
          </button>
        )}
      </section>
      {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={onLogout} />}
    </>
  );
}
