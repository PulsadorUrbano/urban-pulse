/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { CategoryPicker, type CategoryPickerProps } from './category-picker';
import type { Category } from '@/types/category';

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

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
