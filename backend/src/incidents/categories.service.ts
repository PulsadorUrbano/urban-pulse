import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Category, normalizeCategoryName } from './category.js';

const ordenInicial = [
  'iluminación',
  'limpieza',
  'vía pública',
  'movilidad',
  'zonas verdes',
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    try {
      const categories = await this.prisma.category.findMany({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      return categories
        .sort((a, b) => {
          const primero = ordenInicial.indexOf(normalizeCategoryName(a.name));
          const segundo = ordenInicial.indexOf(normalizeCategoryName(b.name));
          return (
            (primero < 0 ? ordenInicial.length : primero) -
            (segundo < 0 ? ordenInicial.length : segundo)
          );
        })
        .map(({ id, name, createdAt }) => ({
          id,
          name,
          createdAt: createdAt.toISOString(),
        }));
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar el catálogo');
    }
  }

  async resolve(name: string): Promise<Category> {
    const normalizedName = normalizeCategoryName(name);
    try {
      const category = await this.prisma.category.upsert({
        where: { normalizedName },
        update: {},
        create: { name: name.trim(), normalizedName },
      });
      return {
        id: category.id,
        name: category.name,
        createdAt: category.createdAt.toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('No se pudo guardar la categoría');
    }
  }
}
