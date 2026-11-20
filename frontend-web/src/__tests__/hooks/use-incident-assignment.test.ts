import { describe, expect, it } from 'vitest';

import {
  buildAssignmentPatch, changeDepartment, changeTeam, isValidSelection,
} from '../../hooks/use-incident-assignment';
import { loadMockAssignment, MOCK_INCIDENT_ID } from '../../mocks/assignment-mock';
import { canEditAssignment } from '../../types/assignment';

const { incident, options } = loadMockAssignment(MOCK_INCIDENT_ID);
const departmentId = options.departments[0].id;
const teamId = options.teams[0].id;
const technicianId = options.technicians[0].id;

describe('selección jerárquica de asignación', () => {
  it('solo permite editar incidencias validadas, asignadas o reabiertas', () => {
    expect(canEditAssignment('validated')).toBe(true);
    expect(canEditAssignment('assigned')).toBe(true);
    expect(canEditAssignment('reopened')).toBe(true);
    expect(canEditAssignment('reported')).toBe(false);
    expect(canEditAssignment('rejected')).toBe(false);
    expect(canEditAssignment('in_progress')).toBe(false);
    expect(canEditAssignment('resolved')).toBe(false);
    expect(canEditAssignment('closed')).toBe(false);
  });

  it('limpia equipo y técnico al cambiar o quitar departamento', () => {
    const selection = { departmentId, teamId, technicianId };
    expect(changeDepartment(selection, options.departments[1].id)).toEqual({
      departmentId: options.departments[1].id, teamId: null, technicianId: null,
    });
    expect(changeDepartment(selection, null)).toEqual({ departmentId: null, teamId: null, technicianId: null });
  });

  it('limpia técnico al cambiar equipo y conserva departamento', () => {
    expect(changeTeam({ departmentId, teamId, technicianId }, null)).toEqual({
      departmentId, teamId: null, technicianId: null,
    });
  });

  it('construye un parche solo con los campos modificados, incluido null', () => {
    const assigned = { ...incident, departmentId, teamId, technicianId };
    expect(buildAssignmentPatch(assigned, { departmentId, teamId, technicianId: null })).toEqual({ technicianId: null });
    expect(buildAssignmentPatch(incident, { departmentId, teamId: null, technicianId: null })).toEqual({ departmentId });
    expect(buildAssignmentPatch(incident, { departmentId: null, teamId: null, technicianId: null })).toEqual({});
  });

  it('envía el equipo actual al reasignar una reabierta sin cambiar la selección', () => {
    const selection = { departmentId, teamId, technicianId };
    const reopened = { ...incident, ...selection, status: 'reopened' as const };

    expect(buildAssignmentPatch(reopened, selection)).toEqual({ teamId });
    expect(buildAssignmentPatch(reopened, { ...selection, technicianId: null })).toEqual({ technicianId: null });
    expect(buildAssignmentPatch({ ...reopened, status: 'assigned' }, selection)).toEqual({});
  });

  it('exige departamento y equipo y admite una asignación sin técnico', () => {
    const selection = { departmentId, teamId, technicianId };

    expect(isValidSelection({ departmentId, teamId, technicianId: null }, options)).toBe(true);
    expect(isValidSelection({ departmentId: null, teamId: null, technicianId: null }, options)).toBe(false);
    expect(isValidSelection(changeDepartment(selection, options.departments[1].id), options)).toBe(false);
    expect(isValidSelection(changeTeam(selection, null), options)).toBe(false);
  });

  it('rechaza un equipo o técnico ajeno a la cadena elegida', () => {
    expect(isValidSelection({ departmentId, teamId, technicianId }, options)).toBe(true);
    expect(isValidSelection({ departmentId, teamId: options.teams[1].id, technicianId: null }, options)).toBe(false);
    expect(isValidSelection({ departmentId, teamId, technicianId: options.technicians[1].id }, options)).toBe(false);
  });
});
