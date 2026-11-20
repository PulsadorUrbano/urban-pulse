import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import { IncidentsController } from '../../../src/incidents/incidents.controller.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { IncidentsService } from '../../../src/incidents/incidents.service.js';
import type { FotosIncidenciaService } from '../../../src/incidents/services/fotos-incidencia.service.js';
import type { Response } from 'express';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';

describe('IncidentsController autenticado', () => {
  const civic: UsuarioIncidencias = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    role: 'civic',
    ciudadanoId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  };
  const operador: UsuarioIncidencias = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    role: 'admin',
    ciudadanoId: null,
  };
  const incidencia = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    images: [],
  };
  const servicio = {
    create: vi.fn().mockResolvedValue(incidencia),
    cambiarEstado: vi.fn().mockResolvedValue(incidencia),
    cambiarPrioridad: vi.fn().mockResolvedValue(incidencia),
    opcionesAsignacion: vi
      .fn()
      .mockResolvedValue({ departments: [], teams: [], technicians: [] }),
    asignar: vi.fn().mockResolvedValue(incidencia),
    findOne: vi.fn().mockResolvedValue(incidencia),
  };
  const fotos = {
    subir: vi.fn().mockResolvedValue([]),
    listar: vi.fn().mockResolvedValue([]),
    agregarA: vi
      .fn()
      .mockImplementation(async (incidencia: unknown) => incidencia),
  };
  const controlador = new IncidentsController(
    servicio as unknown as IncidentsService,
    fotos as unknown as FotosIncidenciaService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('deriva propietario y actor de la identidad autorizada', async () => {
    await controlador.create(
      { title: 'Farola apagada' },
      { setHeader: vi.fn() } as never,
      civic,
    );
    await controlador.cambiarEstado(
      incidencia.id,
      { status: 'validated', cause: 'Comprobada' },
      operador,
    );
    await controlador.cambiarPrioridad(
      incidencia.id,
      { priority: 'high', cause: 'Urgente' },
      operador,
    );

    expect(servicio.create).toHaveBeenCalledWith({
      title: 'Farola apagada',
      civicId: civic.ciudadanoId,
    });
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(
      incidencia.id,
      { status: 'validated', cause: 'Comprobada' },
      operador,
    );
    expect(servicio.cambiarPrioridad).toHaveBeenCalledWith(
      incidencia.id,
      { priority: 'high', cause: 'Urgente' },
      operador.id,
    );
  });

  it('rechaza crear sin ciudadano vinculado', async () => {
    const sinVinculo = { ...civic, ciudadanoId: null };
    await expect(
      controlador.create(
        { title: 'Farola apagada' },
        { setHeader: vi.fn() } as never,
        sinVinculo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirma los tres PATCH y devuelve images vacío si falla la firma de fotos', async () => {
    const fallo = new Error('Firma temporal no disponible');
    const servicios = {
      cambiarEstado: vi.fn().mockResolvedValue(incidencia),
      cambiarPrioridad: vi.fn().mockResolvedValue(incidencia),
      asignar: vi.fn().mockResolvedValue(incidencia),
    };
    const fotosFallando = {
      listar: vi.fn().mockRejectedValue(fallo),
      agregarA: vi.fn().mockRejectedValue(fallo),
    };
    const controladorConFallo = new IncidentsController(
      servicios as unknown as IncidentsService,
      fotosFallando as unknown as FotosIncidenciaService,
    );
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const estado = await controladorConFallo.cambiarEstado(
        incidencia.id,
        { status: 'validated', cause: 'Comprobada' },
        operador,
      );
      const prioridad = await controladorConFallo.cambiarPrioridad(
        incidencia.id,
        { priority: 'high', cause: 'Urgente' },
        operador,
      );
      const asignacion = await controladorConFallo.asignar(incidencia.id, {
        departmentId: null,
      });
      expect([estado.images, prioridad.images, asignacion.images]).toEqual([
        [],
        [],
        [],
      ]);
      expect(servicios.cambiarEstado).toHaveBeenCalledOnce();
      expect(servicios.cambiarPrioridad).toHaveBeenCalledOnce();
      expect(servicios.asignar).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledTimes(3);
    } finally {
      log.mockRestore();
    }
  });

  it('propaga un fallo del PATCH sin consultar las fotos', async () => {
    const conflicto = new ConflictException('Estado incompatible');
    const servicios = {
      cambiarEstado: vi.fn().mockRejectedValue(conflicto),
    };
    const fotosLocales = {
      listar: vi.fn().mockResolvedValue([]),
      agregarA: vi.fn().mockResolvedValue(incidencia),
    };
    const controladorConFallo = new IncidentsController(
      servicios as unknown as IncidentsService,
      fotosLocales as unknown as FotosIncidenciaService,
    );
    await expect(
      controladorConFallo.cambiarEstado(
        incidencia.id,
        { status: 'validated', cause: 'Comprobada' },
        operador,
      ),
    ).rejects.toBe(conflicto);
    expect(fotosLocales.listar).not.toHaveBeenCalled();
    expect(fotosLocales.agregarA).not.toHaveBeenCalled();
  });

  it('expone las rutas de asignación y delega en el servicio', async () => {
    const opciones = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'opcionesAsignacion',
    )?.value;
    const asignar = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'asignar',
    )?.value;
    expect(Reflect.getMetadata(PATH_METADATA, opciones)).toBe(
      'assignment-options',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, opciones)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, asignar)).toBe(':id/assignment');
    expect(Reflect.getMetadata(METHOD_METADATA, asignar)).toBe(
      RequestMethod.PATCH,
    );

    await expect(controlador.opcionesAsignacion(operador)).resolves.toEqual({
      departments: [],
      teams: [],
      technicians: [],
    });
    await controlador.asignar(
      incidencia.id,
      { departmentId: null, cause: 'Revisada' },
      operador,
    );
    expect(servicio.asignar).toHaveBeenCalledWith(
      incidencia.id,
      {
        departmentId: null,
        cause: 'Revisada',
      },
      operador,
    );
  });

  it('protege el listado y las operaciones autenticadas', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, IncidentsController),
    ).toBeUndefined();
    const listado = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'listar',
    )?.value;
    expect(Reflect.getMetadata(GUARDS_METADATA, listado)).toEqual([
      JwtAuthGuard,
      AccesoIncidenciasGuard,
    ]);
    expect(Reflect.getMetadata('rolesIncidencias', listado)).toEqual([
      'civic',
      'admin',
      'administrative',
      'department',
      'team',
      'technician',
    ]);

    for (const metodo of [
      'create',
      'cambiarEstado',
      'cambiarPrioridad',
      'findOne',
      'subirFotos',
    ] as const) {
      const operacion = Object.getOwnPropertyDescriptor(
        IncidentsController.prototype,
        metodo,
      )?.value;
      expect(Reflect.getMetadata(GUARDS_METADATA, operacion)).toEqual([
        JwtAuthGuard,
        AccesoIncidenciasGuard,
      ]);
    }

    for (const metodo of ['opcionesAsignacion', 'asignar'] as const) {
      const operacion = Object.getOwnPropertyDescriptor(
        IncidentsController.prototype,
        metodo,
      )?.value;
      expect(operacion).toBeDefined();
      expect(Reflect.getMetadata(GUARDS_METADATA, operacion)).toEqual([
        JwtAuthGuard,
        AccesoIncidenciasGuard,
      ]);
      expect(Reflect.getMetadata('rolesIncidencias', operacion)).toEqual([
        'admin',
        'administrative',
        'department',
      ]);
    }

    const detalle = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'findOne',
    )?.value;
    expect(Reflect.getMetadata('rolesIncidencias', detalle)).toEqual([
      'civic',
      'admin',
      'administrative',
      'department',
      'team',
      'technician',
    ]);
  });

  it('expone la ruta protegida de fotos y las añade solo al ciudadano vinculado', async () => {
    const operacion = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'subirFotos',
    )?.value;
    expect(Reflect.getMetadata(PATH_METADATA, operacion)).toBe(':id/images');
    expect(Reflect.getMetadata(METHOD_METADATA, operacion)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata('rolesIncidencias', operacion)).toEqual([
      'civic',
    ]);
    const archivo = {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: 'image/jpeg',
      size: 3,
    };

    await controlador.subirFotos(incidencia.id, [archivo] as never, civic);

    expect(fotos.subir).toHaveBeenCalledWith(incidencia.id, civic.ciudadanoId, [
      { contenido: archivo.buffer, mimeType: 'image/jpeg', extension: 'jpg' },
    ]);
  });
});

describe('Listado paginado de incidencias', () => {
  const ciudadano: UsuarioIncidencias = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    role: 'civic',
    ciudadanoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };
  const operador: UsuarioIncidencias = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    role: 'administrative',
    ciudadanoId: null,
  };

  it('rechaza filtros ajenos o ausentes y operadores sin perfil ciudadano', () => {
    const servicio = { listarPagina: vi.fn() };
    const controlador = new IncidentsController(
      servicio as unknown as IncidentsService,
      {} as FotosIncidenciaService,
    );
    const response = { setHeader: vi.fn() } as unknown as Response;

    expect(() =>
      controlador.listar({ limit: 10 }, response, ciudadano),
    ).toThrow(ForbiddenException);
    expect(() =>
      controlador.listar({ civicId: operador.id, limit: 10 }, response, ciudadano),
    ).toThrow(ForbiddenException);
    expect(() =>
      controlador.listar({ civicId: operador.id, limit: 10 }, response, {
        ...operador,
        role: 'department',
      }),
    ).toThrow(ForbiddenException);
    expect(servicio.listarPagina).not.toHaveBeenCalled();
  });

  it('permite la consulta global a administración', async () => {
    const servicio = {
      listarPagina: vi.fn().mockResolvedValue({
        items: [],
        limit: 10,
        pagina: 0,
        nextCursor: null,
      }),
    };
    const controlador = new IncidentsController(
      servicio as unknown as IncidentsService,
      {} as FotosIncidenciaService,
    );
    const response = { setHeader: vi.fn() } as unknown as Response;

    await expect(controlador.listar({ limit: 10 }, response, operador))
      .resolves.toEqual([]);
    expect(servicio.listarPagina).toHaveBeenCalledWith(10, undefined, undefined);
  });

  it.each(['civic', 'technician'] as const)('publica las cabeceras de continuación y conserva el cuerpo como array para el perfil %s', async (role) => {
    const items = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Farola apagada',
        status: 'reported' as const,
        createdAt: '2026-11-12T10:00:00.000Z',
      },
    ];
    const servicio = {
      listarPagina: vi.fn().mockResolvedValue({
        items,
        limit: 1,
        pagina: 0,
        nextCursor: 'cursor-opaco',
      }),
    };
    const setHeader = vi.fn();
    const response = { setHeader } as unknown as Response;
    const controlador = new IncidentsController(
      servicio as unknown as IncidentsService,
      { agregarA: vi.fn() } as unknown as FotosIncidenciaService,
    );

    await expect(
      controlador.listar(
        { civicId: items[0].id, limit: 1 },
        response,
        { ...ciudadano, role },
      ),
    ).resolves.toBe(items);
    expect(servicio.listarPagina).toHaveBeenCalledWith(
      1,
      undefined,
      items[0].id,
    );
    expect(setHeader).toHaveBeenCalledWith('X-Page', '0');
    expect(setHeader).toHaveBeenCalledWith('X-Limit', '1');
    expect(setHeader).toHaveBeenCalledWith('X-Next-Cursor', 'cursor-opaco');
    expect(setHeader).toHaveBeenCalledWith(
      'Link',
      `</incidents?limit=1&cursor=cursor-opaco&civicId=${items[0].id}>; rel="next"`,
    );
  });
});
