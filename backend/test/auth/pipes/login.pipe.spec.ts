import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { LoginPipe } from '../../../src/auth/pipes/login.pipe.js';

describe('LoginPipe', () => {
  const pipe = new LoginPipe();

  it('recorta el identificador y conserva la contraseña tal cual', () => {
    expect(
      pipe.transform({ usernameOrEmail: '  ciudadano  ', password: ' clave ' }),
    ).toEqual({ usernameOrEmail: 'ciudadano', password: ' clave ' });
  });

  it('rechaza campos desconocidos', () => {
    expect(() =>
      pipe.transform({ usernameOrEmail: 'ciudadano', password: 'clave', role: 'admin' }),
    ).toThrow(BadRequestException);
  });

  it('rechaza identificador vacío o contraseña ausente', () => {
    expect(() => pipe.transform({ usernameOrEmail: '  ', password: 'clave' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ usernameOrEmail: 'ciudadano' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza contraseñas de más de 72 bytes', () => {
    expect(() =>
      pipe.transform({ usernameOrEmail: 'ciudadano', password: 'a'.repeat(73) }),
    ).toThrow(BadRequestException);
  });
});
