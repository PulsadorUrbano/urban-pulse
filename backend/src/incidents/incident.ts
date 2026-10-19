import type { Category } from './category.js';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface IncidentImage {
  id: string;
  url: string;
  mimeType: UploadedImageFile['mimetype'];
  createdAt: string;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  civicId: string;
  categoryName: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  urbanAssetId?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  civicId: string;
  category: Category;
  urbanAssetId: string | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    createdAt: string;
  };
  images: IncidentImage[];
  status: 'reported';
  priority: 'low';
  createdAt: string;
}
