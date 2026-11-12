import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { crearPrismaIncidenciasFake } from './prisma-incidencias.fake.js';

const propietario = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const operador = { id: actor, role: 'admin', ciudadanoId: null } as const;

describe('Asignación manual de prioridad', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;

  beforeEach(async () => {
    const prisma = crearPrismaIncidenciasFake();
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: prisma.prisma },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  });

  afterEach(async () => {
    await modulo.close();
  });

  async function crearValidada() {
    const creada = await servicio.create({
      title: 'Farola apagada',
      civicId: propietario,
    });
    return servicio.cambiarEstado(
      creada.id,
      { status: 'validated', cause: 'Reporte confirmado' },
      actor,
    );
  }

  it('inicia low y persiste cada asignación con su historial', async () => {
    const validada = await crearValidada();
    for (const priority of ['low', 'medium', 'high'] as const) {
      await servicio.cambiarPrioridad(
        validada.id,
        { priority, cause: `Motivo ${priority}` },
        actor,
      );
    }
    await expect(
      servicio.findOne(validada.id, operador),
    ).resolves.toMatchObject({
      status: 'validated',
      priority: 'high',
    });
    await expect(
      servicio.consultarCambiosPrioridad(validada.id),
    ).resolves.toMatchObject([
      {
        nuevaPrioridad: 'low',
        motivo: 'Motivo low',
        actorId: actor,
        esManual: true,
      },
      {
        nuevaPrioridad: 'medium',
        motivo: 'Motivo medium',
        actorId: actor,
        esManual: true,
      },
      {
        nuevaPrioridad: 'high',
        motivo: 'Motivo high',
        actorId: actor,
        esManual: true,
      },
    ]);
  });

  it.each(['reported', 'rejected'] as const)(
    'bloquea una incidencia en estado %s',
    async (status) => {
      const creada = await servicio.create({
        title: 'Banco roto',
        civicId: propietario,
      });
      if (status === 'rejected') {
        await servicio.cambiarEstado(
          creada.id,
          { status, cause: 'Duplicada' },
          actor,
        );
      }
      await expect(
        servicio.cambiarPrioridad(
          creada.id,
          { priority: 'high', cause: 'Revisada' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        servicio.consultarCambiosPrioridad(creada.id),
      ).resolves.toEqual([]);
    },
  );

  it('devuelve 404 si la incidencia no existe', async () => {
    await expect(
      servicio.cambiarPrioridad(
        propietario,
        { priority: 'high', cause: 'Revisada' },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza un motivo vacío sin escribir prioridad ni historial', async () => {
    const creada = await crearValidada();
    await expect(
      servicio.cambiarPrioridad(
        creada.id,
        { priority: 'high', cause: '   ' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(servicio.findOne(creada.id, operador)).resolves.toEqual(
      creada,
    );
    await expect(
      servicio.consultarCambiosPrioridad(creada.id),
    ).resolves.toEqual([]);
  });

  it('no pierde dos decisiones de prioridad sobre una incidencia validada', async () => {
    const creada = await crearValidada();
    await Promise.all(
      (['medium', 'high'] as const).map((priority) =>
        servicio.cambiarPrioridad(
          creada.id,
          { priority, cause: 'Revisada' },
          actor,
        ),
      ),
    );
    await expect(
      servicio.consultarCambiosPrioridad(creada.id),
    ).resolves.toHaveLength(2);
  });
});
