import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';
import { crearGeocodificadorInversoFalso } from './geocodificador-inverso.fake.js';

const departamento = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const equipo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tecnico = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const operador: UsuarioIncidencias = {
  id: tecnico,
  role: 'admin',
  ciudadanoId: null,
};
function preparar() {
  const fila = {
    id: tecnico,
    title: 'Farola apagada',
    description: null,
    civicId: tecnico,
    categoryId: equipo,
    categoria: { name: 'Alumbrado público' },
    urbanAssetId: null,
    createdAt: new Date(),
    location: {
      latitude: 36.72,
      longitude: -4.42,
      accuracy: null,
      createdAt: new Date(),
      address: null,
    },
    status: 'validated',
    priority: 'low',
    departmentId: departamento as string | null,
    teamId: equipo as string | null,
    technicianId: null as string | null,
  };
  const historial: unknown[] = [];
  const estados: unknown[] = [];
  const prisma = {
    incident: {
      findUnique: vi.fn(async () => ({ ...fila })),
      updateMany: vi.fn(async ({ data }: { data: object }) => {
        Object.assign(fila, data);
        return { count: 1 };
      }),
    },
    department: { findUnique: vi.fn(async () => ({ id: departamento })) },
    team: { findUnique: vi.fn(async () => ({ departmentId: departamento })) },
    user: { findUnique: vi.fn(async () => ({ id: tecnico })) },
    teamMember: {
      findUnique: vi.fn(async () => ({ isTechnician: true, isActive: true })),
    },
    cambioAsignacion: {
      create: vi.fn(async ({ data }: { data: object }) => {
        historial.push(data);
        return data;
      }),
      findMany: vi.fn(async () => historial),
    },
    cambioEstado: {
      create: vi.fn(async ({ data }: { data: object }) => {
        estados.push(data);
        return data;
      }),
    },
    $transaction: async (operacion: (tx: unknown) => Promise<unknown>) => {
      const anterior = structuredClone(fila);
      const n = historial.length;
      const e = estados.length;
      try {
        return await operacion(prisma);
      } catch (error) {
        Object.assign(fila, anterior);
        historial.splice(n);
        estados.splice(e);
        throw error;
      }
    },
  };
  return {
    servicio: new IncidentsService(
      prisma as unknown as PrismaService,
      crearGeocodificadorInversoFalso(),
    ),
    fila,
    historial,
    estados,
    prisma,
  };
}
describe('Asignación auditada', () => {
  it('guarda actor, motivo y valores anteriores y nuevos junto al estado', async () => {
    const p = preparar();
    const respuesta = await p.servicio.asignar(
      tecnico,
      { technicianId: tecnico, cause: 'Asignar intervención' },
      operador,
    );
    expect(respuesta.status).toBe('assigned');
    expect(p.historial).toEqual([
      expect.objectContaining({
        actorId: tecnico,
        motivo: 'Asignar intervención',
        departamentoAnteriorId: departamento,
        equipoAnteriorId: equipo,
        tecnicoAnteriorId: null,
        departamentoNuevoId: departamento,
        equipoNuevoId: equipo,
        tecnicoNuevoId: tecnico,
      }),
    ]);
    expect(p.estados).toEqual([
      expect.objectContaining({ nuevoEstado: 'assigned' }),
    ]);
  });
  it('audita la asignación sin comentarios adicionales', async () => {
    const p = preparar();
    const respuesta = await p.servicio.asignar(
      tecnico,
      { technicianId: tecnico },
      operador,
    );

    expect(respuesta.status).toBe('assigned');
    expect(p.historial).toEqual([
      expect.objectContaining({ actorId: tecnico, motivo: null }),
    ]);
    expect(p.estados).toEqual([
      expect.objectContaining({
        nuevoEstado: 'assigned',
        motivo: 'Asignación de incidencia',
      }),
    ]);
  });

  it('revierte asignación si falla el historial', async () => {
    const p = preparar();
    p.prisma.cambioAsignacion.create.mockRejectedValueOnce(new Error('Fallo'));
    await expect(
      p.servicio.asignar(
        tecnico,
        { technicianId: tecnico, cause: 'Asignar' },
        operador,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(p.fila).toMatchObject({ status: 'validated', technicianId: null });
    expect(p.historial).toEqual([]);
  });
  it('impide operar sobre otro departamento', async () => {
    const p = preparar();
    await expect(
      p.servicio.asignar(
        tecnico,
        { technicianId: tecnico, cause: 'Asignar' },
        { ...operador, role: 'department', departamentoId: equipo },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(p.historial).toEqual([]);
  });
  it('permite al departamento operar dentro de su ámbito', async () => {
    const p = preparar();
    await expect(
      p.servicio.asignar(
        tecnico,
        { technicianId: tecnico, cause: 'Asignar' },
        { ...operador, role: 'department', departamentoId: departamento },
      ),
    ).resolves.toMatchObject({ status: 'assigned' });
  });
  it.each(['in_progress', 'resolved', 'closed', 'rejected', 'reported'])(
    'impide asignar desde %s',
    async (status) => {
      const p = preparar();
      p.fila.status = status;
      await expect(
        p.servicio.asignar(
          tecnico,
          { technicianId: tecnico, cause: 'Asignar' },
          operador,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
  it('exige equipo y no genera un cambio parcial', async () => {
    const p = preparar();
    await expect(
      p.servicio.asignar(tecnico, { teamId: null, cause: 'Retirar' }, operador),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('no pisa una asignación concurrente ni genera historial', async () => {
    const p = preparar();
    p.prisma.incident.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      p.servicio.asignar(
        tecnico,
        { technicianId: tecnico, cause: 'Asignar' },
        operador,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(p.historial).toEqual([]);
  });
  it('rechaza miembros inactivos', async () => {
    const p = preparar();
    p.prisma.teamMember.findUnique.mockResolvedValueOnce({
      isTechnician: true,
      isActive: false,
    });
    await expect(
      p.servicio.asignar(
        tecnico,
        { technicianId: tecnico, cause: 'Asignar' },
        operador,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
