import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({ minLength: 4, maxLength: 50, example: 'Farola apagada' })
  title!: string;

  @ApiPropertyOptional({
    minLength: 10,
    example: 'La farola no ilumina la calle.',
  })
  description?: string;

  @ApiProperty({ format: 'uuid' })
  civicId!: string;

  @ApiProperty({ example: 'Iluminación' })
  categoryName!: string;

  @ApiProperty({ minimum: -90, maximum: 90, example: 36.7213 })
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -4.4214 })
  longitude!: number;

  @ApiPropertyOptional({ minimum: 0, example: 8.5 })
  accuracy?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  urbanAssetId?: string;
}
