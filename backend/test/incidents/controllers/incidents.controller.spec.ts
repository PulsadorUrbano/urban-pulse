import { ForbiddenException } from '@nestjs/common';
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
  const controlador = new IncidentsController(
    servicio as unknown as IncidentsService,
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
      operador.id,
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

    await expect(controlador.opcionesAsignacion()).resolves.toEqual({
      departments: [],
      teams: [],
      technicians: [],
    });
    await controlador.asignar(incidencia.id, { departmentId: null });
    expect(servicio.asignar).toHaveBeenCalledWith(incidencia.id, {
      departmentId: null,
    });
  });

  it('deja público el listado y protege las operaciones autenticadas', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, IncidentsController),
    ).toBeUndefined();
    const listado = Object.getOwnPropertyDescriptor(
      IncidentsController.prototype,
      'listar',
    )?.value;
    expect(Reflect.getMetadata(GUARDS_METADATA, listado)).toBeUndefined();
    expect(Reflect.getMetadata('rolesIncidencias', listado)).toBeUndefined();

    for (const metodo of [
      'create',
      'cambiarEstado',
      'cambiarPrioridad',
      'findOne',
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
      ]);
    }
  });
});

describe('Listado paginado de incidencias', () => {
  it('publica las cabeceras de continuación y conserva el cuerpo como array', async () => {
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
    );

    await expect(
      controlador.listar({ civicId: items[0].id, limit: 1 }, response),
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
