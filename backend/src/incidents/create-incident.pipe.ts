import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { CreateIncidentDto } from './create-incident.dto.js';

const allowedKeys = new Set([
  'title',
  'description',
  'categoryId',
  'latitude',
  'longitude',
  'urbanAssetId',
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CreateIncidentPipe implements PipeTransform<
  unknown,
  CreateIncidentDto
> {
  transform(value: unknown): CreateIncidentDto {
    if (!this.isRecord(value)) {
      throw new BadRequestException('The request body must be an object');
    }

    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Unknown field: ${key}`);
      }
    }

    const title = this.text(value.title, 'title');
    const description = this.text(value.description, 'description');

    if ([...title].length < 4 || [...title].length > 25) {
      throw new BadRequestException('title must contain 4 to 25 characters');
    }
    if ([...description].length < 10) {
      throw new BadRequestException(
        'description must contain at least 10 characters',
      );
    }

    this.uuid(value.categoryId, 'categoryId');
    this.coordinate(value.latitude, 'latitude', -90, 90);
    this.coordinate(value.longitude, 'longitude', -180, 180);

    if (value.urbanAssetId !== undefined) {
      this.uuid(value.urbanAssetId, 'urbanAssetId');
    }

    return {
      title,
      description,
      categoryId: value.categoryId,
      latitude: value.latitude,
      longitude: value.longitude,
      ...(value.urbanAssetId === undefined
        ? {}
        : { urbanAssetId: value.urbanAssetId }),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private text(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
    return value.trim();
  }

  private uuid(value: unknown, field: string): asserts value is string {
    if (typeof value !== 'string' || !uuidPattern.test(value)) {
      throw new BadRequestException(`${field} must be a UUID`);
    }
  }

  private coordinate(
    value: unknown,
    field: string,
    minimum: number,
    maximum: number,
  ): asserts value is number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new BadRequestException(
        `${field} must be a finite number between ${minimum} and ${maximum}`,
      );
    }
  }
}
