import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';
import { CategoriesService } from '../../../src/incidents/categories.service.js';
describe('Catálogo controlado', () => {
  const fecha = new Date();
  const fila = {
    id: 'categoria',
    name: 'Alumbrado público',
    createdAt: fecha,
    isActive: true,
  };
  it('consulta solo categorías activas y devuelve el contrato existente', async () => {
    const findMany = vi.fn().mockResolvedValue([fila]);
    const servicio = new CategoriesService({
      category: { findMany },
    } as unknown as PrismaService);
    expect(await servicio.findAll()).toEqual([
      { id: fila.id, name: fila.name, createdAt: fecha.toISOString() },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ code: 'asc' }],
    });
  });
  it.each([null, { ...fila, isActive: false }])(
    'no crea categorías ausentes o inactivas',
    async (resultado) => {
      const findUnique = vi.fn().mockResolvedValue(resultado);
      const servicio = new CategoriesService({
        category: { findUnique },
      } as unknown as PrismaService);
      await expect(servicio.resolve('inventada')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
