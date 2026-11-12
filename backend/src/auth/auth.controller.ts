import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { PublicUserDto } from './dto/public-user.dto.js';
import { RegisterCitizenDto } from './dto/register-citizen.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginPipe } from './pipes/login.pipe.js';
import { RegisterCitizenPipe } from './pipes/register-citizen.pipe.js';
import type { TokenPayload } from './token-payload.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registra un ciudadano (rol civic)',
    description:
      'Crea el usuario y su registro de ciudadano. El rol lo asigna el servidor y no se acepta en la petición.',
  })
  @ApiBody({ type: RegisterCitizenDto })
  @ApiCreatedResponse({ type: PublicUserDto })
  @ApiBadRequestResponse({ description: 'La petición no es válida.' })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con ese nombre, email o teléfono.',
  })
  register(
    @Body(new RegisterCitizenPipe()) input: RegisterCitizenDto,
  ): Promise<PublicUserDto> {
    return this.auth.registrarCiudadano(input);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inicia sesión con usuario o email y contraseña',
    description:
      'Devuelve un JWT HS256 con identidad del usuario y expiración configurada en JWT_EXPIRES_IN. No hay refresh token ni token de respaldo.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'JWT firmado',
    schema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOi...' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'La petición no es válida.' })
  @ApiUnauthorizedResponse({
    description:
      'Credenciales incorrectas. El mensaje no revela si el usuario existe.',
  })
  @ApiInternalServerErrorResponse({
    description:
      'Error de configuración, firma o acceso a datos; no se emite token de respaldo.',
  })
  async login(
    @Body(new LoginPipe()) input: LoginDto,
  ): Promise<{ accessToken: string }> {
    return {
      accessToken: await this.auth.login(input.usernameOrEmail, input.password),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Valida la sesión y devuelve los datos actuales del usuario',
    description:
      'Verifica HS256, expiración y claims obligatorias sub/userId UUID coincidentes, username, role, iat y exp. Devuelve datos actuales de la base de datos; si el usuario ya no existe, responde 401.',
  })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({
    description:
      'Bearer ausente o ambiguo, firma/algoritmo/claims inválidos, expiración o usuario inexistente.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de acceso a datos; no se devuelve usuario de respaldo.',
  })
  me(@CurrentUser() user: TokenPayload): Promise<PublicUserDto> {
    return this.auth.obtenerUsuarioActual(user);
  }
}
