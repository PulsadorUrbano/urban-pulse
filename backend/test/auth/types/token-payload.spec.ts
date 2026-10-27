import { esTokenPayloadValido } from '../../../src/auth/token-payload.js';
import { profile_role } from '../../../src/generated/prisma/enums.js';
const claims = {
  sub: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  username: 'persona',
  role: 'civic',
  iat: 1000,
  exp: 4600,
};
describe('Claims verificadas del JWT', () => {
  it.each(Object.values(profile_role))(
    'acepta rol Prisma %s y UUID sin distinguir mayúsculas',
    (role) => {
      expect(
        esTokenPayloadValido({
          ...claims,
          role,
          sub: claims.sub.toUpperCase(),
        }),
      ).toBe(true);
    },
  );
  it.each([
    undefined,
    null,
    [],
    'texto',
    1,
    ...Object.keys(claims).map((campo) => {
      const copia: Record<string, unknown> = { ...claims };
      delete copia[campo];
      return copia;
    }),
    { ...claims, sub: 1 },
    { ...claims, sub: 'inválido' },
    { ...claims, userId: null },
    { ...claims, userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    { ...claims, username: '' },
    { ...claims, username: '  ' },
    { ...claims, username: [] },
    { ...claims, role: 'inventado' },
    { ...claims, role: null },
    { ...claims, iat: '1000' },
    { ...claims, iat: NaN },
    { ...claims, iat: Infinity },
    { ...claims, iat: 1.5 },
    { ...claims, exp: '4600' },
    { ...claims, exp: NaN },
    { ...claims, exp: Infinity },
    { ...claims, exp: 4600.5 },
    { ...claims, exp: 1000 },
    { ...claims, exp: 999 },
  ])('rechaza claims inválidas %#', (valor) => {
    expect(esTokenPayloadValido(valor)).toBe(false);
  });
});
