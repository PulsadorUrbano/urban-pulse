import type { profile_role } from '../generated/prisma/enums.js';

/** Claims firmadas del JWT de Urban Pulse. */
export interface TokenPayload {
  userId: string;
  username: string;
  role: profile_role;
}
