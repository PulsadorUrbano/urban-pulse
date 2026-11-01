/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';
import { MAX_SELECTED_PHOTOS, usePhotoAttachment } from '@/hooks/use-photo-attachment';
import { pickPhotoFromCamera, pickPhotoFromLibrary } from '@/services/photo-picker';

jest.mock('@/services/photo-picker', () => ({
  pickPhotoFromCamera: jest.fn(),
  pickPhotoFromLibrary: jest.fn(),
}));
const camera = jest.mocked(pickPhotoFromCamera);
const library = jest.mocked(pickPhotoFromLibrary);

beforeEach(() => { camera.mockReset(); library.mockReset(); });

it('adjunta una foto de la cámara sin guardarla localmente', async () => {
  camera.mockResolvedValue('file:///camera.jpg');
  const { result } = await renderHook(() => usePhotoAttachment());
  await act(async () => { await result.current.attachPhotoFromCamera(); });
  expect(result.current.selectedPhotoUris).toEqual(['file:///camera.jpg']);
  expect(result.current.isProcessingPhoto).toBe(false);
});

it('permite cancelar la selección sin añadir fotos', async () => {
  library.mockResolvedValue(null);
  const { result } = await renderHook(() => usePhotoAttachment());
  await act(async () => { await result.current.attachPhotoFromLibrary(); });
  expect(result.current.selectedPhotoUris).toEqual([]);
  expect(result.current.errorMessage).toBeNull();
});

it('limita los adjuntos y permite eliminar uno', async () => {
  let index = 0;
  library.mockImplementation(async () => `file:///photo-${++index}.jpg`);
  const { result } = await renderHook(() => usePhotoAttachment());
  for (let i = 0; i < MAX_SELECTED_PHOTOS + 1; i += 1) {
    await act(async () => { await result.current.attachPhotoFromLibrary(); });
  }
  expect(result.current.selectedPhotoUris).toHaveLength(MAX_SELECTED_PHOTOS);
  expect(library).toHaveBeenCalledTimes(MAX_SELECTED_PHOTOS);
  await act(async () => { result.current.removePhoto('file:///photo-1.jpg'); });
  expect(result.current.selectedPhotoUris).toHaveLength(MAX_SELECTED_PHOTOS - 1);
});

it('muestra el error del selector y permite reintentar', async () => {
  library.mockRejectedValueOnce(new Error('No se pudo abrir la galería')).mockResolvedValueOnce('file:///ok.jpg');
  const { result } = await renderHook(() => usePhotoAttachment());
  await act(async () => { await result.current.attachPhotoFromLibrary(); });
  expect(result.current.errorMessage).toBe('No se pudo abrir la galería');
  await act(async () => { await result.current.attachPhotoFromLibrary(); });
  expect(result.current.selectedPhotoUris).toEqual(['file:///ok.jpg']);
  expect(result.current.errorMessage).toBeNull();
});
