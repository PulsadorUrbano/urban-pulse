import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { CreateIncidentInput } from './incident.js';

const allowedKeys = new Set([
  'title',
  'description',
  'civicId',
  'categoryName',
  'latitude',
  'longitude',
  'accuracy',
  'urbanAssetId',
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CreateIncidentPipe implements PipeTransform<
  unknown,
  CreateIncidentInput
> {
  transform(value: unknown): CreateIncidentInput {
    if (!this.isRecord(value)) {
      throw new BadRequestException('The request body must be an object');
    }

    for (const key of Object.keys(value)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(`Unknown field: ${key}`);
      }
    }

    const title = this.text(value.title, 'title');
    const description =
      value.description === undefined
        ? undefined
        : this.text(value.description, 'description');
    const categoryName = this.text(value.categoryName, 'categoryName');

    if ([...title].length < 4 || [...title].length > 50) {
      throw new BadRequestException('title must contain 4 to 50 characters');
    }
    if (description !== undefined && [...description].length < 10) {
      throw new BadRequestException(
        'description must contain at least 10 characters',
      );
    }

    if (categoryName.length === 0) {
      throw new BadRequestException('categoryName must not be empty');
    }

    this.uuid(value.civicId, 'civicId');
    const latitude = this.number(value.latitude, 'latitude', -90, 90);
    const longitude = this.number(value.longitude, 'longitude', -180, 180);
    const accuracy =
      value.accuracy === undefined
        ? undefined
        : this.number(value.accuracy, 'accuracy', 0);

    if (value.urbanAssetId !== undefined) {
      this.uuid(value.urbanAssetId, 'urbanAssetId');
    }

    return {
      title,
      ...(description === undefined ? {} : { description }),
      civicId: value.civicId,
      categoryName,
      latitude,
      longitude,
      ...(accuracy === undefined ? {} : { accuracy }),
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

  private number(
    value: unknown,
    field: string,
    minimum: number,
    maximum = Number.POSITIVE_INFINITY,
  ): number {
    if (
      typeof value !== 'string' ||
      value.trim() === '' ||
      !Number.isFinite(Number(value)) ||
      Number(value) < minimum ||
      Number(value) > maximum
    ) {
      throw new BadRequestException(
        `${field} must be a finite number between ${minimum} and ${maximum}`,
      );
    }
    return Number(value);
  }
}
