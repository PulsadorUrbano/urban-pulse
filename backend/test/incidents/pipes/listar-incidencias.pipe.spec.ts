import { BadRequestException } from '@nestjs/common';
import { ListarIncidenciasPipe } from '../../../src/incidents/listar-incidencias.pipe.js';

describe('Validación de la consulta de incidencias', () => {
  const pipe = new ListarIncidenciasPipe();

  it('acepta una consulta vacía', () => {
    expect(pipe.transform({})).toBeUndefined();
  });

  it.each([
    ['sin consulta', undefined],
    ['consulta nula', null],
    ['consulta primitiva', 'ciudadano'],
    ['consulta como array', []],
    ['filtro vacío', { civicId: '' }],
    ['filtro nulo', { civicId: null }],
    ['filtro numérico', { civicId: 27 }],
    ['UUID incorrecto', { civicId: 'ciudadano' }],
    ['UUID con espacios', { civicId: ' aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
    ['filtro repetido', { civicId: ['a', 'a'] }],
    ['filtro anidado', { civicId: { id: 'a' } }],
    ['parámetro desconocido', { status: 'reported' }],
  ])('rechaza %s', (_caso, consulta) => {
    expect(() => pipe.transform(consulta)).toThrow(BadRequestException);
  });
});
