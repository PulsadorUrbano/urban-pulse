// Contrato de datos para las los usuarios.
// `username`, `password`, `email`, `role` son obligatorios: dos usuarios no pueden tener el mismo username o email

export type UserRole = 'administrative' | 'department' | 'team' | 'technician' | 'civic' | `admin` | `analyst`;

// Estos serían los datos que se almacenan en el backend
export interface User {
  id: string;
  username: string;
  email: string;
  // Ahora la usaremos en texto plano porque será en el backend donde se comprobará el hash
  password: string;
  role: string;
}

// SessionUser es la forma persistible del usuario: igual que User pero sin
// password. Nunca debe escribirse en disco (ni en SecureStore) porque hoy
// viaja en texto plano (ver el comentario de User.password arriba).
export type SessionUser = Omit<User, 'password'>;

// Usará o username o email
export interface LoginUserInput {
  username_email: string;
  password: string;
}