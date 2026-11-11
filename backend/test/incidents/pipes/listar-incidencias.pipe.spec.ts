import { BadRequestException } from '@nestjs/common';
import { ListarIncidenciasPipe } from '../../../src/incidents/listar-incidencias.pipe.js';

const idCiudadano = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Validación de la consulta de incidencias', () => {
  const pipe = new ListarIncidenciasPipe();

  it('acepta un único UUID y normaliza sus mayúsculas', async () => {
    await expect(
      pipe.transform({ civicId: idCiudadano.toUpperCase() }),
    ).resolves.toBe(idCiudadano);
  });

  it.each([
    ['sin consulta', undefined],
    ['consulta nula', null],
    ['consulta primitiva', idCiudadano],
    ['consulta como array', []],
    ['filtro omitido', {}],
    ['filtro vacío', { civicId: '' }],
    ['filtro nulo', { civicId: null }],
    ['filtro numérico', { civicId: 27 }],
    ['UUID incorrecto', { civicId: 'ciudadano' }],
    ['UUID con espacios', { civicId: ' ' + idCiudadano }],
    ['filtro repetido', { civicId: [idCiudadano, idCiudadano] }],
    ['filtro anidado', { civicId: { id: idCiudadano } }],
    ['parámetro desconocido', { civicId: idCiudadano, status: 'reported' }],
  ])('rechaza %s', async (_caso, consulta) => {
    await expect(pipe.transform(consulta)).rejects.toThrow(BadRequestException);
  });
});
