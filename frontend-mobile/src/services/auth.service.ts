import { API_BASE_URL } from '@/constants/config';
import type { LoginUserInput, User } from '@/types/user';

import { RequestTimeoutError, fetchWithTimeout } from './http';

export const USERS_ENDPOINT = `${API_BASE_URL}/users`;

// Credenciales incorrectas; se distingue de errores de red/timeout para que
// solo este caso cuente como intento fallido.
export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

// Consulta usuarios por un campo concreto y filtra en cliente por igualdad exacta.
async function fetchUsersByField(
  field: 'username' | 'email',
  value: string,
): Promise<User[]> {
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${USERS_ENDPOINT}?${field}=${encodeURIComponent(value)}`,
      { method: 'GET' },
    );
  } catch (error) {
    if (error instanceof RequestTimeoutError) {
      throw new Error(
        'El servidor tardó demasiado en responder. Comprueba que el servidor mock (npm run mock) esté activo y sea accesible desde tu dispositivo.',
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  if (!response.ok) {
    throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo más tarde.');
  }

  const userList = (await response.json()) as User[];
  return userList.filter((user) => user[field] === value);
}

// Autentica contra el servidor mock buscando por username y, si no hay match, por email.
export async function login(input: LoginUserInput): Promise<User> {
  const identifier = input.username_email.trim();

  let matchingUsers = await fetchUsersByField('username', identifier);

  if (matchingUsers.length === 0) {
    matchingUsers = await fetchUsersByField('email', identifier);
  }

  const matchedUser = matchingUsers.find((user) => user.password === input.password);

  if (!matchedUser) {
    throw new InvalidCredentialsError(
      'El usuario o contraseña no son correctos, inténtelo de nuevo.',
    );
  }

  return matchedUser;
}
