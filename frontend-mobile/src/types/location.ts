export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface Location extends LocationCoordinates {
  id: string;
  createdAt: string;
}
