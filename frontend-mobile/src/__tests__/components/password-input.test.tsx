/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { PasswordInput, type PasswordInputProps } from '@/components/password-input';

const INPUT_TEST_ID = 'password-input';

// Construye las props por defecto del componente y permite sobreescribirlas.
async function renderPasswordInput(overrides: Partial<PasswordInputProps> = {}) {
  const onChangeText = jest.fn();
  const props: PasswordInputProps = {
    value: '',
    onChangeText,
    placeholder: 'Contraseña',
    testID: INPUT_TEST_ID,
    ...overrides,
  };

  const renderResult = await render(<PasswordInput {...props} />);

  return { props, onChangeText, renderResult };
}

describe('PasswordInput', () => {
  beforeEach(() => {
    // userEvent.press simula una pulsación con duración; los fake timers la aceleran.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renderiza el TextInput con el valor controlado y el placeholder recibidos por props', async () => {
    await renderPasswordInput({ value: 'MiClave123' });

    const input = screen.getByTestId(INPUT_TEST_ID);
    expect(input).toBeOnTheScreen();
    expect(input.props.value).toBe('MiClave123');
    expect(screen.getByPlaceholderText('Contraseña')).toBeOnTheScreen();
  });

  it('llama a onChangeText con el valor introducido al escribir', async () => {
    const user = userEvent.setup();
    const { onChangeText } = await renderPasswordInput();

    await user.type(screen.getByTestId(INPUT_TEST_ID), 'nuevaClave');

    // El input es controlado (value ''), así que cada pulsación emite el texto acumulado desde ''.
    expect(onChangeText).toHaveBeenCalledTimes('nuevaClave'.length);
    expect(onChangeText).toHaveBeenLastCalledWith('e');
  });

  it('oculta la contraseña por defecto (secureTextEntry) y expone el botón de mostrar como accesible', async () => {
    await renderPasswordInput();

    expect(screen.getByTestId(INPUT_TEST_ID).props.secureTextEntry).toBe(true);

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggleButton).toBeOnTheScreen();
    expect(toggleButton.props.accessibilityRole).toBe('button');
    expect(toggleButton.props.accessibilityLabel).toBe('Mostrar contraseña');
  });

  it('al pulsar el botón de ojo alterna secureTextEntry y la etiqueta de accesibilidad', async () => {
    const user = userEvent.setup();
    await renderPasswordInput();

    await user.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(screen.getByTestId(INPUT_TEST_ID).props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));

    expect(screen.getByTestId(INPUT_TEST_ID).props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeOnTheScreen();
  });

  it('cuando editable es false, el input y el botón de ojo quedan deshabilitados y no alternan', async () => {
    const user = userEvent.setup();
    await renderPasswordInput({ editable: false });

    const input = screen.getByTestId(INPUT_TEST_ID);
    expect(input.props.editable).toBe(false);

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggleButton.props.accessibilityState).toEqual({ disabled: true });

    await user.press(toggleButton);

    // El estado de visibilidad no cambia porque el handler ignora la pulsación cuando editable es false
    expect(screen.getByTestId(INPUT_TEST_ID).props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeOnTheScreen();
  });

  it('por defecto (sin pasar editable) el input y el botón de ojo están habilitados', async () => {
    await renderPasswordInput();

    expect(screen.getByTestId(INPUT_TEST_ID).props.editable).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Mostrar contraseña' }).props.accessibilityState,
    ).toEqual({ disabled: false });
  });
});
