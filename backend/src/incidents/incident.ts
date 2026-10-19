export interface Incident {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  urbanAssetId: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'reported';
  priority: 'low';
  createdAt: string;
}
