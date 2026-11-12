import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description:
      'Nombre de usuario o correo electrónico; se recortan espacios y debe contener texto',
    example: 'ciudadano',
  })
  usernameOrEmail!: string;

  @ApiProperty({
    description:
      'Contraseña no vacía, hasta 72 bytes UTF-8; se conserva sin recortar espacios',
    example: 'ciudadano',
  })
  password!: string;
}
