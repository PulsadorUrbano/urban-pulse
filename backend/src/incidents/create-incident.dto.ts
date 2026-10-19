import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({ minLength: 4, maxLength: 35, example: 'Farola apagada' })
  title!: string;

  @ApiPropertyOptional({
    example: 'La farola no ilumina la calle.',
  })
  description?: string;

  @ApiProperty({ format: 'uuid' })
  civicId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Iluminación' })
  category?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, example: 36.7213 })
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, example: -4.4214 })
  longitude?: number;

  @ApiPropertyOptional({ minimum: 0, example: 8.5 })
  accuracy?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  urbanAssetId?: string;
}
