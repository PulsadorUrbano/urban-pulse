/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/primary-button';

describe('PrimaryButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra la etiqueta y la usa como accessibilityLabel por defecto', async () => {
    await render(<PrimaryButton label="Enviar" onPress={jest.fn()} />);

    expect(screen.getByText('Enviar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeOnTheScreen();
  });

  it('usa accessibilityLabel cuando se indica', async () => {
    await render(
      <PrimaryButton label="Enviar" accessibilityLabel="Enviar incidencia" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Enviar incidencia' })).toBeOnTheScreen();
  });

  it('al pulsar llama a onPress una vez', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<PrimaryButton label="Enviar" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no llama a onPress', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<PrimaryButton label="Enviar" onPress={onPress} disabled />);

    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('con isLoading muestra el indicador en lugar de la etiqueta', async () => {
    await render(<PrimaryButton label="Enviar" onPress={jest.fn()} isLoading />);

    expect(screen.queryByText('Enviar')).not.toBeOnTheScreen();
    // El mock de RN serializa el indicador con su nombre de tipo.
    expect(JSON.stringify(screen.toJSON())).toContain('"type":"ActivityIndicator"');
  });
});
