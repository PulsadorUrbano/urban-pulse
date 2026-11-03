import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { IncidentsController } from '../../../src/incidents/incidents.controller.js';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';
const ciudadano: UsuarioIncidencias = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role: 'civic',
  ciudadanoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};
const operador: UsuarioIncidencias = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  role: 'admin',
  ciudadanoId: null,
};
describe('Incidencias con contexto autenticado del servidor', () => {
  let modulo: TestingModule,
    servicio: IncidentsService,
    controlador: IncidentsController;
  beforeEach(async () => {
    modulo = await Test.createTestingModule({
      providers: [
        IncidentsService,
        {
          provide: UploadStorageService,
          useValue: { save: vi.fn().mockResolvedValue([]), remove: vi.fn() },
        },
      ],
    }).compile();
    servicio = modulo.get(IncidentsService);
    controlador = new IncidentsController(servicio);
  });
  afterEach(async () => {
    await modulo.close();
  });
  it('declara guardas en el orden correcto antes de la subida', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, IncidentsController)).toEqual([
      JwtAuthGuard,
      AccesoIncidenciasGuard,
    ]);
    expect(
      Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        Reflect.get(IncidentsController.prototype, 'create'),
      ),
    ).toHaveLength(1);
  });
  it.each([
    ['create', ['civic']],
    ['listar', ['civic']],
    ['findOne', ['civic', 'admin', 'administrative']],
    ['cambiarEstado', ['admin', 'administrative']],
    ['cambiarPrioridad', ['admin', 'administrative']],
  ] as const)('establece roles explícitos en %s', (metodo, roles) => {
    expect(
      Reflect.getMetadata(
        'rolesIncidencias',
        IncidentsController.prototype[metodo],
      ),
    ).toEqual(roles);
  });
  it('crea con identidad real y lista solo al ciudadano autenticado', async () => {
    const cabeceras = { setHeader: vi.fn() };
    const creada = await controlador.create(
      { title: 'Farola apagada' },
      [],
      cabeceras as unknown as Response,
      ciudadano,
    );
    await servicio.create(
      { title: 'Otra incidencia', civicId: operador.id },
      [],
    );
    expect(creada.civicId).toBe(ciudadano.id);
    expect(cabeceras.setHeader).toHaveBeenCalledWith(
      'Location',
      '/incidents/' + creada.id,
    );
    expect(controlador.listar(undefined, ciudadano)).toEqual([
      {
        id: creada.id,
        title: creada.title,
        status: 'reported',
        createdAt: creada.createdAt,
      },
    ]);
    expect(controlador.findOne(creada.id, ciudadano)).toEqual(creada);
    expect(() =>
      controlador.findOne(creada.id, {
        ...ciudadano,
        id: operador.id,
        ciudadanoId: operador.id,
      }),
    ).toThrow(NotFoundException);
    expect(controlador.findOne(creada.id, operador)).toEqual(creada);
  });
  it('registra al operador auténtico en ambos historiales sin cambiar el dueño', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: ciudadano.id },
      [],
    );
    controlador.cambiarEstado(
      creada.id,
      { status: 'validated', cause: 'Confirmada' },
      operador,
    );
    const actualizada = controlador.cambiarPrioridad(
      creada.id,
      { priority: 'high', cause: 'Riesgo' },
      operador,
    );
    expect(actualizada.civicId).toBe(ciudadano.id);
    expect(servicio.consultarCambiosEstado(creada.id)[0].actorId).toBe(
      operador.id,
    );
    expect(servicio.consultarCambiosPrioridad(creada.id)[0].actorId).toBe(
      operador.id,
    );
    expect(actualizada).not.toHaveProperty('cambiosEstado');
    expect(actualizada).not.toHaveProperty('cambiosPrioridad');
  });
  it('oculta incidencias ajenas sin mutarlas y conserva acceso del operador', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: ciudadano.id.toUpperCase() },
      [],
    );
    expect(servicio.findOne(creada.id.toUpperCase(), ciudadano)).toEqual(
      creada,
    );
    expect(() =>
      servicio.findOne(creada.id, {
        ...ciudadano,
        id: operador.id,
        ciudadanoId: operador.id,
      }),
    ).toThrow(NotFoundException);
    expect(() =>
      servicio.findOne(creada.id, { ...operador, role: 'technician' }),
    ).toThrow(ForbiddenException);
    expect(servicio.findOne(creada.id, operador)).toEqual(creada);
    expect(servicio.consultarCambiosEstado(creada.id)).toEqual([]);
    expect(servicio.consultarCambiosPrioridad(creada.id)).toEqual([]);
  });
});
