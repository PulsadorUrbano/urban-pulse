import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { GeocodificacionInversaService } from '../../../src/incidents/services/geocodificacion-inversa.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { crearGeocodificadorInversoFalso } from './geocodificador-inverso.fake.js';
import { crearPrismaIncidenciasFake } from './prisma-incidencias.fake.js';

const propietario = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const operador = { id: actor, role: 'admin', ciudadanoId: null } as const;

describe('Cambio de estado de incidencias', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;

  async function configurar(falloCrearCambioEstado?: Error) {
    const prisma = crearPrismaIncidenciasFake({ falloCrearCambioEstado });
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
        {
          provide: GeocodificacionInversaService,
          useValue: crearGeocodificadorInversoFalso(),
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  }

  afterEach(async () => {
    await modulo.close();
  });

  it.each(['validated', 'rejected'] as const)(
    'cambia a %s y persiste el historial',
    async (status) => {
      await configurar();
      const creada = await servicio.create({
        category: 'Iluminación',
        latitude: 36.72,
        longitude: -4.42,
        title: 'Farola apagada',
        civicId: propietario,
      });
      const actualizada = await servicio.cambiarEstado(
        creada.id,
        { status, cause: '  Revisada por el equipo  ' },
        { id: actor.toLowerCase(), role: 'admin', ciudadanoId: null },
      );

      expect(actualizada).toEqual({ ...creada, status });
      await expect(servicio.findOne(creada.id, operador)).resolves.toEqual(
        actualizada,
      );
      await expect(
        servicio.consultarCambiosEstado(creada.id),
      ).resolves.toMatchObject([
        { nuevoEstado: 'reported', actorId: propietario },
        {
          incidenciaId: creada.id,
          actorId: actor,
          nuevoEstado: status,
          motivo: 'Revisada por el equipo',
        },
      ]);
    },
  );

  it('solo permite una de dos transiciones concurrentes desde reported', async () => {
    await configurar();
    const creada = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Banco roto',
      civicId: propietario,
    });
    const resultados = await Promise.allSettled(
      (['validated', 'rejected'] as const).map((status) =>
        servicio.cambiarEstado(
          creada.id,
          { status, cause: 'Revisada' },
          { id: actor, role: 'admin', ciudadanoId: null },
        ),
      ),
    );
    expect(
      resultados.filter((resultado) => resultado.status === 'fulfilled'),
    ).toHaveLength(1);
    const rechazo = resultados.find(
      (resultado) => resultado.status === 'rejected',
    );
    expect(rechazo?.status === 'rejected' && rechazo.reason).toBeInstanceOf(
      ConflictException,
    );
    await expect(
      servicio.consultarCambiosEstado(creada.id),
    ).resolves.toHaveLength(2);
  });

  it('devuelve 404 para una incidencia ausente', async () => {
    await configurar();
    await expect(
      servicio.cambiarEstado(
        propietario,
        { status: 'validated', cause: 'Revisada' },
        { id: actor, role: 'admin', ciudadanoId: null },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza motivos vacíos sin cambiar el estado', async () => {
    await configurar();
    const creada = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Banco roto',
      civicId: propietario,
    });
    await expect(
      servicio.cambiarEstado(
        creada.id,
        { status: 'rejected', cause: '   ' },
        { id: actor, role: 'admin', ciudadanoId: null },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(servicio.findOne(creada.id, operador)).resolves.toEqual(
      creada,
    );
  });

  it('revierte el cambio de estado si falla el alta de historial', async () => {
    await configurar(new Error('constraint detail must not leak'));
    const creada = await servicio.create({
      category: 'Iluminación',
      latitude: 36.72,
      longitude: -4.42,
      title: 'Banco roto',
      civicId: propietario,
    });
    await expect(
      servicio.cambiarEstado(
        creada.id,
        { status: 'validated', cause: 'Revisada' },
        { id: actor, role: 'admin', ciudadanoId: null },
      ),
    ).rejects.toMatchObject({
      status: 503,
      message: 'El almacenamiento de incidencias no está disponible.',
    });
    await expect(servicio.findOne(creada.id, operador)).resolves.toEqual(
      creada,
    );
    await expect(servicio.consultarCambiosEstado(creada.id)).resolves.toEqual([
      expect.objectContaining({ nuevoEstado: 'reported' }),
    ]);
  });
});

describe('Matriz de estados y permisos', () => {
  const usuario = {
    id: actor,
    role: 'technician',
    ciudadanoId: propietario,
    equipoId: propietario,
    esTecnico: true,
  } as const;
  it.each([
    ['assigned', 'in_progress', usuario],
    ['in_progress', 'resolved', usuario],
    ['resolved', 'closed', operador],
    ['resolved', 'reopened', operador],
    ['closed', 'reopened', operador],
  ] as const)(
    'autoriza %s a %s con actor válido',
    async (origen, destino, actorActual) => {
      const fake = crearPrismaIncidenciasFake();
      const servicio = new IncidentsService(
        fake.prisma,
        crearGeocodificadorInversoFalso(),
      );
      const creada = await servicio.create({
        title: 'Banco roto',
        civicId: propietario,
        category: 'Iluminación',
        latitude: 0,
        longitude: 0,
      });
      Object.assign(fake.incidencias[0], {
        status: origen,
        departmentId: propietario,
        teamId: propietario,
        technicianId: actor,
      });
      await expect(
        servicio.cambiarEstado(
          creada.id,
          { status: destino, cause: 'Actuación comprobada' },
          actorActual,
        ),
      ).resolves.toMatchObject({ status: destino });
      expect(fake.cambiosEstado.at(-1)).toMatchObject({
        actorId: actor,
        nuevoEstado: destino,
      });
    },
  );
  it('un técnico distinto no puede resolver y no altera el historial', async () => {
    const fake = crearPrismaIncidenciasFake();
    const servicio = new IncidentsService(
      fake.prisma,
      crearGeocodificadorInversoFalso(),
    );
    const creada = await servicio.create({
      title: 'Banco roto',
      civicId: propietario,
      category: 'Iluminación',
      latitude: 0,
      longitude: 0,
    });
    Object.assign(fake.incidencias[0], {
      status: 'in_progress',
      teamId: propietario,
      technicianId: propietario,
    });
    await expect(
      servicio.cambiarEstado(
        creada.id,
        { status: 'resolved', cause: 'Reparada' },
        usuario,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(fake.incidencias[0].status).toBe('in_progress');
    expect(fake.cambiosEstado).toHaveLength(1);
  });
});
