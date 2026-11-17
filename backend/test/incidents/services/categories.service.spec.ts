import type { PrismaService } from '../../../src/prisma/prisma.service.js';
import { CategoriesService } from '../../../src/incidents/categories.service.js';

describe('Catálogo persistido de categorías', () => {
  it('mantiene el orden conocido del catálogo inicial', async () => {
    const fecha = new Date('2026-11-17T00:00:00.000Z');
    const findMany = vi.fn().mockResolvedValue([
      { id: '2', name: 'Limpieza', createdAt: fecha },
      { id: '1', name: 'Iluminación', createdAt: fecha },
    ]);
    const prisma = { category: { findMany } } as unknown as PrismaService;

    expect(
      (await new CategoriesService(prisma).findAll()).map((c) => c.name),
    ).toEqual(['Iluminación', 'Limpieza']);
  });

  it('lee los identificadores almacenados, también desde otra instancia', async () => {
    const fila = {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Iluminación',
      normalizedName: 'iluminación',
      createdAt: new Date('2026-11-17T00:00:00.000Z'),
    };
    const findMany = vi.fn().mockResolvedValue([fila]);
    const prisma = { category: { findMany } } as unknown as PrismaService;

    const primera = new CategoriesService(prisma);
    const segunda = new CategoriesService(prisma);
    expect(await primera.findAll()).toEqual([
      { id: fila.id, name: fila.name, createdAt: fila.createdAt.toISOString() },
    ]);
    expect(await segunda.findAll()).toEqual(await primera.findAll());
    expect(findMany).toHaveBeenCalledTimes(3);
  });

  it('resuelve un mismo nombre al identificador persistido', async () => {
    const fila = {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Iluminación',
      createdAt: new Date('2026-11-17T00:00:00.000Z'),
    };
    const upsert = vi.fn().mockResolvedValue(fila);
    const prisma = { category: { upsert } } as unknown as PrismaService;
    const primera = new CategoriesService(prisma);
    const segunda = new CategoriesService(prisma);

    expect(await primera.resolve(' iluminación ')).toEqual(
      await segunda.resolve('ILUMINACIÓN'),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { normalizedName: 'iluminación' } }),
    );
  });
});
