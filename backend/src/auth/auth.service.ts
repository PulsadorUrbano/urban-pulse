import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { profile_role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PublicUserDto } from './dto/public-user.dto.js';
import { RegisterCitizenDto } from './dto/register-citizen.dto.js';
import type { TokenPayload } from './token-payload.js';

const BCRYPT_COST = 10;
const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos';
const MENSAJE_DUPLICADO = 'Ya existe un usuario con ese nombre, email o teléfono';

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  citizen: { select: { phone: true } },
} as const;

interface PublicUserRecord {
  id: string;
  username: string;
  email: string;
  role: profile_role;
  citizen: { phone: string | null } | null;
}

@Injectable()
export class AuthService {
  /** Hash de referencia para igualar el tiempo de respuesta cuando el usuario no existe. */
  private readonly hashReferencia = hash(randomUUID(), BCRYPT_COST);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Crea un ciudadano (rol civic) y su fila en citizens en una única transacción. */
  async registrarCiudadano(input: RegisterCitizenDto): Promise<PublicUserDto> {
    const passwordHash = await hash(input.password, BCRYPT_COST);

    try {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const creado = await tx.users.create({
          data: {
            username: input.username,
            email: input.email,
            password: passwordHash,
            role: profile_role.civic,
          },
          select: publicUserSelect,
        });

        await tx.citizens.create({
          data: { user_id: creado.id, phone: input.phone ?? null },
        });

        return {
          ...creado,
          citizen: { phone: input.phone ?? null },
        };
      });

      return this.aDtoPublico(usuario);
    } catch (error) {
      if (esViolacionDeUnicidad(error)) {
        throw new ConflictException(MENSAJE_DUPLICADO);
      }
      throw error;
    }
  }

  /** Valida credenciales y devuelve un JWT firmado. */
  async login(usernameOrEmail: string, password: string): Promise<string> {
    const identificador = usernameOrEmail.trim();
    const usuario = await this.prisma.users.findFirst({
      where: {
        OR: [
          { username: identificador },
          { email: identificador.toLowerCase() },
        ],
      },
      select: { id: true, username: true, role: true, password: true },
    });

    const hashComparado = usuario?.password ?? (await this.hashReferencia);
    const contraseñaValida = await compare(password, hashComparado);

    if (!usuario || !contraseñaValida) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }

    const payload: TokenPayload = {
      sub: usuario.id,
      userId: usuario.id,
      username: usuario.username,
      role: usuario.role,
    };

    return this.jwt.signAsync(payload);
  }

  /** Devuelve los datos actuales del usuario del token; falla si ya no existe. */
  async obtenerUsuarioActual(payload: TokenPayload): Promise<PublicUserDto> {
    const usuario = await this.prisma.users.findUnique({
      where: { id: payload.userId },
      select: publicUserSelect,
    });

    if (!usuario) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return this.aDtoPublico(usuario);
  }

  private aDtoPublico(usuario: PublicUserRecord): PublicUserDto {
    return {
      userId: usuario.id,
      username: usuario.username,
      email: usuario.email,
      role: usuario.role,
      phone: usuario.citizen?.phone ?? null,
    };
  }
}

function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
