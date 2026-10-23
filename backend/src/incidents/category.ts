export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase();
}
