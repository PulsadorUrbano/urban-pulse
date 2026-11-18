import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AddressDistrict } from '../generated/prisma/enums.js';
import type { CrearIncidenciaBody } from './incident.js';

const allowedKeys = new Set([
  'title',
  'description',
  'categoryId',
  'category',
  'latitude',
  'longitude',
  'accuracy',
  'urbanAssetId',
  'address',
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CreateIncidentPipe implements PipeTransform<
  unknown,
  CrearIncidenciaBody
> {
  transform(value: unknown): CrearIncidenciaBody {
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
    if (description !== undefined && Array.from(description).length < 10) {
      throw new BadRequestException(
        'description requiere al menos 10 caracteres',
      );
    }
    const category =
      value.category === undefined
        ? undefined
        : this.text(value.category, 'category');

    const longitudTitulo = Array.from(title).length;
    if (longitudTitulo < 4 || longitudTitulo > 35) {
      throw new BadRequestException('title must contain 4 to 35 characters');
    }

    if (value.categoryId === undefined && !category) {
      throw new BadRequestException('La categoría es obligatoria');
    }
    if (value.latitude === undefined || value.longitude === undefined) {
      throw new BadRequestException('La ubicación es obligatoria');
    }
    if (value.categoryId !== undefined) {
      this.uuid(value.categoryId, 'categoryId');
    }

    // La presencia se comprueba arriba; estos límites validan los valores recibidos.
    const latitude =
      value.latitude === undefined
        ? undefined
        : this.number(value.latitude, 'latitude', -90, 90);
    const longitude =
      value.longitude === undefined
        ? undefined
        : this.number(value.longitude, 'longitude', -180, 180);
    const accuracy =
      value.accuracy === undefined
        ? undefined
        : this.number(value.accuracy, 'accuracy', 0);
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException(
        'latitude y longitude deben enviarse juntas',
      );
    }
    if (accuracy !== undefined && latitude === undefined) {
      throw new BadRequestException('accuracy requiere coordenadas');
    }

    let address: CrearIncidenciaBody['address'];
    if (value.address !== undefined) {
      if (latitude === undefined || !this.isRecord(value.address)) {
        throw new BadRequestException(
          'address requiere coordenadas y un objeto',
        );
      }
      const fields = Object.keys(value.address);
      if (
        fields.length !== 3 ||
        fields.some(
          (field) => !['street', 'zipCode', 'district'].includes(field),
        )
      ) {
        throw new BadRequestException(
          'address debe contener street, zipCode y district',
        );
      }
      const street = this.text(value.address.street, 'address.street');
      const zipCode = value.address.zipCode;
      const district = value.address.district;
      if (
        !street ||
        typeof zipCode !== 'string' ||
        !/^[0-9]{5}$/.test(zipCode) ||
        typeof district !== 'string' ||
        !Object.values(AddressDistrict).includes(district as AddressDistrict)
      ) {
        throw new BadRequestException('address no es válida');
      }
      address = { street, zipCode, district: district as AddressDistrict };
    }

    if (value.urbanAssetId !== undefined) {
      this.uuid(value.urbanAssetId, 'urbanAssetId');
    }

    return {
      title,
      ...(description === undefined ? {} : { description }),
      ...(value.categoryId === undefined
        ? {}
        : { categoryId: value.categoryId }),
      ...(category === undefined ? {} : { category }),
      ...(latitude === undefined ? {} : { latitude }),
      ...(longitude === undefined ? {} : { longitude }),
      ...(accuracy === undefined ? {} : { accuracy }),
      ...(address === undefined ? {} : { address }),
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
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum
    ) {
      throw new BadRequestException(
        `${field} must be a finite number between ${minimum} and ${maximum}`,
      );
    }
    return value;
  }
}
