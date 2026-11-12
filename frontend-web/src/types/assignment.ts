import type { IncidentDetail } from './incident';

export type AssignmentSelection = Pick<IncidentDetail, 'departmentId' | 'teamId' | 'technicianId'>;
export type AssignmentPatch = Partial<AssignmentSelection>;

export interface AssignmentOptions {
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; departmentId: string }[];
  technicians: { id: string; name: string; teamId: string }[];
}

export type AssignmentSource = 'backend' | 'mock';
