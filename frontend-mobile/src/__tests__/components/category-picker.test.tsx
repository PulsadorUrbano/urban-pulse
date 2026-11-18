/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CategoryPicker, type CategoryPickerProps } from '@/components/category-picker';
import type { Category } from '@/types/category';

const categories: Category[] = [
  { id: '1', name: 'Transporte' },
  { id: '2', name: 'Alumbrado público' },
  { id: '3', name: 'Objetos urbanos' },
];

// Construye las props por defecto del componente y permite sobreescribirlas.
async function renderCategoryPicker(overrides: Partial<CategoryPickerProps> = {}) {
  const props: CategoryPickerProps = {
    categories,
    selectedCategoryId: null,
    isLoading: false,
    errorMessage: null,
    onSelectCategory: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };

  const renderResult = await render(<CategoryPicker {...props} />);

  return { props, renderResult };
}

describe('CategoryPicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sin selección muestra "Añadir categoría +" en un único texto', async () => {
    await renderCategoryPicker();

    // El trigger sin selección es un único ThemedText con el texto completo.
    expect(screen.getByLabelText('Añadir categoría')).toBeOnTheScreen();
    expect(screen.getByText('Añadir categoría +')).toBeOnTheScreen();
  });

  it('al pulsar "Añadir categoría" abre la hoja solo con las categorías del catálogo (sin "Otros")', async () => {
    const user = userEvent.setup();
    await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));

    expect(screen.getByText('Transporte')).toBeOnTheScreen();
    expect(screen.getByText('Alumbrado público')).toBeOnTheScreen();
    expect(screen.getByText('Objetos urbanos')).toBeOnTheScreen();
    // El backend rechaza categorías de texto libre: ya no se ofrece "Otros".
    expect(screen.queryByText('Otros')).toBeNull();
    expect(screen.queryByLabelText('Categoría personalizada')).toBeNull();
  });

  it('al pulsar una categoría existente llama a onSelectCategory con su id', async () => {
    const user = userEvent.setup();
    const { props } = await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));
    await user.press(screen.getByRole('button', { name: 'Categoría Transporte' }));

    expect(props.onSelectCategory).toHaveBeenCalledWith('1');
  });

  it('con muchas categorías la hoja acota su altura', async () => {
    const manyCategories: Category[] = Array.from({ length: 30 }, (_, index) => ({
      id: String(index + 1),
      name: `Categoría ${index + 1}`,
    }));
    const user = userEvent.setup();
    await renderCategoryPicker({ categories: manyCategories });

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));

    const sheetStyle = StyleSheet.flatten(
      screen.getByText('Elige una categoría').parent?.props.style,
    );
    expect(sheetStyle.maxHeight).toBeGreaterThan(0);
  });

  it('con una categoría seleccionada muestra su nombre y "Quitar categoría" llama a onClear', async () => {
    const user = userEvent.setup();
    const { props } = await renderCategoryPicker({ selectedCategoryId: '2' });

    expect(screen.getByText('Alumbrado público')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Quitar categoría' }));

    expect(props.onClear).toHaveBeenCalledTimes(1);
  });
});
