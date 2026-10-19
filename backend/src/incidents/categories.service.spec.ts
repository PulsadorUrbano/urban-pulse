import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
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
