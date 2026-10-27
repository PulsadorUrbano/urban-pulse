const operadorPrueba = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'admin',
  ciudadanoId: null,
} as const;
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
const propietario = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
describe('Asignación manual de prioridad', () => {
  let modulo: TestingModule;
  let servicio: IncidentsService;
  beforeEach(async () => {
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: UploadStorageService,
          useValue: {
            save: vi.fn().mockResolvedValue([
              {
                id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                url: '/uploads/imagen.png',
                mimeType: 'image/png',
                createdAt: '2026-10-23T08:00:00.000Z',
              },
            ]),
            remove: vi.fn(),
          },
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
  });
  afterEach(async () => {
    await modulo.close();
    vi.restoreAllMocks();
  });
  async function crearValidada() {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: propietario, latitude: 36.7 },
      [],
    );
    return servicio.cambiarEstado(
      creada.id,
      {
        status: 'validated',
        cause: 'Reporte confirmado',
      },
      actor,
    );
  }
  it('inicia low sin decisiones manuales ni atribución a IA', async () => {
    const creada = await servicio.create(
      { title: 'Banco roto', civicId: propietario },
      [],
    );
    expect(creada.priority).toBe('low');
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual([]);
    expect(creada).not.toHaveProperty('cambiosPrioridad');
  });
  it.each(['low', 'medium', 'high'] as const)(
    'asigna %s y conserva datos e historial de estado',
    async (priority) => {
      const validada = await crearValidada();
      const historialEstado = servicio.consultarCambiosEstado(validada.id);
      const inicio = Date.now();
      const actualizada = servicio.cambiarPrioridad(
        validada.id.toUpperCase(),
        {
          priority,
          cause: '  Riesgo revisado  ',
        },
        actor.toUpperCase(),
      );
      expect(actualizada).toEqual({ ...validada, priority });
      expect(servicio.findOne(validada.id, operadorPrueba)).toEqual(
        actualizada,
      );
      expect(servicio.consultarCambiosEstado(validada.id)).toEqual(
        historialEstado,
      );
      expect(servicio.listarPorCiudadano(propietario)).toEqual([
        {
          id: validada.id,
          title: validada.title,
          status: 'validated',
          createdAt: validada.createdAt,
        },
      ]);
      const cambios = servicio.consultarCambiosPrioridad(validada.id);
      expect(cambios).toHaveLength(1);
      expect(cambios[0]).toEqual({
        id: expect.any(String),
        incidenciaId: validada.id,
        actorId: actor,
        esManual: true,
        nuevaPrioridad: priority,
        motivo: 'Riesgo revisado',
        fechaCreacion: expect.any(Date),
      });
      expect(cambios[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(cambios[0].fechaCreacion.getTime()).toBeGreaterThanOrEqual(inicio);
      expect(cambios[0].fechaCreacion.getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    },
  );
  it.each(['reported', 'rejected'] as const)(
    'bloquea %s sin cambios',
    async (status) => {
      let creada = await servicio.create(
        { title: 'Banco roto', civicId: propietario },
        [],
      );
      if (status === 'rejected')
        creada = servicio.cambiarEstado(
          creada.id,
          {
            status,
            cause: 'Duplicada',
          },
          actor,
        );
      const historialEstado = servicio.consultarCambiosEstado(creada.id);
      expect(() =>
        servicio.cambiarPrioridad(
          creada.id,
          {
            priority: 'high',
            cause: 'Revisada',
          },
          actor,
        ),
      ).toThrow(ConflictException);
      expect(servicio.findOne(creada.id, operadorPrueba)).toEqual(creada);
      expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual([]);
      expect(servicio.consultarCambiosEstado(creada.id)).toEqual(
        historialEstado,
      );
    },
  );
  it('devuelve 404 si la incidencia o su historial no existen', () => {
    expect(() =>
      servicio.cambiarPrioridad(
        propietario,
        {
          priority: 'high',
          cause: 'Revisada',
        },
        actor,
      ),
    ).toThrow(NotFoundException);
    expect(() => servicio.consultarCambiosPrioridad(propietario)).toThrow(
      NotFoundException,
    );
  });
  it('un motivo vacío no modifica prioridad ni historial', async () => {
    const creada = await crearValidada();
    expect(() =>
      servicio.cambiarPrioridad(
        creada.id,
        {
          priority: 'high',
          cause: '   ',
        },
        actor,
      ),
    ).toThrow(BadRequestException);
    expect(servicio.findOne(creada.id, operadorPrueba)).toEqual(creada);
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual([]);
  });
  it('un fallo de serialización no publica modificaciones parciales', async () => {
    const creada = await crearValidada();
    const fallo = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementationOnce(() => {
        throw new Error('Fallo de serialización');
      });
    expect(() =>
      servicio.cambiarPrioridad(
        creada.id,
        {
          priority: 'high',
          cause: 'Revisada',
        },
        actor,
      ),
    ).toThrow('Fallo de serialización');
    fallo.mockRestore();
    expect(servicio.findOne(creada.id, operadorPrueba)).toEqual(creada);
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual([]);
  });
  it('permite reevaluar la misma prioridad y conserva cada decisión y su actor', async () => {
    const creada = await crearValidada();
    servicio.cambiarPrioridad(
      creada.id,
      {
        priority: 'high',
        cause: 'Primer análisis',
      },
      actor,
    );
    const primero = servicio.consultarCambiosPrioridad(creada.id)[0];
    servicio.cambiarPrioridad(
      creada.id,
      {
        priority: 'high',
        cause: 'Segundo análisis',
      },
      propietario,
    );
    const cambios = servicio.consultarCambiosPrioridad(creada.id);
    expect(cambios).toHaveLength(2);
    expect(cambios[0]).toEqual(primero);
    expect(cambios[1]).toMatchObject({
      nuevaPrioridad: 'high',
      motivo: 'Segundo análisis',
      actorId: propietario,
      esManual: true,
    });
    expect(cambios[1].id).not.toBe(primero.id);
  });
  it('no pierde decisiones de dos peticiones concurrentes en la misma instancia', async () => {
    const creada = await crearValidada();
    const resultados = await Promise.all(
      (['medium', 'high'] as const).map((priority) =>
        Promise.resolve().then(() =>
          servicio.cambiarPrioridad(
            creada.id,
            {
              priority,
              cause: 'Revisada',
            },
            actor,
          ),
        ),
      ),
    );
    expect(resultados.map((incidencia) => incidencia.priority)).toEqual([
      'medium',
      'high',
    ]);
    expect(
      servicio
        .consultarCambiosPrioridad(creada.id)
        .map((cambio) => cambio.nuevaPrioridad),
    ).toEqual(['medium', 'high']);
    expect(servicio.findOne(creada.id, operadorPrueba).priority).toBe('high');
  });
  it('aísla las copias del historial y sus fechas', async () => {
    const creada = await crearValidada();
    servicio.cambiarPrioridad(
      creada.id,
      {
        priority: 'high',
        cause: 'Revisada',
      },
      actor,
    );
    const original = servicio.consultarCambiosPrioridad(creada.id);
    const copia = servicio.consultarCambiosPrioridad(creada.id.toUpperCase());
    copia[0].motivo = 'Manipulado';
    copia[0].esManual = false;
    copia[0].actorId = propietario;
    copia[0].fechaCreacion.setTime(0);
    copia.length = 0;
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual(original);
  });
  it('un intento de cambiar estado posterior no altera prioridad ni su historial', async () => {
    const creada = await crearValidada();
    const actualizada = servicio.cambiarPrioridad(
      creada.id,
      {
        priority: 'high',
        cause: 'Revisada',
      },
      actor,
    );
    const historial = servicio.consultarCambiosPrioridad(creada.id);
    expect(() =>
      servicio.cambiarEstado(
        creada.id,
        {
          status: 'rejected',
          cause: 'Revisión',
        },
        actor,
      ),
    ).toThrow(ConflictException);
    expect(servicio.findOne(creada.id, operadorPrueba)).toEqual(actualizada);
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual(historial);
  });
});
