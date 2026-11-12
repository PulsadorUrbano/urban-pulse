import type { SessionUser } from '../types/user';

// Nombre a mostrar: el backend no devuelve nombre completo; solo el usuario simulado lo tiene.
export function displayName(user: SessionUser): string {
  return user.source === 'mock' ? user.fullName : user.username;
}
