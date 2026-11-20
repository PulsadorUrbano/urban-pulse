import { useIncidentAssignment, type AssignmentMode } from '../hooks/use-incident-assignment';
import type { IncidentDetail } from '../types/incident';

interface IncidentAssignmentViewProps {
  incident: IncidentDetail;
  mode: AssignmentMode;
  disabled?: boolean;
  onSaved: (incident: IncidentDetail) => void;
  onSavingChange?: (saving: boolean) => void;
  onReload?: () => void;
  onLogout?: () => void;
}

interface AssignmentSelectProps {
  label: string;
  value: string | null;
  options: readonly { id: string; name: string }[];
  disabled: boolean;
  requiredPlaceholder?: string;
  onChange: (id: string | null) => void;
}

function AssignmentSelect({ label, value, options, disabled, requiredPlaceholder, onChange }: AssignmentSelectProps) {
  const required = requiredPlaceholder !== undefined;

  return (
    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        required={required}
        className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <option value="" disabled={required}>{requiredPlaceholder ?? 'Sin asignar'}</option>
        {value && !options.some((item) => item.id === value) && <option value={value}>Fuera del catálogo</option>}
        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function assignmentName(id: string | null, options: readonly { id: string; name: string }[]): string {
  if (!id) return 'Sin asignar';
  return options.find((item) => item.id === id)?.name ?? 'Fuera del catálogo';
}

export function IncidentAssignmentView({
  incident, mode, disabled = false, onSaved, onSavingChange, onReload, onLogout,
}: IncidentAssignmentViewProps) {
  const assignment = useIncidentAssignment(incident, mode, disabled, onSaved, onSavingChange);
  const { options, selection, accessStatus, conflict, saving } = assignment;
  const controlsDisabled = disabled || saving || conflict || accessStatus !== null;

  return (
    <section className="shrink-0 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/40" aria-labelledby="assignment-heading">
      <h3 id="assignment-heading" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Asignación</h3>
      {assignment.loading && <p role="status" className="mt-3 text-sm">Cargando catálogo…</p>}
      {assignment.error && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <p role="alert">{assignment.error}</p>
          {assignment.catalogError && accessStatus === null && (
            <button type="button" onClick={assignment.retryCatalog} className="mt-2 font-semibold underline">
              Reintentar catálogo
            </button>
          )}
          {conflict && onReload && (
            <button type="button" onClick={onReload} className="mt-2 font-semibold underline">
              Recargar incidencia
            </button>
          )}
          {accessStatus === 401 && onLogout && (
            <button type="button" onClick={onLogout} className="mt-2 font-semibold underline">
              Volver al acceso
            </button>
          )}
        </div>
      )}
      {options && (
        <>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Asignación actual: {assignmentName(incident.departmentId, options.departments)}
            {' / '}{assignmentName(incident.teamId, options.teams)}
            {' / '}{assignmentName(incident.technicianId, options.technicians)}
          </p>
          {options.departments.length === 0 && (
            <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-300">
              El catálogo no contiene departamentos asignables.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <AssignmentSelect
              label="Departamento"
              value={selection.departmentId}
              options={options.departments}
              disabled={controlsDisabled}
              requiredPlaceholder="Selecciona departamento"
              onChange={assignment.setDepartment}
            />
            <AssignmentSelect
              label="Equipo"
              value={selection.teamId}
              options={assignment.teams}
              disabled={controlsDisabled || !selection.departmentId}
              requiredPlaceholder="Selecciona equipo"
              onChange={assignment.setTeam}
            />
            <AssignmentSelect label="Técnico" value={selection.technicianId} options={assignment.technicians}
              disabled={controlsDisabled || !selection.teamId} onChange={assignment.setTechnician} />
          </div>
          <label className="mt-4 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Comentarios adicionales <span className="font-normal text-zinc-600 dark:text-zinc-400">(opcional)</span>
            <textarea
              value={assignment.comments}
              onChange={(event) => assignment.setComments(event.target.value)}
              disabled={controlsDisabled}
              rows={3}
              className="mt-2 block w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void assignment.save()}
            disabled={!assignment.canSave}
            className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? 'Guardando…' : 'Guardar asignación'}
          </button>
          {assignment.saved && (
            <p role="status" className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
              {'token' in mode ? 'Asignación guardada.' : 'Asignación de demostración guardada en memoria.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
