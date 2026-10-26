import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Nombre de usuario o correo electrónico',
    example: 'ciudadano',
  })
  usernameOrEmail!: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'ciudadano',
  })
  password!: string;
}
