// Contrato de datos para los ciudadanos que reportan incidencias, asociados a un usuario.
// El teléfono no es obligatorio. Dos ciudadanos no pueden tener el mismo teléfono.

export interface Civic {
  userId: string;
  phone: string;
}

export interface CreateCivicInput {
  userId: string;
  phone: string;
}
