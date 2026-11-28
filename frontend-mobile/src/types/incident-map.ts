import type {
  CreatedIncidentImage,
  IncidentSource,
  IncidentStatus,
} from './incident';

// Incidencia propia lista para pintarse en el mapa: siempre tiene coordenadas.
export interface MapIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  category: string | null;
  categoryId: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  images: CreatedIncidentImage[];
}

// Filtro de antigüedad: últimos 7, 30 o 90 días, o sin límite.
export type IncidentAgeFilter = '7d' | '30d' | '90d' | 'all';

export interface IncidentMapFilters {
  age: IncidentAgeFilter;
  // Lista vacía = todas las categorías.
  categoryIds: string[];
}

// Resultado de fetchMyMapIncidents: incluye el origen para el aviso de fallback.
export interface FetchMapIncidentsResult {
  incidents: MapIncident[];
  source: IncidentSource;
}
