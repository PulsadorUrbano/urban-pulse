// Contrato de datos para los ciudadanos que reportan incidencias, asociados a un usuario.
// El teléfono es opcional en el registro de usuario, pero el registro `civic` solo se
// crea cuando hay teléfono (ver use-register.ts), por eso aquí `phone` es siempre string.
// Dos ciudadanos no pueden tener el mismo teléfono.

export interface Civic {
  userId: string;
  phone: string;
}

export interface CreateCivicInput {
  userId: string;
  phone: string;
}
