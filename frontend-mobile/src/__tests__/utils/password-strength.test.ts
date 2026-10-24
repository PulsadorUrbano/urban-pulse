/// <reference types="jest" />
import { getPasswordStrengthLevel, isEmailFormatValid } from '@/utils/password-strength';

describe('getPasswordStrengthLevel', () => {
  describe('longitud mínima', () => {
    it('devuelve "invalid" con 7 caracteres aunque tenga mayúscula y número', () => {
      expect(getPasswordStrengthLevel('Abcdef1')).toBe('invalid');
    });

    it('devuelve al menos "acceptable" con exactamente 8 caracteres con mayúscula y número', () => {
      const level = getPasswordStrengthLevel('Abcdefg1');

      expect(['acceptable', 'strong']).toContain(level);
      expect(level).toBe('acceptable');
    });
  });

  describe('requisitos básicos (longitud, mayúscula, número)', () => {
    it('devuelve "acceptable" si cumple longitud, mayúscula y número pero no tiene carácter especial', () => {
      expect(getPasswordStrengthLevel('Secreta123')).toBe('acceptable');
    });

    it('devuelve "strong" si cumple longitud, mayúscula, número y carácter especial', () => {
      expect(getPasswordStrengthLevel('Abcdef1!')).toBe('strong');
    });

    it('devuelve "invalid" si falta la mayúscula', () => {
      expect(getPasswordStrengthLevel('abcdefg1')).toBe('invalid');
    });

    it('devuelve "invalid" si falta el número', () => {
      expect(getPasswordStrengthLevel('Abcdefgh')).toBe('invalid');
    });

    it('devuelve "invalid" si faltan la mayúscula y el número', () => {
      expect(getPasswordStrengthLevel('abcdefgh')).toBe('invalid');
    });

    it('devuelve "invalid" si el password está vacío', () => {
      expect(getPasswordStrengthLevel('')).toBe('invalid');
    });

    it('devuelve "invalid" si solo contiene caracteres especiales', () => {
      expect(getPasswordStrengthLevel('!@#$%^&*')).toBe('invalid');
    });

    it('no confunde el carácter especial con mayúscula o número', () => {
      // Solo símbolos y minúsculas: el especial no debe suplir los requisitos básicos.
      expect(getPasswordStrengthLevel('abc!@#$%')).toBe('invalid');
    });
  });
});

describe('isEmailFormatValid', () => {
  describe('emails válidos', () => {
    it.each(['a@b.com', 'a@sub.b.com', 'a+tag@b.com'])('acepta "%s"', (email) => {
      expect(isEmailFormatValid(email)).toBe(true);
    });
  });

  describe('emails inválidos', () => {
    it('rechaza un string sin @', () => {
      expect(isEmailFormatValid('ab.com')).toBe(false);
    });

    it('rechaza un dominio sin punto', () => {
      expect(isEmailFormatValid('a@b')).toBe(false);
    });

    it('rechaza un espacio interno', () => {
      expect(isEmailFormatValid('a b@c.com')).toBe(false);
    });

    it('rechaza el string vacío', () => {
      expect(isEmailFormatValid('')).toBe(false);
    });
  });

  describe('espacios en los extremos', () => {
    it('tolera espacios al principio y al final', () => {
      expect(isEmailFormatValid('  a@b.com  ')).toBe(true);
    });

    it('rechaza espacios en medio aunque haya espacios en los extremos', () => {
      expect(isEmailFormatValid('  a @b.com  ')).toBe(false);
    });

    it('rechaza espacio entre @ y el dominio', () => {
      expect(isEmailFormatValid('a@ b.com')).toBe(false);
    });
  });
});
