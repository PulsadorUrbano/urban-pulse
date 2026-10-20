import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
  it('lists seed categories and categories resolved later', () => {
    const categories = new CategoriesService();
    expect(categories.findAll().map((category) => category.name)).toEqual([
      'Iluminación',
      'Limpieza',
      'Vía pública',
      'Movilidad',
      'Zonas verdes',
    ]);
    const added = categories.resolve('Señalización');
    expect(categories.findAll()).toContainEqual(added);
  });

  it('returns copies without exposing the stored catalog', () => {
    const categories = new CategoriesService();
    const result = categories.findAll();
    result[0].name = 'Changed externally';
    result.pop();
    expect(categories.findAll()).toHaveLength(5);
    expect(categories.findAll()[0].name).toBe('Iluminación');
  });

  it('reuses a seeded category after trimming and case normalization', () => {
    const categories = new CategoriesService();

    expect(categories.resolve(' iluminación ')).toEqual(
      categories.resolve('ILUMINACIÓN'),
    );
  });

  it('creates a category for an unmatched normalized name', () => {
    const categories = new CategoriesService();

    expect(categories.resolve(' Señalización ')).toMatchObject({
      name: 'Señalización',
    });
  });
});
