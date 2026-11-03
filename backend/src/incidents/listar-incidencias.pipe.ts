import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
@Injectable()
export class ListarIncidenciasPipe implements PipeTransform<unknown, void> {
  transform(consulta: unknown): void {
    if (
      typeof consulta !== 'object' ||
      consulta === null ||
      Array.isArray(consulta) ||
      Object.keys(consulta).length !== 0
    ) {
      throw new BadRequestException(
        'El listado propio no admite parámetros de consulta',
      );
    }
  }
}
