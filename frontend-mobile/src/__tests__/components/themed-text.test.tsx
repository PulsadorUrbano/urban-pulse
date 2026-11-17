/// <reference types="jest" />
import { StyleSheet } from 'react-native';

import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Se mockea el hook de esquema de color para controlar modo claro/oscuro de forma determinista.
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const TEST_ID = 'themed-text';

// Devuelve el estilo final aplanado del Text renderizado.
function getFlattenedStyle() {
  return StyleSheet.flatten(screen.getByTestId(TEST_ID).props.style);
}

describe('ThemedText', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el texto pasado como children', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedText>Hola mundo</ThemedText>);

    expect(screen.getByText('Hola mundo')).toBeOnTheScreen();
  });

  it('en modo claro usa el color de texto del tema claro por defecto', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedText testID={TEST_ID}>Hola</ThemedText>);

    expect(getFlattenedStyle().color).toBe(Colors.light.text);
  });

  it('en modo oscuro usa el color de texto del tema oscuro por defecto', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    await render(<ThemedText testID={TEST_ID}>Hola</ThemedText>);

    expect(getFlattenedStyle().color).toBe(Colors.dark.text);
  });

  it('con themeColor="textSecondary" resuelve el color secundario en modo claro', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedText testID={TEST_ID} themeColor="textSecondary">
        Hola
      </ThemedText>,
    );

    expect(getFlattenedStyle().color).toBe(Colors.light.textSecondary);
  });

  it('con themeColor="textSecondary" resuelve el color secundario en modo oscuro', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    await render(
      <ThemedText testID={TEST_ID} themeColor="textSecondary">
        Hola
      </ThemedText>,
    );

    expect(getFlattenedStyle().color).toBe(Colors.dark.textSecondary);
  });

  it('con themeColor="error" usa el mismo color fijo en ambos modos', async () => {
    mockedUseColorScheme.mockReturnValue('light');
    const { rerender } = await render(
      <ThemedText testID={TEST_ID} themeColor="error">
        Hola
      </ThemedText>,
    );
    expect(getFlattenedStyle().color).toBe(Colors.light.error);

    mockedUseColorScheme.mockReturnValue('dark');
    await rerender(
      <ThemedText testID={TEST_ID} themeColor="error">
        Hola
      </ThemedText>,
    );
    expect(getFlattenedStyle().color).toBe(Colors.dark.error);
  });

  it('aplica un style adicional sin perder el estilo base del type', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedText testID={TEST_ID} style={{ marginTop: 10 }}>
        Hola
      </ThemedText>,
    );

    const flattenedStyle = getFlattenedStyle();
    // El estilo base del type "default" debe seguir presente.
    expect(flattenedStyle.fontSize).toBe(16);
    expect(flattenedStyle.lineHeight).toBe(24);
    // El style adicional se mezcla sin sobrescribir lo anterior.
    expect(flattenedStyle.marginTop).toBe(10);
  });

  it.each([
    ['default', { fontSize: 16, lineHeight: 24, fontWeight: 500 }],
    ['title', { fontSize: 48, fontWeight: 600, lineHeight: 52 }],
    ['small', { fontSize: 14, lineHeight: 20, fontWeight: 500 }],
    ['smallBold', { fontSize: 14, lineHeight: 20, fontWeight: 700 }],
    ['subtitle', { fontSize: 32, lineHeight: 44, fontWeight: 600 }],
    ['link', { lineHeight: 30, fontSize: 14 }],
  ] as const)('con type="%s" aplica los estilos esperados', async (type, expectedStyle) => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedText testID={TEST_ID} type={type}>
        Hola
      </ThemedText>,
    );

    const flattenedStyle = getFlattenedStyle();
    for (const [property, value] of Object.entries(expectedStyle)) {
      expect(flattenedStyle[property as keyof typeof flattenedStyle]).toBe(value);
    }
  });

  it('con type="serifTitle" aplica la fuente serif y el tamaño de título grande', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedText testID={TEST_ID} type="serifTitle">
        Hola
      </ThemedText>,
    );

    const flattenedStyle = getFlattenedStyle();
    expect(flattenedStyle.fontSize).toBe(40);
    expect(flattenedStyle.lineHeight).toBe(60);
    expect(flattenedStyle.fontFamily).toBeDefined();
  });

  it('usa el type "default" cuando no se especifica ninguno', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedText testID={TEST_ID}>Hola</ThemedText>);

    const flattenedStyle = getFlattenedStyle();
    expect(flattenedStyle.fontSize).toBe(16);
    expect(flattenedStyle.lineHeight).toBe(24);
  });
});
