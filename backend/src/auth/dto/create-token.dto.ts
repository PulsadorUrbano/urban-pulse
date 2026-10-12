import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({
    description: 'Identificador (id) del usuario existente',
    example: '3f9c1b2a-5d4e-4f6a-8b7c-9d0e1f2a3b4c',
  })
  userId!: string;
}
