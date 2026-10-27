import type { profile_role } from '../../generated/prisma/enums.js';
export interface UsuarioIncidencias {
  id: string;
  role: profile_role;
  ciudadanoId: string | null;
}
