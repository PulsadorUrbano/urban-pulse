import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RegisterCitizenPipe } from '../../../src/auth/pipes/register-citizen.pipe.js';

const entradaValida = {
  username: 'ciudadano.nuevo',
  email: 'Ciudadano.Nuevo@Example.com',
  password: 'clave-segura',
};

describe('RegisterCitizenPipe', () => {
  const pipe = new RegisterCitizenPipe();

  it('normaliza email en minúsculas, recorta el usuario y devuelve phone null si se omite', () => {
    const resultado = pipe.transform({ ...entradaValida, username: '  ciudadano.nuevo  ' });

    expect(resultado).toEqual({
      username: 'ciudadano.nuevo',
      email: 'ciudadano.nuevo@example.com',
      password: 'clave-segura',
      phone: null,
    });
  });

  it('elimina espacios del teléfono y acepta el prefijo +', () => {
    const resultado = pipe.transform({ ...entradaValida, phone: '+34 612 345 678' });

    expect(resultado.phone).toBe('+34612345678');
  });

  it('rechaza campos desconocidos, como role', () => {
    expect(() => pipe.transform({ ...entradaValida, role: 'admin' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un cuerpo que no es un objeto', () => {
    expect(() => pipe.transform('texto')).toThrow(BadRequestException);
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it('rechaza un usuario con caracteres no permitidos o demasiado corto', () => {
    expect(() => pipe.transform({ ...entradaValida, username: 'ab' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ ...entradaValida, username: 'user name' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un email sin formato válido', () => {
    expect(() => pipe.transform({ ...entradaValida, email: 'no-es-email' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza contraseñas de menos de 8 caracteres o de más de 72 bytes', () => {
    expect(() => pipe.transform({ ...entradaValida, password: 'corta' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ ...entradaValida, password: 'a'.repeat(73) })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un teléfono con formato incorrecto o que no es texto', () => {
    expect(() => pipe.transform({ ...entradaValida, phone: '12-34' })).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform({ ...entradaValida, phone: 612345678 })).toThrow(
      BadRequestException,
    );
  });
});
