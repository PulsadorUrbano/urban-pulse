import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  PATH_METADATA,
  HEADERS_METADATA,
} from '@nestjs/common/constants';
import { UploadsController } from '../../../src/incidents/controllers/uploads.controller.js';
import { IncidentsService } from '../../../src/incidents/incidents.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
import { JwtAuthGuard } from '../../../src/auth/jwt-auth.guard.js';
import { AccesoIncidenciasGuard } from '../../../src/incidents/guards/acceso-incidencias.guard.js';
import type { UsuarioIncidencias } from '../../../src/incidents/types/usuario-incidencias.js';
const propietario: UsuarioIncidencias = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role: 'civic',
  ciudadanoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};
const imagen = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  mimeType: 'image/png' as const,
  url: '/no-usar-esta-url.png',
  createdAt: '2026-10-27T10:00:00.000Z',
};
const nombre = imagen.id + '.png';
describe('Entrega protegida de imágenes', () => {
  const almacenamiento = { save: vi.fn(), remove: vi.fn(), leer: vi.fn() };
  let servicio: IncidentsService, controlador: UploadsController;
  beforeEach(() => {
    vi.resetAllMocks();
    almacenamiento.save.mockResolvedValue([imagen]);
    almacenamiento.leer.mockResolvedValue(Buffer.from('png'));
    servicio = new IncidentsService(
      almacenamiento as unknown as UploadStorageService,
    );
    controlador = new UploadsController(
      servicio,
      almacenamiento as unknown as UploadStorageService,
    );
  });
  it('declara ruta y guardas de descarga sin acceso estático alternativo', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UploadsController)).toBe(
      'uploads/incidents',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, UploadsController)).toEqual([
      JwtAuthGuard,
      AccesoIncidenciasGuard,
    ]);
    expect(Reflect.getMetadata('rolesIncidencias', UploadsController)).toEqual([
      'civic',
      'admin',
      'administrative',
    ]);
    const cabeceras = Reflect.getMetadata(
      HEADERS_METADATA,
      Reflect.get(UploadsController.prototype, 'descargar'),
    ) as { name: string; value: string }[];
    expect(cabeceras).toContainEqual({
      name: 'Cache-Control',
      value: 'private, no-store',
    });
    expect(cabeceras).toContainEqual({
      name: 'X-Content-Type-Options',
      value: 'nosniff',
    });
  });
  it.each(['civic', 'admin', 'administrative'] as const)(
    'entrega bytes al rol permitido %s y MIME registrado',
    async (role) => {
      const creada = await servicio.create(
        { title: 'Farola apagada', civicId: propietario.id },
        [],
      );
      const usuario =
        role === 'civic'
          ? propietario
          : {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              role,
              ciudadanoId: null,
            };
      const archivo = await controlador.descargar(
        creada.id.toUpperCase(),
        nombre,
        usuario,
      );
      expect(archivo.getHeaders()).toMatchObject({
        type: 'image/png',
        disposition: 'inline; filename="' + nombre + '"',
        length: 3,
      });
      const partes: Buffer[] = [];
      for await (const parte of archivo.getStream())
        partes.push(Buffer.from(parte));
      expect(Buffer.concat(partes)).toEqual(Buffer.from('png'));
      expect(almacenamiento.leer).toHaveBeenCalledWith(creada.id, imagen);
    },
  );
  it('otro ciudadano recibe 404 sin lectura ni efectos en datos', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: propietario.id },
      [],
    );
    const otro = {
      ...propietario,
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ciudadanoId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    await expect(
      controlador.descargar(creada.id, nombre, otro),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(almacenamiento.leer).not.toHaveBeenCalled();
    expect(servicio.findOne(creada.id, propietario)).toEqual(creada);
  });
  it('un rol no autorizado no alcanza disco', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: propietario.id },
      [],
    );
    await expect(
      controlador.descargar(creada.id, nombre, {
        ...propietario,
        role: 'technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(almacenamiento.leer).not.toHaveBeenCalled();
  });
  it.each([
    '../archivo.png',
    '..\\archivo.png',
    '%2e%2e%2farchivo.png',
    '%252e%252e%252farchivo.png',
    'archivo\0.png',
    imagen.id + '.jpg',
    nombre + '.jpg',
    'otra.png',
    imagen.id.toUpperCase() + '.png',
  ])('rechaza nombre ajeno o traversal %s antes de leer', async (archivo) => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: propietario.id },
      [],
    );
    await expect(
      controlador.descargar(creada.id, archivo, propietario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(almacenamiento.leer).not.toHaveBeenCalled();
  });
  it('no recupera archivos huérfanos solo porque existan en disco', async () => {
    await expect(
      controlador.descargar(propietario.id, nombre, {
        ...propietario,
        role: 'admin',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(almacenamiento.leer).not.toHaveBeenCalled();
  });
  it('una imagen de otra incidencia no se entrega como propia', async () => {
    const creada = await servicio.create(
      { title: 'Farola apagada', civicId: propietario.id },
      [],
    );
    almacenamiento.save.mockResolvedValue([
      { ...imagen, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    ]);
    const otra = await servicio.create(
      { title: 'Banco roto', civicId: propietario.id },
      [],
    );
    await expect(
      controlador.descargar(otra.id, nombre, propietario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(almacenamiento.leer).not.toHaveBeenCalled();
    expect(servicio.obtenerImagen(creada.id, nombre, propietario)).toEqual({
      incidenciaId: creada.id,
      imagen,
    });
  });
});
