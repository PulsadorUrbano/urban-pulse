import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import { IncidentsController } from '../../../src/incidents/incidents.controller.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { IncidentsService } from '../../../src/incidents/incidents.service.js';
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
    listarPorCiudadano: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(incidencia),
    cambiarEstado: vi.fn().mockResolvedValue(incidencia),
    cambiarPrioridad: vi.fn().mockResolvedValue(incidencia),
    findOne: vi.fn().mockResolvedValue(incidencia),
  };
  const controlador = new IncidentsController(
    servicio as unknown as IncidentsService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('deriva ciudadano y actor de la identidad autorizada', async () => {
    await controlador.listar(undefined, civic);
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

    expect(servicio.listarPorCiudadano).toHaveBeenCalledWith(civic.ciudadanoId);
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

  it('rechaza listar y crear sin ciudadano vinculado', async () => {
    const sinVinculo = { ...civic, ciudadanoId: null };
    await expect(
      controlador.listar(undefined, sinVinculo),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controlador.create(
        { title: 'Farola apagada' },
        { setHeader: vi.fn() } as never,
        sinVinculo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('protege todo el controller y no expone rutas de asignación', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, IncidentsController)).toEqual([
      JwtAuthGuard,
      AccesoIncidenciasGuard,
    ]);
    expect(
      Object.getOwnPropertyDescriptor(
        IncidentsController.prototype,
        'opcionesAsignacion',
      ),
    ).toBeUndefined();
    expect(
      Object.getOwnPropertyDescriptor(IncidentsController.prototype, 'asignar'),
    ).toBeUndefined();
  });
});
