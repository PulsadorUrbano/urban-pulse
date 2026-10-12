import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TokenPayload } from './token-payload.js';

/** Extrae las claims del token (dejadas por `JwtAuthGuard`) del request actual. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TokenPayload | undefined =>
    context.switchToHttp().getRequest<{ user?: TokenPayload }>().user,
);
