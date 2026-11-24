import type { IncidentDetail, IncidentStatus } from './incident';

export type AssignmentSelection = Pick<IncidentDetail, 'departmentId' | 'teamId' | 'technicianId'>;
export type AssignmentPatch = Partial<AssignmentSelection> & { cause?: string };

export function hasAssignmentFields({ departmentId, teamId, technicianId }: AssignmentPatch): boolean {
  return departmentId !== undefined || teamId !== undefined || technicianId !== undefined;
}

export interface AssignmentOptions {
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string }[];
  technicians: { id: string; name: string; teamId: string }[];
}

export function canEditAssignment(status: IncidentStatus): boolean {
  return status === 'validated' || status === 'assigned' || status === 'reopened';
}
