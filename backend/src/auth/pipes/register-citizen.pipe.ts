import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { RegisterCitizenDto } from '../dto/register-citizen.dto.js';

const allowedKeys = new Set(['username', 'email', 'password', 'phone']);
const usernamePattern = /^[a-zA-Z0-9._-]{3,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?\d{9,15}$/;
const MAX_PASSWORD_BYTES = 72;

@Injectable()
export class RegisterCitizenPipe implements PipeTransform<
  unknown,
  RegisterCitizenDto
> {
  transform(value: unknown): RegisterCitizenDto {
    if (!this.isRecord(value)) {
      throw new BadRequestException('El cuerpo de la petición debe ser un objeto');
    }

    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Campo no permitido: ${key}`);
      }
    }

    const username = this.text(value.username, 'username').trim();
    if (!usernamePattern.test(username)) {
      throw new BadRequestException(
        'username debe tener de 3 a 30 caracteres alfanuméricos, punto, guion o guion bajo',
      );
    }

    const email = this.text(value.email, 'email').trim().toLowerCase();
    if (!emailPattern.test(email) || email.length > 254) {
      throw new BadRequestException('email no tiene un formato válido');
    }

    const password = this.text(value.password, 'password');
    const passwordBytes = Buffer.byteLength(password, 'utf8');
    if (passwordBytes < 8 || passwordBytes > MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        'password debe tener entre 8 y 72 bytes',
      );
    }

    return {
      username,
      email,
      password,
      phone: this.phone(value.phone),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private text(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${field} debe ser un texto no vacío`);
    }
    return value;
  }

  private phone(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('phone debe ser un texto o null');
    }

    const phone = value.replace(/\s+/g, '');
    if (!phonePattern.test(phone)) {
      throw new BadRequestException(
        'phone debe tener de 9 a 15 dígitos, con prefijo + opcional',
      );
    }
    return phone;
  }
}
