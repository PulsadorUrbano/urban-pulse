export type IncidentStatus =
  | 'reported'
  | 'rejected'
  | 'validated'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'closed';

export const DEFAULT_INCIDENT_STATUS: IncidentStatus = 'reported';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  createdAt: string;
  civicId: string | null;
  locationId: string | null;
  urbanAssetId: string | null;
  categoryId: string | null;
  category: string | null;
  departmentId: string | null;
  teamId: string | null;
  technicianId: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  categoryId?: string | null;
  category?: string | null;
  locationId?: string | null;
}
