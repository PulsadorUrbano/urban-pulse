import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({ minLength: 4, maxLength: 25, example: 'Farola apagada' })
  title!: string;

  @ApiProperty({ minLength: 10, example: 'La farola no ilumina la calle.' })
  description!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ minimum: -90, maximum: 90, example: 36.7213 })
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -4.4214 })
  longitude!: number;

  @ApiPropertyOptional({ format: 'uuid' })
  urbanAssetId?: string;
}
