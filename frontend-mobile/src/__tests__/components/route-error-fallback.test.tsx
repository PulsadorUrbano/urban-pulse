/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RouteErrorFallback } from '@/components/route-error-fallback';

// Insets del área segura a cero; el resto del módulo se conserva.
jest.mock('react-native-safe-area-context', () => {
  const safeAreaContext = jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );

  return {
    ...safeAreaContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  };
});

describe('RouteErrorFallback', () => {
  it('muestra el mensaje de error amigable', async () => {
    await render(<RouteErrorFallback error={new Error('fallo')} retry={jest.fn()} />);

    expect(screen.getByText('Algo ha salido mal')).toBeTruthy();
    expect(screen.getByText(/error inesperado/i)).toBeTruthy();
  });

  it('no expone el mensaje técnico del error', async () => {
    await render(<RouteErrorFallback error={new Error('detalle-interno')} retry={jest.fn()} />);

    expect(screen.queryByText(/detalle-interno/)).toBeNull();
  });

  it('llama a retry al pulsar Reintentar', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    await render(<RouteErrorFallback error={new Error('fallo')} retry={retry} />);

    await fireEvent.press(screen.getByText('Reintentar'));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
