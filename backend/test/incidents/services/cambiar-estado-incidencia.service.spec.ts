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

describe('Cambio de estado de incidencias', () => {
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

  it.each(['validated', 'rejected'] as const)(
    'pasa a %s con un cambio y conserva los datos originales',
    async (status) => {
      const original = await servicio.create(
        { title: 'Farola apagada', civicId: propietario, latitude: 36.7 },
        [],
      );
      expect(servicio.consultarCambiosEstado(original.id)).toEqual([]);
      const inicio = Date.now();
      const actualizada = servicio.cambiarEstado(original.id.toUpperCase(), {
        status,
        cause: '  Revisada por el equipo  ',
        civicId: actor.toUpperCase(),
      });
      expect(actualizada).toEqual({ ...original, status });
      expect(servicio.findOne(original.id)).toEqual(actualizada);
      expect(servicio.listarPorCiudadano(propietario)).toEqual([
        {
          id: original.id,
          title: original.title,
          status,
          createdAt: original.createdAt,
        },
      ]);
      const cambios = servicio.consultarCambiosEstado(original.id);
      expect(cambios).toHaveLength(1);
      expect(cambios[0]).toEqual({
        id: expect.any(String),
        incidenciaId: original.id,
        actorId: actor,
        nuevoEstado: status,
        motivo: 'Revisada por el equipo',
        fechaCreacion: expect.any(Date),
      });
      expect(cambios[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(cambios[0].fechaCreacion.getTime()).toBeGreaterThanOrEqual(inicio);
      expect(cambios[0].fechaCreacion.getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
      expect(actualizada).not.toHaveProperty('cambiosEstado');
      expect(original).not.toHaveProperty('cambiosEstado');
    },
  );

  it.each(['validated', 'rejected'] as const)(
    'rechaza nuevas transiciones desde %s sin duplicar historial',
    async (primero) => {
      const creada = await servicio.create(
        { title: 'Banco roto', civicId: propietario },
        [],
      );
      const entrada = {
        status: primero,
        cause: 'Motivo original',
        civicId: actor,
      };
      const actualizada = servicio.cambiarEstado(creada.id, entrada);
      const historial = servicio.consultarCambiosEstado(creada.id);
      for (const status of ['validated', 'rejected'] as const) {
        expect(() =>
          servicio.cambiarEstado(creada.id, { ...entrada, status }),
        ).toThrow(ConflictException);
      }
      expect(servicio.findOne(creada.id)).toEqual(actualizada);
      expect(servicio.consultarCambiosEstado(creada.id)).toEqual(historial);
    },
  );

  it('devuelve 404 para una incidencia ausente y para su historial', () => {
    expect(() =>
      servicio.cambiarEstado(propietario, {
        status: 'validated',
        cause: 'Revisada',
        civicId: actor,
      }),
    ).toThrow(NotFoundException);
    expect(() => servicio.consultarCambiosEstado(propietario)).toThrow(
      NotFoundException,
    );
  });

  it('un motivo vacío no publica ni estado ni historial', async () => {
    const creada = await servicio.create(
      { title: 'Banco roto', civicId: propietario },
      [],
    );
    expect(() =>
      servicio.cambiarEstado(creada.id, {
        status: 'rejected',
        cause: '   ',
        civicId: actor,
      }),
    ).toThrow(BadRequestException);
    expect(servicio.findOne(creada.id)).toEqual(creada);
    expect(servicio.consultarCambiosEstado(creada.id)).toEqual([]);
  });

  it('un fallo al construir la respuesta deja estado e historial sin cambios', async () => {
    const creada = await servicio.create(
      { title: 'Banco roto', civicId: propietario },
      [],
    );
    const fallo = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementationOnce(() => {
        throw new Error('Fallo de serialización');
      });
    expect(() =>
      servicio.cambiarEstado(creada.id, {
        status: 'validated',
        cause: 'Revisada',
        civicId: actor,
      }),
    ).toThrow('Fallo de serialización');
    fallo.mockRestore();
    expect(servicio.findOne(creada.id)).toEqual(creada);
    expect(servicio.consultarCambiosEstado(creada.id)).toEqual([]);
  });

  it('devuelve copias independientes del historial, incluyendo sus fechas', async () => {
    const creada = await servicio.create(
      { title: 'Banco roto', civicId: propietario },
      [],
    );
    servicio.cambiarEstado(creada.id, {
      status: 'validated',
      cause: 'Revisada',
      civicId: actor,
    });
    const original = servicio.consultarCambiosEstado(creada.id);
    const copia = servicio.consultarCambiosEstado(creada.id.toUpperCase());
    copia[0].motivo = 'Manipulado';
    copia[0].actorId = propietario;
    copia[0].fechaCreacion.setTime(0);
    copia.length = 0;
    expect(servicio.consultarCambiosEstado(creada.id)).toEqual(original);
  });

  it('solo acepta uno de dos intentos concurrentes en la misma instancia', async () => {
    const creada = await servicio.create(
      { title: 'Banco roto', civicId: propietario },
      [],
    );
    const resultados = await Promise.allSettled(
      (['validated', 'rejected'] as const).map((status) =>
        Promise.resolve().then(() =>
          servicio.cambiarEstado(creada.id, {
            status,
            cause: 'Revisada',
            civicId: actor,
          }),
        ),
      ),
    );
    expect(
      resultados.filter((resultado) => resultado.status === 'fulfilled'),
    ).toHaveLength(1);
    const rechazado = resultados.find(
      (resultado) => resultado.status === 'rejected',
    );
    expect(rechazado?.status === 'rejected' && rechazado.reason).toBeInstanceOf(
      ConflictException,
    );
    expect(servicio.consultarCambiosEstado(creada.id)).toHaveLength(1);
  });
});
