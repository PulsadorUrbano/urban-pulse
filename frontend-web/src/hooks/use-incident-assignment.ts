import { useEffect, useRef, useState } from 'react';

import {
  AssignmentAccessError,
  AssignmentConflictError,
  fetchAssignmentOptions,
  saveBackendAssignment,
  saveDemoAssignment,
} from '../services/assignment.service';
import {
  canEditAssignment,
  hasAssignmentFields,
  type AssignmentOptions,
  type AssignmentPatch,
  type AssignmentSelection,
} from '../types/assignment';
import type { IncidentDetail } from '../types/incident';

export type AssignmentMode = { token: string } | { demoOptions: AssignmentOptions };

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

export function buildAssignmentPatch(
  incident: IncidentDetail,
  selection: AssignmentSelection,
  comments = '',
): AssignmentPatch {
  const patch: AssignmentPatch = {};
  if (incident.departmentId !== selection.departmentId) patch.departmentId = selection.departmentId;
  if (incident.teamId !== selection.teamId) patch.teamId = selection.teamId;
  if (incident.technicianId !== selection.technicianId) patch.technicianId = selection.technicianId;
  if (incident.status === 'reopened' && selection.teamId && !hasAssignmentFields(patch)) {
    patch.teamId = selection.teamId;
  }
  const cause = comments.trim();
  if (cause && hasAssignmentFields(patch)) patch.cause = cause;
  return patch;
}

export function isValidSelection(
  { departmentId, teamId, technicianId }: AssignmentSelection,
  options: AssignmentOptions,
): boolean {
  if (!departmentId || !teamId) return false;

  return options.departments.some((department) => department.id === departmentId)
    && options.teams.some((team) => team.id === teamId && team.departmentId === departmentId)
    && (technicianId === null
      || options.technicians.some((technician) => technician.id === technicianId && technician.teamId === teamId));
}

export function useIncidentAssignment(
  incident: IncidentDetail,
  mode: AssignmentMode,
  disabled: boolean,
  onSaved: (incident: IncidentDetail) => void,
  onSavingChange?: (saving: boolean) => void,
) {
  const token = 'token' in mode ? mode.token : null;
  const demoOptions = 'demoOptions' in mode ? mode.demoOptions : null;
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalog, setCatalog] = useState<{
    token: string;
    attempt: number;
    options: AssignmentOptions | null;
    error: Error | null;
  } | null>(null);
  const [selection, setSelection] = useState(() => selectionOf(incident));
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchAssignmentOptions(token).then(
      (options) => {
        if (active) setCatalog({ token, attempt: catalogAttempt, options, error: null });
      },
      (error: unknown) => {
        if (active) setCatalog({ token, attempt: catalogAttempt, options: null, error: normalizeError(error) });
      },
    );
    return () => { active = false; };
  }, [token, catalogAttempt]);

  const currentCatalog = catalog?.token === token && catalog.attempt === catalogAttempt ? catalog : null;
  const options = demoOptions ?? currentCatalog?.options ?? null;
  const catalogError = currentCatalog?.error ?? null;
  const error = saveError ?? catalogError;
  const conflict = saveError instanceof AssignmentConflictError;
  const accessStatus = error instanceof AssignmentAccessError ? error.status : null;
  const teams = options?.teams.filter((team) => team.departmentId === selection.departmentId) ?? [];
  const technicians = options?.technicians.filter((technician) => technician.teamId === selection.teamId) ?? [];
  const patch = buildAssignmentPatch(incident, selection, comments);
  const canSave = Boolean(
    !disabled && !saving && !conflict && accessStatus === null && canEditAssignment(incident.status)
    && options && isValidSelection(selection, options) && hasAssignmentFields(patch),
  );

  const save = async (): Promise<void> => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    onSavingChange?.(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = token
        ? await saveBackendAssignment(incident.id, patch, token)
        : await saveDemoAssignment(patch);
      setSelection(selectionOf(updated));
      setComments('');
      onSaved(updated);
      setSaved(true);
    } catch (error) {
      setSaveError(normalizeError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const updateSelection = (update: (current: AssignmentSelection) => AssignmentSelection) => {
    setSelection(update);
    setSaved(false);
  };

  return {
    options, selection, comments, teams, technicians, saving, canSave, saved, save, conflict, accessStatus,
    loading: Boolean(token && !currentCatalog),
    catalogError,
    error: saveError ? `${saveError.message} No se ha guardado la asignación.` : catalogError?.message,
    retryCatalog: () => setCatalogAttempt((attempt) => attempt + 1),
    setDepartment: (id: string | null) => updateSelection((current) => changeDepartment(current, id)),
    setTeam: (id: string | null) => updateSelection((current) => changeTeam(current, id)),
    setTechnician: (id: string | null) => updateSelection((current) => ({ ...current, technicianId: id })),
    setComments: (text: string) => {
      setComments(text);
      setSaved(false);
    },
  };
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error('No se pudo completar la operación.');
}
