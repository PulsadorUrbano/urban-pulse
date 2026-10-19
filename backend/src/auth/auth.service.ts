import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TokenPayload } from './token-payload.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Crea un JWT para el usuario indicado en la base de datos. */
  async createToken(userId: string): Promise<string> {
    const { username, role } = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true, role: true },
    });

    const payload: TokenPayload = { userId, username, role };

    return this.jwt.signAsync(payload);
  }
}
