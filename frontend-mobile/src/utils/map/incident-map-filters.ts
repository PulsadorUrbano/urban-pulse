import type { IncidentStatus } from '@/types/incident';
import type {
  IncidentAgeFilter,
  IncidentMapFilters,
  MapIncident,
} from '@/types/incident-map';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const AGE_FILTER_DAYS: Record<Exclude<IncidentAgeFilter, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

// Una incidencia está sin resolver salvo que esté resuelta o cerrada
// (las rechazadas se consideran visibles).
export function isUnresolvedIncident(status: IncidentStatus): boolean {
  return status !== 'resolved' && status !== 'closed';
}

// Indica si la fecha de creación cae dentro de la ventana de antigüedad
// (límite inclusive). Fechas inválidas se excluyen salvo con 'all'.
export function isWithinAge(
  createdAt: string,
  age: IncidentAgeFilter,
  now: Date,
): boolean {
  if (age === 'all') return true;
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  const limitTime = now.getTime() - AGE_FILTER_DAYS[age] * MILLISECONDS_PER_DAY;
  return createdTime >= limitTime;
}

export function applyIncidentMapFilters(
  incidentList: MapIncident[],
  filters: IncidentMapFilters,
  now: Date,
): MapIncident[] {
  return incidentList.filter((incident) => {
    if (!isUnresolvedIncident(incident.status)) return false;
    if (!isWithinAge(incident.createdAt, filters.age, now)) return false;
    if (filters.categoryIds.length === 0) return true;
    return (
      incident.categoryId !== null &&
      filters.categoryIds.includes(incident.categoryId)
    );
  });
}
