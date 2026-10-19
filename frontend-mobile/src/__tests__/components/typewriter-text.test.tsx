/// <reference types="jest" />
import { act, cleanup, render, screen } from '@testing-library/react-native';

import { TypewriterText } from '@/components/typewriter-text';

// El tema (vía ThemedText) importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

const TEST_ID = 'typewriter-text';

// Espías sobre los timers de intervalo: solo cuentan los creados por el componente.
// `jest.getTimerCount()` no sirve de aserción absoluta porque RNTL/React crean timers internos.
let setIntervalSpy: jest.SpyInstance;
let clearIntervalSpy: jest.SpyInstance;

// Número de intervalos creados por el componente que aún no se han limpiado.
function countActiveIntervals(): number {
  const createdIntervalIds = setIntervalSpy.mock.results.map((result) => result.value);
  const clearedIntervalIds = clearIntervalSpy.mock.calls.map((call) => call[0]);

  return createdIntervalIds.filter((intervalId) => !clearedIntervalIds.includes(intervalId))
    .length;
}

// Lee el texto visible actual del componente (el Text host recibe el slice como children).
function readVisibleText(): string {
  return String(screen.getByTestId(TEST_ID).props.children ?? '');
}

// Avanza el reloj falso dentro de act asíncrono para que React procese los setState de los intervalos.
async function advanceTimersBy(milliseconds: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe('TypewriterText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
  });

  afterEach(() => {
    // Desmonta antes de restaurar los timers para que la limpieza de intervalos sea real.
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('revela el texto carácter a carácter según speedMs', async () => {
    await render(<TypewriterText testID={TEST_ID} text="Hola" speedMs={50} />);

    expect(readVisibleText()).toBe('');

    await advanceTimersBy(50);
    expect(readVisibleText()).toBe('H');

    await advanceTimersBy(50);
    expect(readVisibleText()).toBe('Ho');

    await advanceTimersBy(100);
    expect(readVisibleText()).toBe('Hola');
  });

  it('detiene el intervalo al completar el texto (no quedan intervalos activos)', async () => {
    await render(<TypewriterText testID={TEST_ID} text="Hola" speedMs={50} />);

    await advanceTimersBy(200);

    expect(readVisibleText()).toBe('Hola');
    expect(countActiveIntervals()).toBe(0);
  });

  it('usa 35 ms por defecto cuando no se pasa speedMs', async () => {
    await render(<TypewriterText testID={TEST_ID} text="Hola" />);

    await advanceTimersBy(34);
    expect(readVisibleText()).toBe('');

    await advanceTimersBy(1);
    expect(readVisibleText()).toBe('H');
  });

  it('con un nuevo text reinicia desde vacío y muestra el texto nuevo completo al avanzar', async () => {
    const { rerender } = await render(
      <TypewriterText testID={TEST_ID} text="Hola" speedMs={50} />,
    );
    await advanceTimersBy(200);
    expect(readVisibleText()).toBe('Hola');

    await rerender(<TypewriterText testID={TEST_ID} text="Adiós" speedMs={50} />);

    // El efecto reinicia el contador al cambiar el texto.
    expect(readVisibleText()).toBe('');

    await advanceTimersBy(250);
    expect(readVisibleText()).toBe('Adiós');
    expect(countActiveIntervals()).toBe(0);
  });

  it('al desmontar limpia el intervalo y no emite warnings de setState', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { unmount } = await render(
      <TypewriterText testID={TEST_ID} text="Hola mundo" speedMs={50} />,
    );
    await advanceTimersBy(50);
    expect(countActiveIntervals()).toBe(1);

    // Los cleanups de efecto se ejecutan dentro de act.
    await act(async () => {
      unmount();
    });

    expect(countActiveIntervals()).toBe(0);

    // Avanzar el tiempo tras desmontar no debe provocar setState sobre un componente desmontado.
    await advanceTimersBy(1_000);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('con text vacío no crea intervalos y muestra cadena vacía', async () => {
    await render(<TypewriterText testID={TEST_ID} text="" speedMs={50} />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(readVisibleText()).toBe('');
  });

  it('reenvía las props de ThemedText (testID) al Text renderizado', async () => {
    await render(<TypewriterText testID={TEST_ID} text="Hola" speedMs={50} />);

    expect(screen.getByTestId(TEST_ID)).toBeOnTheScreen();
  });
});
