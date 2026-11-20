/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { LOGOUT_BUTTON_SIZE, LogoutButton } from '@/components/logout-button';

describe('LogoutButton', () => {
  beforeEach(() => {
    // userEvent.press simula una pulsación con duración; los fake timers la aceleran.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('se renderiza como botón visible con la etiqueta "Cerrar sesión"', async () => {
    await render(<LogoutButton onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Cerrar sesión' });
    expect(button).toBeOnTheScreen();
  });

  it('al pulsar llama a onPress una vez', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<LogoutButton onPress={onPress} />);

    await user.press(screen.getByLabelText('Cerrar sesión'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renderiza sin errores cuando se omite la prop style', async () => {
    await render(<LogoutButton onPress={jest.fn()} />);

    expect(screen.getByLabelText('Cerrar sesión')).toBeOnTheScreen();
  });

  it('renderiza sin errores cuando se pasa la prop style', async () => {
    await render(<LogoutButton onPress={jest.fn()} style={{ marginTop: 8 }} />);

    expect(screen.getByLabelText('Cerrar sesión')).toBeOnTheScreen();
  });

  it('exporta LOGOUT_BUTTON_SIZE con valor 44', () => {
    expect(LOGOUT_BUTTON_SIZE).toBe(44);
  });
});
