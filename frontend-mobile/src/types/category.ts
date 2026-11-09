export interface Category {
  id: string;
  name: string;
}

// Origen del catálogo devuelto por fetchCategories: 'backend' si vino del
// backend real, 'mock' si se usó el fallback tras un fallo del backend.
export type CategorySource = 'backend' | 'mock';

export interface FetchCategoriesResult {
  categories: Category[];
  source: CategorySource;
  backendErrorMessage: string | null;
}
