import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto.js';

const allowedKeys = new Set(['usernameOrEmail', 'password']);
const MAX_PASSWORD_BYTES = 72;

@Injectable()
export class LoginPipe implements PipeTransform<unknown, LoginDto> {
  transform(value: unknown): LoginDto {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException('El cuerpo de la petición debe ser un objeto');
    }

    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Campo no permitido: ${key}`);
      }
    }

    const record = value as Record<string, unknown>;

    if (typeof record.usernameOrEmail !== 'string' || record.usernameOrEmail.trim() === '') {
      throw new BadRequestException('usernameOrEmail debe ser un texto no vacío');
    }

    if (
      typeof record.password !== 'string' ||
      record.password === '' ||
      Buffer.byteLength(record.password, 'utf8') > MAX_PASSWORD_BYTES
    ) {
      throw new BadRequestException('password debe ser un texto de hasta 72 bytes');
    }

    return {
      usernameOrEmail: record.usernameOrEmail.trim(),
      password: record.password,
    };
  }
}
