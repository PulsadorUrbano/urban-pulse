import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

import { PRIORITY_LABELS, STATUS_LABELS } from '../constants/incident-labels';
import { useIncidentAssignment } from '../hooks/use-incident-assignment';
import type { AssignmentOptions } from '../types/assignment';
import type { SessionUser } from '../types/user';
import { AppHeader } from './app-header';
import { LogoutModal } from './logout-modal';

interface IncidentAssignmentViewProps {
  incidentId: string | null;
  user: SessionUser;
  token: string | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

function optionName(id: string | null, options: { id: string; name: string }[]): string {
  if (!id) return 'Sin asignar';
  return options.find((option) => option.id === id)?.name ?? `ID fuera del catálogo: ${id}`;
}

function CurrentAssignment({ options, departmentId, teamId, technicianId }: {
  options: AssignmentOptions;
  departmentId: string | null;
  teamId: string | null;
  technicianId: string | null;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <div><dt className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Departamento actual</dt><dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 break-words">{optionName(departmentId, options.departments)}</dd></div>
      <div><dt className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Equipo actual</dt><dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 break-words">{optionName(teamId, options.teams)}</dd></div>
      <div><dt className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Técnico actual</dt><dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 break-words">{optionName(technicianId, options.technicians)}</dd></div>
    </dl>
  );
}

const INPUT_CLASSES = 'w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:ring-zinc-100';

export function IncidentAssignmentView({ incidentId, user, token, isDarkMode, onToggleTheme, onLogout }: IncidentAssignmentViewProps) {
  const assignment = useIncidentAssignment(incidentId, user, token);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { incident, options, selection } = assignment;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppHeader user={user} isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} onRequestLogout={() => setShowLogoutModal(true)} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 sm:px-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Asignaciones</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Selecciona una incidencia validada y asigna departamento, equipo y técnico.</p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/40" aria-label="Buscar incidencia">
          <form onSubmit={(event) => { event.preventDefault(); void assignment.load(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="assignment-incident-id">
              UUID de la incidencia
              <input id="assignment-incident-id" type="text" value={assignment.inputId} onChange={(event) => assignment.setInputId(event.target.value)} disabled={assignment.saving} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`mt-2 ${INPUT_CLASSES}`} />
            </label>
            <button type="submit" disabled={assignment.loading || assignment.saving || !assignment.canAssign || user.source !== 'backend'} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600">
              Buscar incidencia
            </button>
          </form>
          {assignment.isDemoAvailable && assignment.canAssign && (
            <button type="button" onClick={() => void assignment.startDemo()} disabled={assignment.loading || assignment.saving} className="mt-4 text-sm font-semibold text-amber-800 underline hover:text-amber-900 disabled:opacity-50 dark:text-amber-300 dark:hover:text-amber-200">
              Abrir demostración
            </button>
          )}
        </section>

        {!assignment.canAssign && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">Tu rol no permite asignar incidencias.</p>}
        {user.source === 'mock' && assignment.canAssign && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">La sesión es simulada. Puedes usar la demostración; no permite guardar en el backend.</p>}
        {assignment.offline && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">Sin conexión con el backend. Puedes reintentar o abrir la demostración durante el desarrollo.</p>}
        {assignment.error && <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{assignment.error}</p>{assignment.accessStatus === 401 && <button type="button" onClick={onLogout} className="mt-2 font-semibold underline">Volver al acceso</button>}{assignment.conflict && <button type="button" onClick={() => void assignment.reload()} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="h-4 w-4" /> Recargar incidencia</button>}</div></div>}
        {assignment.notice && <p role="status" className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${assignment.source === 'mock' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{assignment.notice}</p>}
        {assignment.loading && <div role="status" className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"><span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" /> Cargando incidencia y catálogo...</div>}

        {incident && options && selection && (
          <>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/40" aria-label="Incidencia seleccionada">
              <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{incident.title}</h3>
              <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">{incident.id}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400"><span>Estado: <strong className="text-zinc-900 dark:text-zinc-100">{STATUS_LABELS[incident.status]}</strong></span><span>Prioridad: <strong className="text-zinc-900 dark:text-zinc-100">{PRIORITY_LABELS[incident.priority]}</strong></span></div>
              <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800/60"><CurrentAssignment options={options} departmentId={incident.departmentId} teamId={incident.teamId} technicianId={incident.technicianId} /></div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/40" aria-label="Editar asignación">
              <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Nueva asignación</h3>
              {options.departments.length === 0 && <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-300">El catálogo no contiene departamentos asignables.</p>}
              {incident.status !== 'validated' && incident.status !== 'assigned' && <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-300">Solo se pueden asignar incidencias validadas o asignadas.</p>}
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Departamento
                  <select value={selection.departmentId ?? ''} onChange={(event) => assignment.setDepartment(event.target.value || null)} disabled={!assignment.canAssign || assignment.saving} className={`mt-2 ${INPUT_CLASSES}`}><option value="">Sin asignar</option>{options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
                </label>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Equipo
                  <select value={selection.teamId ?? ''} onChange={(event) => assignment.setTeam(event.target.value || null)} disabled={!assignment.canAssign || !selection.departmentId || assignment.saving} className={`mt-2 ${INPUT_CLASSES}`}><option value="">Sin asignar</option>{assignment.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
                </label>
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Técnico
                  <select value={selection.technicianId ?? ''} onChange={(event) => assignment.setTechnician(event.target.value || null)} disabled={!assignment.canAssign || !selection.teamId || assignment.saving} className={`mt-2 ${INPUT_CLASSES}`}><option value="">Sin asignar</option>{assignment.technicians.map((technician) => <option key={`${technician.id}-${technician.teamId}`} value={technician.id}>{technician.name}</option>)}</select>
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void assignment.save()} disabled={!assignment.canSave} className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600">{assignment.saving ? 'Guardando...' : 'Guardar asignación'}</button>
                <button type="button" onClick={() => void assignment.reload()} disabled={assignment.loading || assignment.saving} className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">Recargar</button>
              </div>
            </section>
          </>
        )}
      </main>
      {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={onLogout} />}
    </div>
  );
}
