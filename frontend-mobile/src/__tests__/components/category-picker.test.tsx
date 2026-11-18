/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  CategoryPicker,
  MAX_CUSTOM_CATEGORY_LENGTH,
  type CategoryPickerProps,
} from '@/components/category-picker';
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
    customCategory: '',
    isLoading: false,
    errorMessage: null,
    onSelectCategory: jest.fn(),
    onSelectOther: jest.fn(),
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

  it('al pulsar "Añadir categoría" abre la hoja con las categorías y la opción "Otros"', async () => {
    const user = userEvent.setup();
    await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));

    expect(screen.getByText('Transporte')).toBeOnTheScreen();
    expect(screen.getByText('Otros')).toBeOnTheScreen();
  });

  it('al pulsar una categoría existente llama a onSelectCategory con su id', async () => {
    const user = userEvent.setup();
    const { props } = await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));
    await user.press(screen.getByRole('button', { name: 'Categoría Transporte' }));

    expect(props.onSelectCategory).toHaveBeenCalledWith('1');
  });

  it('al pulsar "Otros" abre el modal, deshabilita "Guardar" vacío y confirma el texto', async () => {
    const user = userEvent.setup();
    const { props } = await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));
    await user.press(screen.getByRole('button', { name: 'Categoría Otros' }));

    const input = screen.getByLabelText('Categoría personalizada');
    expect(input).toBeOnTheScreen();

    const saveButton = screen.getByRole('button', {
      name: 'Guardar categoría personalizada',
    });
    expect(saveButton).toBeDisabled();

    await user.type(input, 'Vallado caído');
    await user.press(saveButton);

    expect(props.onSelectOther).toHaveBeenCalledWith('Vallado caído');
  });

  it('el TextInput de "Otros" limita la longitud con MAX_CUSTOM_CATEGORY_LENGTH (15)', async () => {
    const user = userEvent.setup();
    await renderCategoryPicker();

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));
    await user.press(screen.getByRole('button', { name: 'Categoría Otros' }));

    expect(MAX_CUSTOM_CATEGORY_LENGTH).toBe(15);
    expect(screen.getByLabelText('Categoría personalizada')).toHaveProp(
      'maxLength',
      MAX_CUSTOM_CATEGORY_LENGTH,
    );
  });

  it('con muchas categorías la hoja acota su altura y "Otros" sigue accesible fuera de la lista', async () => {
    const manyCategories: Category[] = Array.from({ length: 30 }, (_, index) => ({
      id: String(index + 1),
      name: `Categoría ${index + 1}`,
    }));
    const user = userEvent.setup();
    await renderCategoryPicker({ categories: manyCategories });

    await user.press(screen.getByRole('button', { name: 'Añadir categoría' }));

    // "Otros" está fuera del FlatList, por lo que no depende del scroll de la lista.
    expect(screen.getByRole('button', { name: 'Categoría Otros' })).toBeOnTheScreen();
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

  it('con una categoría personalizada guardada muestra su texto', async () => {
    await renderCategoryPicker({ customCategory: 'Vallado caído' });

    expect(screen.getByText('Vallado caído')).toBeOnTheScreen();
  });
});
