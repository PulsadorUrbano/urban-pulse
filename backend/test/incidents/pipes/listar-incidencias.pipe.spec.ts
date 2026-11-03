import { BadRequestException } from '@nestjs/common';
import { ListarIncidenciasPipe } from '../../../src/incidents/listar-incidencias.pipe.js';
describe('Listado propio sin identidad de consulta', () => {
  const pipe = new ListarIncidenciasPipe();
  it('acepta solo consulta vacía', async () => {
    await expect(
      Promise.resolve().then(() => pipe.transform({})),
    ).resolves.toBeUndefined();
  });
  it.each([
    undefined,
    null,
    [],
    1,
    'texto',
    { civicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { civicId: ['a', 'b'] },
    { civicId: { id: 'otro' } },
    { status: 'reported' },
    { userId: 'otro' },
  ])('rechaza suplantación o consulta inválida %#', async (consulta) => {
    await expect(
      Promise.resolve().then(() => pipe.transform(consulta)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
