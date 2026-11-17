/// <reference types="jest" />
import { buildGreetings } from '@/utils/greetings';

describe('buildGreetings', () => {
  it('devuelve exactamente tres variantes de saludo con el nombre indicado', () => {
    const greetings = buildGreetings('Ana');

    expect(greetings).toHaveLength(3);
    expect(greetings).toEqual([
      '¡Estás de vuelta, Ana!',
      '¿Alguna incidencia que reportar, Ana?',
      'Hola, Ana',
    ]);
  });

  it('interpola el nombre vacío sin lanzar error cuando no hay username', () => {
    const greetings = buildGreetings('');

    expect(greetings).toEqual([
      '¡Estás de vuelta, !',
      '¿Alguna incidencia que reportar, ?',
      'Hola, ',
    ]);
  });
});
