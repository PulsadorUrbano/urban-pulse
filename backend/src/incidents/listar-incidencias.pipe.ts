import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ListarIncidenciasPipe implements PipeTransform<
  unknown,
  Promise<string | undefined>
> {
  private readonly validadorUuid = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('civicId debe ser un UUID válido'),
  });

  async transform(consulta: unknown): Promise<string | undefined> {
    if (
      typeof consulta !== 'object' ||
      consulta === null ||
      Array.isArray(consulta) ||
      Object.keys(consulta).some((campo) => campo !== 'civicId')
    ) {
      throw new BadRequestException(
        'La consulta debe estar vacía o contener únicamente un civicId de tipo texto',
      );
    }

    if (!('civicId' in consulta)) return undefined;
    if (typeof consulta.civicId !== 'string') {
      throw new BadRequestException(
        'La consulta debe estar vacía o contener únicamente un civicId de tipo texto',
      );
    }

    await this.validadorUuid.transform(consulta.civicId, {
      type: 'query',
      data: 'civicId',
    });
    return consulta.civicId.toLowerCase();
  }
}
