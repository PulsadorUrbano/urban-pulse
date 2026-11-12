import { useRef, useState } from 'react';

import {
  AssignmentAccessError,
  AssignmentConflictError,
  isUuid,
  loadBackendAssignment,
  loadDemoAssignment,
  saveBackendAssignment,
  saveDemoAssignment,
  startDemoAssignment,
} from '../services/assignment.service';
import { BackendUnavailableError } from '../services/incident.service';
import type { AssignmentOptions, AssignmentPatch, AssignmentSelection, AssignmentSource } from '../types/assignment';
import type { IncidentDetail } from '../types/incident';
import type { SessionUser } from '../types/user';

function selectionOf(incident: IncidentDetail): AssignmentSelection {
  return {
    departmentId: incident.departmentId,
    teamId: incident.teamId,
    technicianId: incident.technicianId,
  };
}

export function changeDepartment(selection: AssignmentSelection, departmentId: string | null): AssignmentSelection {
  if (selection.departmentId === departmentId) return selection;
  return { departmentId, teamId: null, technicianId: null };
}

export function changeTeam(selection: AssignmentSelection, teamId: string | null): AssignmentSelection {
  if (selection.teamId === teamId) return selection;
  return { ...selection, teamId, technicianId: null };
}

export function buildAssignmentPatch(incident: IncidentDetail, selection: AssignmentSelection): AssignmentPatch {
  const patch: AssignmentPatch = {};
  if (incident.departmentId !== selection.departmentId) patch.departmentId = selection.departmentId;
  if (incident.teamId !== selection.teamId) patch.teamId = selection.teamId;
  if (incident.technicianId !== selection.technicianId) patch.technicianId = selection.technicianId;
  return patch;
}

export function isValidSelection(selection: AssignmentSelection, options: AssignmentOptions): boolean {
  if (selection.departmentId && !options.departments.some((department) => department.id === selection.departmentId)) return false;
  if (selection.teamId && !options.teams.some((team) => team.id === selection.teamId && team.departmentId === selection.departmentId)) return false;
  if (selection.technicianId && !options.technicians.some((technician) => technician.id === selection.technicianId && technician.teamId === selection.teamId)) return false;
  return true;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

export function useIncidentAssignment(initialId: string | null, user: SessionUser, token: string | null) {
  const [inputId, setInputId] = useState(initialId ?? '');
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [options, setOptions] = useState<AssignmentOptions | null>(null);
  const [selection, setSelection] = useState<AssignmentSelection | null>(null);
  const [source, setSource] = useState<AssignmentSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [accessStatus, setAccessStatus] = useState<401 | 403 | null>(null);
  const savingRef = useRef(false);

  const canAssign = user.role === 'admin' || user.role === 'administrative';
  const isDemoAvailable = import.meta.env.DEV;
  const teams = options?.teams.filter((team) => team.departmentId === selection?.departmentId) ?? [];
  const technicians = options?.technicians.filter((technician) => technician.teamId === selection?.teamId) ?? [];
  const patch = incident && selection ? buildAssignmentPatch(incident, selection) : null;
  const canSave = Boolean(
    canAssign && incident && options && selection && source && !loading && !saving && !conflict
    && inputId.trim().toLowerCase() === incident.id
    && (incident.status === 'validated' || incident.status === 'assigned')
    && isValidSelection(selection, options) && patch && Object.keys(patch).length > 0,
  );

  const setLoaded = (data: { incident: IncidentDetail; options: AssignmentOptions }, nextSource: AssignmentSource) => {
    setIncident(data.incident);
    setOptions(data.options);
    setSelection(selectionOf(data.incident));
    setSource(nextSource);
    setInputId(data.incident.id);
    setError(null);
    setOffline(false);
    setConflict(false);
    setAccessStatus(null);
    setNotice(nextSource === 'mock' ? 'Modo demostración: los cambios solo viven en esta sesión.' : null);
  };

  const load = async (id = inputId): Promise<void> => {
    if (savingRef.current || loading) return;
    const normalized = id.trim().toLowerCase();
    if (!isUuid(normalized)) {
      setError('Introduce un UUID válido de incidencia.');
      return;
    }
    if (!canAssign) {
      setError('Tu rol no permite asignar incidencias.');
      return;
    }
    if (user.source !== 'backend' || !token) {
      setError('La sesión actual es simulada. Usa el modo demostración para practicar asignaciones.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setIncident(null);
    setOptions(null);
    setSelection(null);
    setSource(null);
    try {
      setLoaded(await loadBackendAssignment(normalized, token), 'backend');
    } catch (loadError) {
      setOffline(loadError instanceof BackendUnavailableError);
      setAccessStatus(loadError instanceof AssignmentAccessError ? loadError.status : null);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  };

  const startDemo = async (): Promise<void> => {
    if (!isDemoAvailable || !canAssign || savingRef.current || loading) return;
    setLoading(true);
    try {
      setLoaded(await startDemoAssignment(), 'mock');
    } catch (demoError) {
      setError(messageOf(demoError));
    } finally {
      setLoading(false);
    }
  };

  const reload = async (): Promise<void> => {
    if (!incident || !source || savingRef.current || loading) return;
    if (source === 'backend') {
      await load(incident.id);
      return;
    }
    setLoading(true);
    try {
      setLoaded(await loadDemoAssignment(incident.id), 'mock');
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  };

  const save = async (): Promise<void> => {
    if (!canSave || !incident || !selection || !source || !patch || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = source === 'backend'
        ? await saveBackendAssignment(incident.id, patch, token ?? '')
        : await saveDemoAssignment(patch);
      setIncident(updated);
      setSelection(selectionOf(updated));
      setNotice(source === 'backend' ? 'Asignación guardada en el backend.' : 'Asignación de demostración guardada solo en memoria.');
    } catch (saveError) {
      setConflict(saveError instanceof AssignmentConflictError);
      setOffline(saveError instanceof BackendUnavailableError);
      setAccessStatus(saveError instanceof AssignmentAccessError ? saveError.status : null);
      setError(`${messageOf(saveError)} No se ha guardado la asignación.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return {
    inputId, setInputId, incident, options, selection, source, loading, saving,
    error, notice, offline, conflict, accessStatus, canAssign, isDemoAvailable, canSave, teams, technicians,
    load, startDemo, reload, save,
    setDepartment: (departmentId: string | null) => setSelection((current) => current ? changeDepartment(current, departmentId) : current),
    setTeam: (teamId: string | null) => setSelection((current) => current ? changeTeam(current, teamId) : current),
    setTechnician: (technicianId: string | null) => setSelection((current) => current ? { ...current, technicianId } : current),
  };
}
