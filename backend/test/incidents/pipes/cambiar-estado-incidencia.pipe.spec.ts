import { BadRequestException } from '@nestjs/common';
import { CambiarEstadoIncidenciaPipe } from '../../../src/incidents/cambiar-estado-incidencia.pipe.js';

const entrada = {
  status: 'validated',
  cause: '  Revisada  ',
};
describe('Validación del cambio de estado', () => {
  const pipe = new CambiarEstadoIncidenciaPipe();
  it.each(['validated', 'rejected'])(
    'acepta %s y normaliza motivo y actor',
    async (status) => {
      expect(await pipe.transform({ ...entrada, status })).toEqual({
        status,
        cause: 'Revisada',
      });
      expect(entrada.cause).toBe('  Revisada  ');
    },
  );
  it.each([
    { ...entrada, civicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { ...entrada, userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    undefined,
    null,
    [],
    'texto',
    1,
    {},
    { ...entrada, status: undefined },
    { ...entrada, status: null },
    { ...entrada, status: 'reported' },
    { ...entrada, status: 'VALIDATED' },
    { ...entrada, status: [] },
    { ...entrada, cause: undefined },
    { ...entrada, cause: null },
    { ...entrada, cause: '' },
    { ...entrada, cause: ' \t\n ' },
    { ...entrada, cause: 1 },
    { ...entrada, cause: {} },
    { ...entrada, civicId: null },
    { ...entrada, civicId: 'incorrecto' },
    { ...entrada, civicId: [] },
    { ...entrada, civicId: {} },
    { ...entrada, actorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { ...entrada, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { ...entrada, fechaCreacion: '2026-10-23' },
    { ...entrada, cambiosEstado: [] },
  ])('rechaza el cuerpo inválido %#', async (cuerpo) => {
    await expect(pipe.transform(cuerpo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
