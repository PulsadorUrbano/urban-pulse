import { describe, expect, it } from 'vitest';

import { buildAssignmentPatch, changeDepartment, changeTeam, isValidSelection } from '../../hooks/use-incident-assignment';
import { loadMockAssignment, MOCK_INCIDENT_ID } from '../../mocks/assignment-mock';

const { incident, options } = loadMockAssignment(MOCK_INCIDENT_ID);
const departmentId = options.departments[0].id;
const teamId = options.teams[0].id;
const technicianId = options.technicians[0].id;

describe('selección jerárquica de asignación', () => {
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

  it('rechaza un equipo o técnico ajeno a la cadena elegida', () => {
    expect(isValidSelection({ departmentId, teamId, technicianId }, options)).toBe(true);
    expect(isValidSelection({ departmentId, teamId: options.teams[1].id, technicianId: null }, options)).toBe(false);
    expect(isValidSelection({ departmentId, teamId, technicianId: options.technicians[1].id }, options)).toBe(false);
  });
});
