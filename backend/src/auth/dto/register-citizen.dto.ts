import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCitizenDto {
  @ApiProperty({
    description: 'Nombre de usuario: 3 a 30 caracteres alfanuméricos, punto, guion o guion bajo',
    example: 'ciudadano.nuevo',
  })
  username!: string;

  @ApiProperty({
    description: 'Correo electrónico único; se guarda en minúsculas',
    example: 'ciudadano.nuevo@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Contraseña de 8 a 72 bytes; se guarda solo como hash bcrypt',
    example: 'clave-segura-2026',
  })
  password!: string;

  @ApiPropertyOptional({
    description: 'Teléfono opcional, único entre ciudadanos: 9 a 15 dígitos con prefijo + opcional',
    example: '+34612345678',
    nullable: true,
    type: String,
  })
  phone?: string | null;
}
