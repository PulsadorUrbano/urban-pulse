/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { FallbackNoticeCard } from '@/components/fallback-notice-card';

const NOTICE_MESSAGE = 'No se ha podido conectar al backend, realizando en el mock';
const BUTTON_LABEL = 'Entendido';

describe('FallbackNoticeCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra el mensaje del aviso y la etiqueta del botón', async () => {
    await render(
      <FallbackNoticeCard message={NOTICE_MESSAGE} buttonLabel={BUTTON_LABEL} onPress={jest.fn()} />,
    );

    expect(screen.getByText(NOTICE_MESSAGE)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: BUTTON_LABEL })).toBeOnTheScreen();
  });

  it('al pulsar el botón llama a onPress una vez', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <FallbackNoticeCard message={NOTICE_MESSAGE} buttonLabel={BUTTON_LABEL} onPress={onPress} />,
    );

    await user.press(screen.getByRole('button', { name: BUTTON_LABEL }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
