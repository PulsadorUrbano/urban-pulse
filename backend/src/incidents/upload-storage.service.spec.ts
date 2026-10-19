import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { vi } from 'vitest';

const { writeFile } = vi.hoisted(() => ({ writeFile: vi.fn() }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs/promises')>();
  return { ...fs, writeFile };
});

import { UploadStorageService } from './upload-storage.service.js';

describe('UploadStorageService', () => {
  const uploadRoot = resolve(process.cwd(), '.test-uploads-storage');

  beforeEach(async () => {
    process.env.UPLOADS_DIRECTORY = uploadRoot;
    await rm(uploadRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    writeFile.mockReset();
    await rm(uploadRoot, { recursive: true, force: true });
    delete process.env.UPLOADS_DIRECTORY;
  });

  it('does not start another write after an image write fails', async () => {
    writeFile.mockRejectedValueOnce(new Error('disk unavailable'));
    const storage = new UploadStorageService();

    await expect(
      storage.save('7fa9b44d-7720-4f22-b0d9-7247f4cb7e9e', [
        { buffer: Buffer.from('one'), mimetype: 'image/png' },
        { buffer: Buffer.from('two'), mimetype: 'image/png' },
      ]),
    ).rejects.toThrow('disk unavailable');

    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
