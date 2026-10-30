import { ApiProperty } from '@nestjs/swagger';
import type { profile_role } from '../../generated/prisma/enums.js';

/** Datos de usuario que se devuelven al cliente. Nunca incluye la contraseña ni su hash. */
export class PublicUserDto {
  @ApiProperty({
    description: 'Identificador del usuario',
    example: '3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c',
  })
  userId!: string;

  @ApiProperty({ example: 'ciudadano' })
  username!: string;

  @ApiProperty({ example: 'ciudadano@urbanpulse.dev' })
  email!: string;

  @ApiProperty({
    enum: ['administrative', 'department', 'team', 'technician', 'civic', 'admin', 'analyst'],
    example: 'civic',
  })
  role!: profile_role;

  @ApiProperty({
    description: 'Teléfono del ciudadano; null si no lo ha indicado o no es ciudadano',
    example: '+34612345678',
    nullable: true,
    type: String,
  })
  phone!: string | null;
}
