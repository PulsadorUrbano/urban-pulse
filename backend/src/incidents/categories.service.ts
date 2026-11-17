import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Category, normalizeCategoryName } from './category.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(): Promise<Category[]> {
    try {
      const categorias = await this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ code: 'asc' }],
      });
      return categorias.map(({ id, name, createdAt }) => ({
        id,
        name,
        createdAt: createdAt.toISOString(),
      }));
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar el catálogo');
    }
  }
  async resolve(name: string): Promise<Category> {
    try {
      const categoria = await this.prisma.category.findUnique({
        where: { normalizedName: normalizeCategoryName(name) },
      });
      if (!categoria?.isActive)
        throw new BadRequestException(
          'La categoría no pertenece al catálogo activo',
        );
      return {
        id: categoria.id,
        name: categoria.name,
        createdAt: categoria.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('No se pudo consultar el catálogo');
    }
  }
}
