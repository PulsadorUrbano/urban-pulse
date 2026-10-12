/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { LocationToggle } from './location-toggle';

// Evita cargar la fuente del icono en el entorno de test.
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

describe('LocationToggle', () => {
  beforeEach(() => {
    // userEvent.press simula una pulsación con duración; los fake timers la aceleran.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('con la ubicación activada anuncia "Desactivar ubicación"', async () => {
    await render(<LocationToggle isLocationEnabled onToggle={jest.fn()} />);

    expect(screen.getByLabelText('Desactivar ubicación')).toBeOnTheScreen();
  });

  it('con la ubicación desactivada anuncia "Activar ubicación"', async () => {
    await render(<LocationToggle isLocationEnabled={false} onToggle={jest.fn()} />);

    expect(screen.getByLabelText('Activar ubicación')).toBeOnTheScreen();
  });

  it('al pulsar llama a onToggle una vez', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    await render(<LocationToggle isLocationEnabled={false} onToggle={onToggle} />);

    await user.press(screen.getByLabelText('Activar ubicación'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado expone accessibilityState.disabled y no llama a onToggle', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    await render(<LocationToggle isLocationEnabled={false} onToggle={onToggle} disabled />);

    const button = screen.getByLabelText('Activar ubicación');
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(button).toBeDisabled();

    await user.press(button);

    expect(onToggle).not.toHaveBeenCalled();
  });
});
