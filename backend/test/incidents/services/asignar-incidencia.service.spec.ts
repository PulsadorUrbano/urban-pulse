import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';
import type { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';

const departamento = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otroDepartamento = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const equipo = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const otroEquipo = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const equipoHermano = '99999999-9999-4999-8999-999999999999';
const tecnico = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function preparar() {
  const fila = {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    title: 'Farola apagada',
    description: null,
    civicId: departamento,
    categoryId: null,
    category: null,
    urbanAssetId: null,
    status: 'validated',
    priority: 'low',
    createdAt: new Date('2026-11-03'),
    departmentId: departamento,
    teamId: equipo,
    technicianId: tecnico,
    location: null,
    images: [],
  };
  const updateMany = vi.fn(
    async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      if (
        where.departmentId !== fila.departmentId ||
        where.teamId !== fila.teamId ||
        where.technicianId !== fila.technicianId
      )
        return { count: 0 };
      Object.assign(fila, data);
      return { count: 1 };
    },
  );
  const prisma = {
    incident: {
      findUnique: vi.fn(async ({ select }: { select?: object }) =>
        select
          ? {
              status: fila.status,
              departmentId: fila.departmentId,
              teamId: fila.teamId,
              technicianId: fila.technicianId,
            }
          : { ...fila },
      ),
      updateMany,
    },
    department: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        [departamento, otroDepartamento].includes(where.id)
          ? { id: where.id }
          : null,
      ),
    },
    team: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === equipo || where.id === equipoHermano
          ? { departmentId: departamento }
          : where.id === otroEquipo
            ? { departmentId: otroDepartamento }
            : null,
      ),
    },
    users: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === tecnico ? { id: tecnico } : null,
      ),
    },
    teamMember: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { userId_teamId: { userId: string; teamId: string } };
        }) =>
          where.userId_teamId.userId === tecnico &&
          where.userId_teamId.teamId === equipo
            ? { isTechnician: true }
            : null,
      ),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
  };
  const servicio = new IncidentsService(
    prisma as unknown as PrismaService,
    {} as UploadStorageService,
  );
  return { fila, servicio, updateMany, prisma };
}

describe('Asignación de incidencias', () => {
  it('cambiar departamento limpia equipo y técnico; se admite solo departamento', async () => {
    const { servicio, fila } = preparar();
    const respuesta = await servicio.asignar(fila.id, {
      departmentId: otroDepartamento,
    });
    expect(respuesta).toMatchObject({
      departmentId: otroDepartamento,
      teamId: null,
      technicianId: null,
      status: 'validated',
    });
    expect(fila).toMatchObject({
      departmentId: otroDepartamento,
      teamId: null,
      technicianId: null,
    });
  });

  it('quitar equipo limpia técnico y cambiar solo técnico conserva superiores', async () => {
    const primero = preparar();
    expect(
      await primero.servicio.asignar(primero.fila.id, { teamId: null }),
    ).toMatchObject({
      departmentId: departamento,
      teamId: null,
      technicianId: null,
    });
    const segundo = preparar();
    expect(
      await segundo.servicio.asignar(segundo.fila.id, {
        technicianId: tecnico,
      }),
    ).toMatchObject({
      departmentId: departamento,
      teamId: equipo,
      technicianId: tecnico,
    });
  });

  it('cambiar equipo dentro del mismo departamento limpia técnico', async () => {
    const { servicio, fila } = preparar();
    await expect(
      servicio.asignar(fila.id, { teamId: equipoHermano }),
    ).resolves.toMatchObject({
      departmentId: departamento,
      teamId: equipoHermano,
      technicianId: null,
    });
  });

  it('rechaza jerarquía cruzada e ID ausente sin escribir', async () => {
    const { servicio, fila, updateMany } = preparar();
    await expect(
      servicio.asignar(fila.id, { teamId: otroEquipo }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      servicio.asignar(fila.id, {
        departmentId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('sustituye la cadena completa en una petición', async () => {
    const { servicio, fila } = preparar();
    const respuesta = await servicio.asignar(fila.id, {
      departmentId: otroDepartamento,
      teamId: otroEquipo,
      technicianId: null,
    });
    expect(respuesta).toMatchObject({
      departmentId: otroDepartamento,
      teamId: otroEquipo,
      technicianId: null,
    });
  });

  it('repetir el mismo parche conserva toda la cadena', async () => {
    const { servicio, fila } = preparar();
    const anterior = { ...fila };
    await expect(
      servicio.asignar(fila.id, { departmentId: departamento }),
    ).resolves.toMatchObject({
      departmentId: departamento,
      teamId: equipo,
      technicianId: tecnico,
    });
    expect(fila).toEqual(anterior);
  });

  it('rechaza estados no editables e ID de técnico desconocido', async () => {
    const { servicio, fila, updateMany } = preparar();
    fila.status = 'reported';
    await expect(
      servicio.asignar(fila.id, { departmentId: otroDepartamento }),
    ).rejects.toBeInstanceOf(ConflictException);
    fila.status = 'validated';
    await expect(
      servicio.asignar(fila.id, {
        technicianId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('consulta opciones de asignación sin datos ficticios', async () => {
    const { servicio, prisma } = preparar();
    Object.assign(prisma.department, {
      findMany: vi.fn().mockResolvedValue([{ id: departamento, name: 'Vías' }]),
    });
    Object.assign(prisma.team, {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: equipo, name: 'Alumbrado', departmentId: departamento },
        ]),
    });
    Object.assign(prisma.teamMember, {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { teamId: equipo, user: { id: tecnico, username: 'Ana' } },
        ]),
    });
    await expect(servicio.opcionesAsignacion()).resolves.toEqual({
      departments: [{ id: departamento, name: 'Vías' }],
      teams: [{ id: equipo, name: 'Alumbrado', departmentId: departamento }],
      technicians: [{ id: tecnico, name: 'Ana', teamId: equipo }],
    });
  });

  it('rechaza asignar técnico sin equipo y conserva la incidencia', async () => {
    const { servicio, fila, updateMany } = preparar();
    fila.teamId = null;
    fila.technicianId = null;
    await expect(
      servicio.asignar(fila.id, { technicianId: tecnico }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('detecta un cambio concurrente sin sobrescribirlo', async () => {
    const { servicio, fila, updateMany, prisma } = preparar();
    prisma.incident.findUnique.mockImplementationOnce(async () => {
      fila.teamId = otroEquipo;
      return {
        status: 'validated',
        departmentId: departamento,
        teamId: equipo,
        technicianId: tecnico,
      };
    });
    await expect(
      servicio.asignar(fila.id, { technicianId: null }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).toHaveBeenCalledOnce();
    expect(fila.teamId).toBe(otroEquipo);
  });

  it('traduce un fallo transaccional y conserva la asignación anterior', async () => {
    const { servicio, fila, prisma } = preparar();
    const anterior = { ...fila };
    prisma.$transaction = async (
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      await callback(prisma);
      Object.assign(fila, anterior);
      throw new Error('fallo al confirmar');
    };
    await expect(
      servicio.asignar(fila.id, { departmentId: otroDepartamento }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fila).toEqual(anterior);
  });
});
