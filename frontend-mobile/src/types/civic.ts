// Contrato de datos para las los ciudadanos que reportan incidencias, asociados a un usuario.
// El teléfono no es obligatorio. Dos ciudadanos no pueden tener el mismo teléfono

export interface User {
  user_id: string;
  phone: string;
}