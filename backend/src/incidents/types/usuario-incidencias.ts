import type { profile_role } from '../../generated/prisma/enums.js';

export interface UsuarioIncidencias {
  id: string;
  role: profile_role;
  departamentoId?: string | null;
  equipoId?: string | null;
  esTecnico?: boolean;
  ciudadanoId: string | null;
}
