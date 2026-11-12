import { profile_role } from '../generated/prisma/enums.js';

/** Claims firmadas del JWT de Urban Pulse. `sub` y `userId` contienen el mismo identificador. */
export interface TokenPayload {
  sub: string;
  userId: string;
  username: string;
  role: profile_role;
}

export interface TokenPayloadVerificado extends TokenPayload {
  iat: number;
  exp: number;
}

const formatoUuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const rolesValidos: readonly string[] = Object.values(profile_role);

/** Valida la estructura de las claims; la firma y los tiempos los verifica JwtService. */
export function esTokenPayloadValido(
  valor: unknown,
): valor is TokenPayloadVerificado {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor) &&
    'sub' in valor &&
    typeof valor.sub === 'string' &&
    formatoUuid.test(valor.sub) &&
    'userId' in valor &&
    typeof valor.userId === 'string' &&
    formatoUuid.test(valor.userId) &&
    valor.sub.toLowerCase() === valor.userId.toLowerCase() &&
    'username' in valor &&
    typeof valor.username === 'string' &&
    valor.username.trim().length > 0 &&
    'role' in valor &&
    typeof valor.role === 'string' &&
    rolesValidos.includes(valor.role) &&
    'iat' in valor &&
    typeof valor.iat === 'number' &&
    Number.isInteger(valor.iat) &&
    'exp' in valor &&
    typeof valor.exp === 'number' &&
    Number.isInteger(valor.exp) &&
    valor.exp > valor.iat
  );
}
