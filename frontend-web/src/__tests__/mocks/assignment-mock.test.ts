import { expect, it } from 'vitest';

import { loadMockAssignment, MOCK_INCIDENT_ID, saveMockAssignment } from '../../mocks/assignment-mock';

it('exige departamento y equipo en la demo y permite retirar el técnico', () => {
  const { incident, options } = loadMockAssignment(MOCK_INCIDENT_ID);
  const departmentId = options.departments[0].id;
  const teamId = options.teams[0].id;
  const technicianId = options.technicians[0].id;

  expect(() => saveMockAssignment({ departmentId })).toThrow('Selecciona un departamento y un equipo');
  expect(loadMockAssignment(MOCK_INCIDENT_ID).incident).toEqual(incident);

  const assigned = saveMockAssignment({ departmentId, teamId });
  expect(assigned).toMatchObject({ departmentId, teamId, technicianId: null, status: 'assigned' });
  expect(saveMockAssignment({ technicianId }).technicianId).toBe(technicianId);
  expect(saveMockAssignment({ technicianId: null })).toEqual(assigned);

  expect(() => saveMockAssignment({ departmentId: null })).toThrow('Selecciona un departamento y un equipo');
  expect(() => saveMockAssignment({ teamId: null })).toThrow('Selecciona un departamento y un equipo');
  expect(() => saveMockAssignment({ departmentId: options.departments[1].id })).toThrow(
    'Selecciona un departamento y un equipo',
  );
  expect(loadMockAssignment(MOCK_INCIDENT_ID).incident).toEqual(assigned);
});
