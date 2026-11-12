// Contrato de datos de los usuarios. Mismos nombres que frontend-mobile/src/types/user.ts.

// Roles del enum `profile_role` del backend (backend/prisma/schema.prisma).
export type UserRole =
  | 'administrative'
  | 'department'
  | 'team'
  | 'technician'
  | 'civic'
  | 'admin'
  | 'analyst';

// Respuesta pública del backend (PublicUserDto) en GET /auth/me.
export interface BackendPublicUserDto {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  phone: string | null;
}

// Campos comunes a cualquier origen de usuario (mock o backend real).
interface UserBase {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

// Usuario autenticado contra el backend real (NestJS). Nunca tiene contraseña.
export interface BackendUser extends UserBase {
  source: 'backend';
  phone: string | null;
}

// Usuario simulado, solo para trabajar sin conexión con el backend. Los campos
// de presentación no existen en el backend.
export interface MockUser extends UserBase {
  source: 'mock';
  password: string;
  fullName: string;
  departmentName?: string;
  badgeNumber?: string;
}

export type User = MockUser | BackendUser;

// Forma persistible del usuario: nunca se guarda la contraseña del mock.
export type MockSessionUser = Omit<MockUser, 'password'>;
export type SessionUser = MockSessionUser | BackendUser;

// Credenciales del formulario de login. El nombre del campo sigue al backend
// (LoginDto.usernameOrEmail); el móvil lo llama `username_email` en su formulario.
export interface LoginUserInput {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
}
