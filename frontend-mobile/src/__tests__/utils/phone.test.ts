/// <reference types="jest" />
import { buildPhoneWithDialCode } from '@/utils/phone';

describe('buildPhoneWithDialCode', () => {
  it('concatena el prefijo de país con el número', () => {
    expect(buildPhoneWithDialCode('+34', '600123456')).toBe('+34600123456');
  });

  it('devuelve solo el prefijo si el número está vacío', () => {
    expect(buildPhoneWithDialCode('+34', '')).toBe('+34');
  });

  it('funciona con prefijos de distintos países', () => {
    expect(buildPhoneWithDialCode('+351', '912345678')).toBe('+351912345678');
  });
});
