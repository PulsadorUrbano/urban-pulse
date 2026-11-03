import { afterEach, describe, expect, it, vi } from 'vitest';
import { anunciarArranqueCoordinado } from '../../src/configuracion/arranque-coordinado.js';

const sendDescriptor = Object.getOwnPropertyDescriptor(process, 'send');

afterEach(() => {
  vi.unstubAllEnvs();
  if (sendDescriptor) {
    Object.defineProperty(process, 'send', sendDescriptor);
  } else {
    Reflect.deleteProperty(process, 'send');
  }
});

describe('anunciarArranqueCoordinado', () => {
  it('no envía nada en modo normal', () => {
    vi.stubEnv('URBAN_PULSE_COORDINADO', '0');
    const send = vi.fn();
    Object.defineProperty(process, 'send', { configurable: true, value: send });

    anunciarArranqueCoordinado(49152);

    expect(send).not.toHaveBeenCalled();
  });

  it('envía el puerto real en modo coordinado', () => {
    vi.stubEnv('URBAN_PULSE_COORDINADO', '1');
    const send = vi.fn();
    Object.defineProperty(process, 'send', { configurable: true, value: send });

    anunciarArranqueCoordinado(49152);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ tipo: 'backend-listo', puerto: 49152 });
  });

  it('lanza un error si el canal IPC no está disponible', () => {
    vi.stubEnv('URBAN_PULSE_COORDINADO', '1');
    Reflect.deleteProperty(process, 'send');

    expect(() => anunciarArranqueCoordinado(49152)).toThrowError(Error);
  });

  it.each([0, -1, 65536, Number.NaN])('rechaza el puerto %s', (puerto) => {
    vi.stubEnv('URBAN_PULSE_COORDINADO', '1');
    const send = vi.fn();
    Object.defineProperty(process, 'send', { configurable: true, value: send });

    expect(() => anunciarArranqueCoordinado(puerto)).toThrowError(Error);
    expect(send).not.toHaveBeenCalled();
  });
});
