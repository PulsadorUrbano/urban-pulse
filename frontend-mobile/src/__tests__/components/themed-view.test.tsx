/// <reference types="jest" />
import { StyleSheet, Text } from 'react-native';

import { render, screen } from '@testing-library/react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Se mockea el hook de esquema de color para controlar modo claro/oscuro de forma determinista.
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const TEST_ID = 'themed-view';

// Devuelve el estilo final aplanado de la View renderizada.
function getFlattenedStyle() {
  return StyleSheet.flatten(screen.getByTestId(TEST_ID).props.style);
}

describe('ThemedView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza los children pasados por props', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedView>
        <Text>Contenido</Text>
      </ThemedView>,
    );

    expect(screen.getByText('Contenido')).toBeOnTheScreen();
  });

  it('en modo claro usa el color de fondo del tema claro por defecto', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedView testID={TEST_ID} />);

    expect(getFlattenedStyle().backgroundColor).toBe(Colors.light.background);
  });

  it('en modo oscuro usa el color de fondo del tema oscuro por defecto', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    await render(<ThemedView testID={TEST_ID} />);

    expect(getFlattenedStyle().backgroundColor).toBe(Colors.dark.background);
  });

  it('con type="backgroundElement" resuelve el color correspondiente en modo claro', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedView testID={TEST_ID} type="backgroundElement" />);

    expect(getFlattenedStyle().backgroundColor).toBe(Colors.light.backgroundElement);
  });

  it('con type="backgroundElement" resuelve el color correspondiente en modo oscuro', async () => {
    mockedUseColorScheme.mockReturnValue('dark');

    await render(<ThemedView testID={TEST_ID} type="backgroundElement" />);

    expect(getFlattenedStyle().backgroundColor).toBe(Colors.dark.backgroundElement);
  });

  it('con type="backgroundSelected" resuelve el color correspondiente en ambos modos', async () => {
    mockedUseColorScheme.mockReturnValue('light');
    const { rerender } = await render(
      <ThemedView testID={TEST_ID} type="backgroundSelected" />,
    );
    expect(getFlattenedStyle().backgroundColor).toBe(Colors.light.backgroundSelected);

    mockedUseColorScheme.mockReturnValue('dark');
    await rerender(<ThemedView testID={TEST_ID} type="backgroundSelected" />);
    expect(getFlattenedStyle().backgroundColor).toBe(Colors.dark.backgroundSelected);
  });

  it('aplica un style adicional sin perder el backgroundColor del tema', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(<ThemedView testID={TEST_ID} style={{ padding: 10 }} />);

    const flattenedStyle = getFlattenedStyle();
    expect(flattenedStyle.backgroundColor).toBe(Colors.light.background);
    expect(flattenedStyle.padding).toBe(10);
  });

  it('un style adicional puede sobrescribir el backgroundColor por defecto', async () => {
    mockedUseColorScheme.mockReturnValue('light');

    await render(
      <ThemedView testID={TEST_ID} style={{ backgroundColor: 'red' }} />,
    );

    expect(getFlattenedStyle().backgroundColor).toBe('red');
  });
});
