import { mkdir, writeFile } from 'node:fs/promises';
import { vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs/promises')>();
  return { ...fs, mkdir: vi.fn(), writeFile: vi.fn() };
});

import { CloudinaryService } from '../../../src/incidents/cloudinary.service.js';
import { UploadStorageService } from '../../../src/incidents/upload-storage.service.js';
import type { UploadedImageFile } from '../../../src/incidents/incident.js';

describe('UploadStorageService', () => {
  const incidentId = '7fa9b44d-7720-4f22-b0d9-7247f4cb7e9e';
  const archivos: UploadedImageFile[] = [
    { buffer: Buffer.from('one'), mimetype: 'image/png' },
    { buffer: Buffer.from('two'), mimetype: 'image/jpeg' },
  ];
  let cloudinary: {
    subirImagen: ReturnType<typeof vi.fn<CloudinaryService['subirImagen']>>;
    eliminarImagen: ReturnType<typeof vi.fn<CloudinaryService['eliminarImagen']>>;
  };
  let storage: UploadStorageService;

  beforeEach(() => {
    vi.mocked(mkdir).mockClear();
    vi.mocked(writeFile).mockClear();
    cloudinary = {
      subirImagen: vi.fn<CloudinaryService['subirImagen']>(async (publicId) => ({
        cloudinaryId: publicId,
        url: `https://res.cloudinary.com/demo/image/upload/${publicId}.png`,
      })),
      eliminarImagen: vi.fn<CloudinaryService['eliminarImagen']>(),
    };
    storage = new UploadStorageService(
      cloudinary as unknown as CloudinaryService,
    );
  });

  it('devuelve una lista vacía sin llamar a Cloudinary para cero archivos', async () => {
    await expect(storage.save(incidentId, [])).resolves.toEqual([]);
    expect(cloudinary.subirImagen).not.toHaveBeenCalled();
    expect(cloudinary.eliminarImagen).not.toHaveBeenCalled();
  });

  it('sube varios buffers secuencialmente con public_id generados en el servidor', async () => {
    const images = await storage.save(incidentId, archivos);

    expect(cloudinary.subirImagen).toHaveBeenCalledTimes(2);
    const ids = cloudinary.subirImagen.mock.calls.map(([publicId]) => publicId);
    expect(ids).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(`^urban-pulse/incidents/${incidentId}/[0-9a-f-]+$`),
        ),
      ]),
    );
    expect(ids[0]).not.toBe(ids[1]);
    expect(cloudinary.subirImagen.mock.calls[0][1]).toBe(archivos[0]);
    expect(cloudinary.subirImagen.mock.invocationCallOrder[0]).toBeLessThan(
      cloudinary.subirImagen.mock.invocationCallOrder[1],
    );
    expect(images).toHaveLength(2);
    expect(images[0]).toMatchObject({
      cloudinaryId: ids[0],
      url: expect.stringMatching(/^https:\/\//),
      mimeType: 'image/png',
    });
  });

  it('compensa también el public_id del segundo upload fallido y conserva el error principal', async () => {
    const failure = new Error('timeout');
    cloudinary.subirImagen
      .mockImplementationOnce(async (publicId: string) => ({
        cloudinaryId: publicId,
        url: `https://res.cloudinary.com/demo/${publicId}.png`,
      }))
      .mockRejectedValueOnce(failure);

    await expect(storage.save(incidentId, archivos)).rejects.toBe(failure);

    expect(cloudinary.eliminarImagen).toHaveBeenCalledTimes(2);
    expect(cloudinary.eliminarImagen.mock.calls[0][0]).toBe(
      cloudinary.subirImagen.mock.calls[0][0],
    );
    expect(cloudinary.eliminarImagen.mock.calls[1][0]).toBe(
      cloudinary.subirImagen.mock.calls[1][0],
    );
  });

  it('conserva el error de subida aunque falle la compensación', async () => {
    const uploadFailure = new Error('upload failed');
    cloudinary.subirImagen.mockRejectedValueOnce(uploadFailure);
    cloudinary.eliminarImagen.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(storage.save(incidentId, [archivos[0]])).rejects.toBe(
      uploadFailure,
    );
    expect(cloudinary.eliminarImagen).toHaveBeenCalledTimes(1);
  });

  it('devuelve todos los IDs cuya eliminación falla y sigue limpiando', async () => {
    cloudinary.eliminarImagen
      .mockRejectedValueOnce(new Error('Cloudinary unavailable'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Cloudinary unavailable'));
    const ids = ['incidents/one', 'incidents/two', 'incidents/three'];

    await expect(storage.eliminarImagenes(ids)).resolves.toEqual([
      ids[0],
      ids[2],
    ]);
    expect(cloudinary.eliminarImagen).toHaveBeenCalledTimes(3);
  });

  it('no crea carpetas ni escribe archivos locales', async () => {
    await storage.save(incidentId, archivos);

    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
