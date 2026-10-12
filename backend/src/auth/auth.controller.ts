import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { TokenPayload } from './token-payload.js';

@Controller('auth')
export class AuthController {
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
    @Body('userId') userId: string,
  ): Promise<{ accessToken: string }> {
    return {
      accessToken: await this.auth.createToken(userId),
    };
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
