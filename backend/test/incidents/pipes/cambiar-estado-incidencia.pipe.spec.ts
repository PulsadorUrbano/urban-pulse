import { BadRequestException } from '@nestjs/common';
import { CambiarEstadoIncidenciaPipe } from '../../../src/incidents/cambiar-estado-incidencia.pipe.js';

const entrada = {
  status: 'validated',
  cause: '  Revisada  ',
  civicId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
};
describe('Validación del cambio de estado', () => {
  const pipe = new CambiarEstadoIncidenciaPipe();
  it.each(['validated', 'rejected'])(
    'acepta %s y normaliza motivo y actor',
    async (status) => {
      expect(await pipe.transform({ ...entrada, status })).toEqual({
        status,
        cause: 'Revisada',
        civicId: entrada.civicId.toLowerCase(),
      });
      expect(entrada.cause).toBe('  Revisada  ');
    },
  );
  it.each([
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
    { ...entrada, civicId: undefined },
    { ...entrada, civicId: null },
    { ...entrada, civicId: 'incorrecto' },
    { ...entrada, civicId: [] },
    { ...entrada, civicId: {} },
    { ...entrada, actorId: entrada.civicId },
    { ...entrada, id: entrada.civicId },
    { ...entrada, fechaCreacion: '2026-10-23' },
    { ...entrada, cambiosEstado: [] },
  ])('rechaza el cuerpo inválido %#', async (cuerpo) => {
    await expect(pipe.transform(cuerpo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
