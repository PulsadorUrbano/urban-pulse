import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Category, normalizeCategoryName } from './category.js';

const seedNames = [
  'Iluminación',
  'Limpieza',
  'Vía pública',
  'Movilidad',
  'Zonas verdes',
];

@Injectable()
export class CategoriesService {
  private readonly categories = new Map<string, Category>();

  constructor() {
    for (const name of seedNames) {
      this.create(name);
    }
  }

  resolve(name: string): Category {
    const normalizedName = normalizeCategoryName(name);
    const category = this.categories.get(normalizedName);

    return this.copy(category ?? this.create(name.trim()));
  }

  private create(name: string): Category {
    const category: Category = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    this.categories.set(normalizeCategoryName(name), category);
    return category;
  }

  private copy(category: Category): Category {
    return { ...category };
  }
}
