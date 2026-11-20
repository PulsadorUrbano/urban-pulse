import type { IncidentPriority, IncidentSortOrder, IncidentStatus } from '../types/incident';

export const PRIORITY_LABELS: Record<IncidentPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Pendiente de validar',
  validated: 'Validada',
  rejected: 'Descartada',
  assigned: 'Asignada',
  in_progress: 'En progreso',
  resolved: 'Resuelta',
  reopened: 'Reabierta',
  closed: 'Cerrada',
};

// Orden de las opciones del filtro de estado: el flujo habitual de una incidencia y, al final, la descartada.
export const STATUS_FILTER_OPTIONS: readonly IncidentStatus[] = [
  'reported',
  'validated',
  'assigned',
  'in_progress',
  'resolved',
  'reopened',
  'closed',
  'rejected',
];

export const SORT_ORDER_LABELS: Record<IncidentSortOrder, string> = {
  newest: 'Más recientes primero',
  oldest: 'Más antiguas primero',
};
