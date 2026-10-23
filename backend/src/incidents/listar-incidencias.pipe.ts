import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  type PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ListarIncidenciasPipe implements PipeTransform<
  unknown,
  Promise<string>
> {
  private readonly validadorUuid = new ParseUUIDPipe({
    exceptionFactory: () =>
      new BadRequestException('civicId debe ser un UUID válido'),
  });

  async transform(consulta: unknown): Promise<string> {
    if (
      typeof consulta !== 'object' ||
      consulta === null ||
      Array.isArray(consulta) ||
      Object.keys(consulta).some((campo) => campo !== 'civicId') ||
      !('civicId' in consulta) ||
      typeof consulta.civicId !== 'string'
    ) {
      throw new BadRequestException(
        'La consulta debe contener únicamente un civicId de tipo texto',
      );
    }

    await this.validadorUuid.transform(consulta.civicId, {
      type: 'query',
      data: 'civicId',
    });
    return consulta.civicId.toLowerCase();
  }
}
