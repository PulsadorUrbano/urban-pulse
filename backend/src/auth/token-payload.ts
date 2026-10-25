import type { profile_role } from '../generated/prisma/enums.js';

/** Claims firmadas del JWT de Urban Pulse. `sub` y `userId` contienen el mismo identificador. */
export interface TokenPayload {
  sub: string;
  userId: string;
  username: string;
  role: profile_role;
}
