import { BadRequestException } from '@nestjs/common';
import { CambiarPrioridadIncidenciaPipe } from '../../../src/incidents/cambiar-prioridad-incidencia.pipe.js';
const entrada = {
  priority: 'high',
  cause: '  Riesgo para peatones  ',
  civicId: 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB',
};
describe('Validación de prioridad manual', () => {
  const pipe = new CambiarPrioridadIncidenciaPipe();
  it.each(['low', 'medium', 'high'])(
    'acepta %s y normaliza motivo y actor',
    async (priority) => {
      expect(await pipe.transform({ ...entrada, priority })).toEqual({
        priority,
        cause: 'Riesgo para peatones',
        civicId: entrada.civicId.toLowerCase(),
      });
      expect(entrada.cause).toBe('  Riesgo para peatones  ');
    },
  );
  it.each([
    undefined,
    null,
    [],
    'texto',
    42,
    {},
    { ...entrada, priority: undefined },
    { ...entrada, priority: null },
    { ...entrada, priority: 'urgent' },
    { ...entrada, priority: 'HIGH' },
    { ...entrada, priority: [] },
    { ...entrada, priority: 'Alta' },
    { ...entrada, cause: undefined },
    { ...entrada, cause: null },
    { ...entrada, cause: '' },
    { ...entrada, cause: ' \t\n ' },
    { ...entrada, cause: 1 },
    { ...entrada, cause: {} },
    { ...entrada, civicId: undefined },
    { ...entrada, civicId: null },
    { ...entrada, civicId: 'inválido' },
    { ...entrada, civicId: [] },
    { ...entrada, civicId: {} },
    ...[
      'esManual',
      'isManual',
      'is_manual',
      'actorId',
      'id',
      'status',
      'fechaCreacion',
      'cambiosPrioridad',
    ].map((campo) => ({ ...entrada, [campo]: true })),
  ])('rechaza el cuerpo inválido %#', async (cuerpo) => {
    await expect(pipe.transform(cuerpo)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
