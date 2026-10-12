import {
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { CreateTokenDto } from './dto/create-token.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { TokenPayload } from './token-payload.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Post('token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Genera un JWT para un usuario existente',
    description:
      'Devuelve un bearer token firmado (payload: user + role). La duración la controla JWT_EXPIRES_IN.',
  })
  @ApiResponse({
    status: 200,
    description: 'JWT firmado',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOi...' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async createToken(
    @Body() { userId }: CreateTokenDto,
  ): Promise<{ accessToken: string }> {
    try {
      return {
        accessToken: await this.auth.createToken(userId),
      };
    } catch (error) {
      if (error instanceof Error && (error.name === 'NotFoundError' || error.name === 'PrismaClientKnownRequestError'))
        throw new NotFoundException(`Usuario con id '${userId}' no encontrado`);

      this.logger.error(`Error interno al crear token para usuario ${userId}: ${error}`);
      throw new InternalServerErrorException();
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve las claims del token actual' })
  @ApiResponse({ status: 200, description: 'Payload del token' })
  @ApiResponse({ status: 401, description: 'Token inválido o ausente' })
  me(@CurrentUser() user: TokenPayload): TokenPayload {
    return user;
  }
}
