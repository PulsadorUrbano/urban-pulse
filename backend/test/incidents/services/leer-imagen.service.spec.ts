import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { resolve } from 'node:path';
const dobles = vi.hoisted(() => ({
  realpath: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock('node:fs/promises', async (importar) => ({
  ...(await importar<typeof import('node:fs/promises')>()),
  ...dobles,
}));
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const imagen = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  mimeType: 'image/png' as const,
  url: '/no-usar.png',
  createdAt: '2026-10-27T10:00:00.000Z',
};
describe('Lectura de imagen dentro del almacenamiento', () => {
  const raiz = resolve(process.cwd(), '.uploads-unitarios');
  const servicio = new UploadStorageService();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('UPLOADS_DIRECTORY', raiz);
    dobles.realpath.mockImplementation(async (ruta) => ruta);
    dobles.stat.mockResolvedValue({ isFile: () => true });
    dobles.readFile.mockResolvedValue(Buffer.from('png'));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp'],
  ] as const)(
    'lee %s con nombre reconstruido sin usar url',
    async (mimeType, extension) => {
      await expect(servicio.leer(id, { ...imagen, mimeType })).resolves.toEqual(
        Buffer.from('png'),
      );
      expect(dobles.readFile).toHaveBeenCalledWith(
        resolve(raiz, 'incidents', id, imagen.id + '.' + extension),
      );
    },
  );
  it('rechaza escape real fuera de la raíz antes de leer', async () => {
    dobles.realpath
      .mockResolvedValueOnce(raiz)
      .mockResolvedValueOnce(resolve(raiz, '..', 'privado.png'));
    await expect(servicio.leer(id, imagen)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dobles.readFile).not.toHaveBeenCalled();
  });
  it('rechaza directorios u otros archivos no regulares', async () => {
    dobles.stat.mockResolvedValue({ isFile: () => false });
    await expect(servicio.leer(id, imagen)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dobles.readFile).not.toHaveBeenCalled();
  });
  it.each(['ENOENT', 'ENOTDIR'])(
    'archivo desaparecido %s devuelve 404 sin exponer la ruta',
    async (code) => {
      dobles.readFile.mockRejectedValue(
        Object.assign(new Error('/ruta/privada'), { code }),
      );
      try {
        await servicio.leer(id, imagen);
        expect.fail('Debía rechazar');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(String(error)).not.toContain('/ruta/privada');
      }
    },
  );
  it('fallo inesperado devuelve 500 genérico sin exponer ruta local', async () => {
    dobles.readFile.mockRejectedValue(
      Object.assign(new Error('/ruta/privada'), { code: 'EACCES' }),
    );
    try {
      await servicio.leer(id, imagen);
      expect.fail('Debía rechazar');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(String(error)).not.toContain('/ruta/privada');
    }
  });
});
