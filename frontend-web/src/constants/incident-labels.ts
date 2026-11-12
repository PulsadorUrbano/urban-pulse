import type { IncidentPriority, IncidentStatus } from '../types/incident';

export const PRIORITY_LABELS: Record<IncidentPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Pendiente de validar',
  validated: 'Validada',
  rejected: 'Descartada',
  assigned: 'Asignada',
};
