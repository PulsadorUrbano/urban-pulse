import { BadRequestException } from '@nestjs/common';
import { ListarIncidenciasPipe } from '../../../src/incidents/listar-incidencias.pipe.js';

describe('Validación de la consulta de incidencias', () => {
  const pipe = new ListarIncidenciasPipe();

  it('acepta un único UUID y normaliza sus mayúsculas', async () => {
    await expect(
      pipe.transform({ civicId: idCiudadano.toUpperCase() }),
    ).resolves.toMatchObject({ civicId: idCiudadano, limit: 10 });
  });

  it('aplica el límite predeterminado de 10 en la primera página', async () => {
    await expect(pipe.transform({})).resolves.toEqual({ limit: 10 });
  });

  it.each([
    ['límite mínimo', '1', 1],
    ['límite máximo', '100', 100],
  ])('acepta el %s', async (_caso, limit, esperado) => {
    await expect(pipe.transform({ limit })).resolves.toMatchObject({ limit: esperado });
  });

  it('rechaza límites inválidos y cursores mal formados', async () => {
    await expect(pipe.transform({ limit: '0' })).rejects.toThrow(BadRequestException);
    await expect(pipe.transform({ limit: '101' })).rejects.toThrow(BadRequestException);
    await expect(pipe.transform({ limit: '1.5' })).rejects.toThrow(BadRequestException);
    await expect(pipe.transform({ cursor: 'invalido' })).rejects.toThrow(BadRequestException);
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
