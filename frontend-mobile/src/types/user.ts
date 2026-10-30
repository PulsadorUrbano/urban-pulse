// Contrato de datos para las los usuarios.
// `username`, `password`, `email`, `role` son obligatorios: dos usuarios no pueden tener el mismo username o email

export type UserRole = 'administrative' | 'department' | 'team' | 'technician' | 'civic' | `admin` | `analyst`;

// Campos comunes a cualquier origen de usuario (mock o backend real).
interface UserBase {
  id: string;
  username: string;
  email: string;
  role: string;
  // Identidad estable usada en el dominio de incidencias (100% mock, fuera de
  // alcance de este refactor): en MockUser es el UUID generado en el cliente
  // al registrarse; en BackendUser se sintetiza igual a `id` (el userId del
  // backend) para que `user?.civicId` siga funcionando en my-incidents.tsx y
  // new.tsx sin tocar esas pantallas.
  civicId: string;
}

// Usuario autenticado contra el mock (json-server).
export interface MockUser extends UserBase {
  source: 'mock';
  // Ahora la usaremos en texto plano porque será en el backend donde se comprobará el hash
  password: string;
}

// Usuario autenticado contra el backend real (NestJS). Nunca tiene `password`
// (el backend no lo devuelve); tiene `phone`, enviado directamente en el
// registro.
export interface BackendUser extends UserBase {
  source: 'backend';
  phone: string | null;
}

export type User = MockUser | BackendUser;

// SessionUser es la forma persistible del usuario: igual que User pero sin
// password. Nunca debe escribirse en disco (ni en SecureStore) porque hoy
// viaja en texto plano (ver el comentario de MockUser.password arriba).
export type MockSessionUser = Omit<MockUser, 'password'>;
export type SessionUser = MockSessionUser | BackendUser;

// Usará o username o email
export interface LoginUserInput {
  username_email: string;
  password: string;
}

// Datos del formulario de registro de un nuevo ciudadano.
export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  phone?: string;
}