import { BadRequestException } from '@nestjs/common';
import { AsignarIncidenciaPipe } from '../../../src/incidents/asignar-incidencia.pipe.js';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('AsignarIncidenciaPipe', () => {
  const pipe = new AsignarIncidenciaPipe();

  it.each([
    {},
    null,
    [],
    { status: 'assigned' },
    { teamId: 1 },
    { technicianId: 'mal' },
    { departmentId: undefined },
  ])('rechaza cuerpo inválido %j', async (entrada) => {
    await expect(pipe.transform(entrada)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('admite un subconjunto de UUID y null y normaliza los UUID', async () => {
    await expect(
      pipe.transform({ departmentId: id.toUpperCase(), technicianId: null }),
    ).resolves.toEqual({ departmentId: id, technicianId: null });
  });
});
