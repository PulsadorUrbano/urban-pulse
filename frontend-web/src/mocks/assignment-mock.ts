import type { AssignmentOptions, AssignmentPatch } from '../types/assignment';
import type { IncidentDetail } from '../types/incident';

export const MOCK_INCIDENT_ID = '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5';

const INITIAL_INCIDENT: IncidentDetail = {
  id: MOCK_INCIDENT_ID,
  title: 'Farola apagada en la avenida principal',
  description: 'La farola no ilumina el paso de peatones.',
  civicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  categoryId: null,
  category: 'Iluminación',
  urbanAssetId: null,
  departmentId: null,
  teamId: null,
  technicianId: null,
  location: { latitude: 36.7213, longitude: -4.4214, accuracy: 8, createdAt: '2026-11-12T08:00:00.000Z' },
  images: [],
  status: 'validated',
  priority: 'medium',
  createdAt: '2026-11-12T08:00:00.000Z',
};

const OPTIONS: AssignmentOptions = {
  departments: [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Infraestructuras' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Parques y jardines' },
  ],
  teams: [
    { id: '33333333-3333-4333-8333-333333333333', name: 'Alumbrado', departmentId: '11111111-1111-4111-8111-111111111111' },
    { id: '44444444-4444-4444-8444-444444444444', name: 'Jardinería', departmentId: '22222222-2222-4222-8222-222222222222' },
  ],
  technicians: [
    { id: '55555555-5555-4555-8555-555555555555', name: 'tecnico.alumbrado', teamId: '33333333-3333-4333-8333-333333333333' },
    { id: '66666666-6666-4666-8666-666666666666', name: 'tecnico.jardines', teamId: '44444444-4444-4444-8444-444444444444' },
  ],
};

let incident = { ...INITIAL_INCIDENT };

export function loadMockAssignment(id: string): { incident: IncidentDetail; options: AssignmentOptions } {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('El UUID de la incidencia de demostración no es válido.');
  }
  if (id.toLowerCase() !== MOCK_INCIDENT_ID) throw new Error('La incidencia de demostración no existe.');
  return { incident: { ...incident }, options: structuredClone(OPTIONS) };
}

export function saveMockAssignment(patch: AssignmentPatch): IncidentDetail {
  if (incident.status !== 'validated' && incident.status !== 'assigned') {
    throw new Error('La incidencia de demostración no admite asignaciones.');
  }
  const departmentId = patch.departmentId === undefined ? incident.departmentId : patch.departmentId;
  const teamId = patch.teamId === undefined
    ? departmentId === incident.departmentId ? incident.teamId : null
    : patch.teamId;
  const technicianId = patch.technicianId === undefined
    ? teamId === incident.teamId && departmentId === incident.departmentId ? incident.technicianId : null
    : patch.technicianId;
  if (departmentId && !OPTIONS.departments.some((department) => department.id === departmentId)) {
    throw new Error('El departamento no existe.');
  }
  if (teamId && !OPTIONS.teams.some((team) => team.id === teamId && team.departmentId === departmentId)) {
    throw new Error('El equipo no pertenece al departamento.');
  }
  if (technicianId && !OPTIONS.technicians.some((technician) => technician.id === technicianId && technician.teamId === teamId)) {
    throw new Error('El técnico no pertenece al equipo.');
  }
  incident = { ...incident, departmentId, teamId, technicianId };
  return { ...incident };
}
