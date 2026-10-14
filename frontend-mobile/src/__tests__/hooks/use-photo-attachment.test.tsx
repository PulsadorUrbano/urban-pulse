/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { usePhotoAttachment } from '@/hooks/use-photo-attachment';
import { pickPhotoFromCamera, pickPhotoFromLibrary } from '@/services/photo-picker';
import { storePhoto } from '@/services/storage.service';

// ---------------------------------------------------------------------------
// Mocks de los servicios consumidos por el hook, siguiendo el mismo patrón
// que los tests de `use-create-incident` y `use-categories`: módulo completo
// sustituido por `jest.fn()` y accesible luego vía `MockedFunction`.
// ---------------------------------------------------------------------------

jest.mock('@/services/photo-picker', () => ({
  pickPhotoFromCamera: jest.fn(),
  pickPhotoFromLibrary: jest.fn(),
}));

jest.mock('@/services/storage.service', () => ({
  storePhoto: jest.fn(),
}));

const mockedPickPhotoFromCamera = pickPhotoFromCamera as jest.MockedFunction<
  typeof pickPhotoFromCamera
>;
const mockedPickPhotoFromLibrary = pickPhotoFromLibrary as jest.MockedFunction<
  typeof pickPhotoFromLibrary
>;
const mockedStorePhoto = storePhoto as jest.MockedFunction<typeof storePhoto>;

// Replica del retardo simulado de `storage.service.ts` (800 ms vía
// `setTimeout`) para poder controlarlo con los fake timers de Jest.
const SIMULATED_STORAGE_DELAY_MS = 800;

const storePhotoWithDelay = (uri: string): Promise<string> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(uri), SIMULATED_STORAGE_DELAY_MS);
  });

const cameraPhotoUri = 'file:///photos/incident-1.jpg';
const libraryPhotoUri = 'file:///photos/library-2.jpg';

describe('usePhotoAttachment', () => {
  beforeEach(() => {
    mockedPickPhotoFromCamera.mockReset();
    mockedPickPhotoFromLibrary.mockReset();
    mockedStorePhoto.mockReset();
    mockedStorePhoto.mockImplementation(storePhotoWithDelay);
  });

  afterEach(() => {
    // Devuelve los timers reales por si algún test los había congelado.
    jest.useRealTimers();
  });

  it('estado inicial: sin fotos, sin procesamiento y sin errores', async () => {
    const { result } = await renderHook(() => usePhotoAttachment());

    expect(result.current.selectedPhotoUris).toEqual([]);
    expect(result.current.isProcessingPhoto).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('attachPhotoFromCamera espera a storePhoto y añade la uri al final', async () => {
    mockedPickPhotoFromCamera.mockResolvedValueOnce(cameraPhotoUri);
    const { result } = await renderHook(() => usePhotoAttachment());

    jest.useFakeTimers();

    // Lanza el adjunto y deja que `act` aplique el render: el "guardado"
    // simulado queda pendiente de su temporizador de 800 ms.
    let attachPromise!: Promise<void>;
    await act(async () => {
      attachPromise = result.current.attachPhotoFromCamera();
    });

    // Ventana intermedia: la foto está en proceso y aún no se ha añadido.
    expect(result.current.isProcessingPhoto).toBe(true);
    expect(result.current.selectedPhotoUris).toEqual([]);

    // Completa el retardo simulado y espera a que la cadena termine.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await attachPromise;
    });

    expect(mockedPickPhotoFromCamera).toHaveBeenCalledTimes(1);
    expect(mockedStorePhoto).toHaveBeenCalledTimes(1);
    expect(mockedStorePhoto).toHaveBeenCalledWith(cameraPhotoUri);
    expect(result.current.selectedPhotoUris).toEqual([cameraPhotoUri]);
    expect(result.current.isProcessingPhoto).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('attachPhotoFromLibrary usa el picker de la galería', async () => {
    mockedPickPhotoFromLibrary.mockResolvedValueOnce(libraryPhotoUri);
    const { result } = await renderHook(() => usePhotoAttachment());

    jest.useFakeTimers();

    await act(async () => {
      const attachPromise = result.current.attachPhotoFromLibrary();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await attachPromise;
    });

    expect(mockedPickPhotoFromLibrary).toHaveBeenCalledTimes(1);
    expect(mockedPickPhotoFromCamera).not.toHaveBeenCalled();
    expect(result.current.selectedPhotoUris).toEqual([libraryPhotoUri]);
    expect(result.current.isProcessingPhoto).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('adjunta dos fotos manteniendo el orden de selección', async () => {
    mockedPickPhotoFromCamera
      .mockResolvedValueOnce(cameraPhotoUri)
      .mockResolvedValueOnce(libraryPhotoUri);
    const { result } = await renderHook(() => usePhotoAttachment());

    jest.useFakeTimers();

    await act(async () => {
      const firstAttach = result.current.attachPhotoFromCamera();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await firstAttach;

      const secondAttach = result.current.attachPhotoFromCamera();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await secondAttach;
    });

    expect(mockedStorePhoto).toHaveBeenCalledTimes(2);
    expect(result.current.selectedPhotoUris).toEqual([cameraPhotoUri, libraryPhotoUri]);
    expect(result.current.isProcessingPhoto).toBe(false);
  });

  it('si el picker devuelve null (cancelación) la lista queda intacta y sin error', async () => {
    mockedPickPhotoFromCamera.mockResolvedValueOnce(null);
    const { result } = await renderHook(() => usePhotoAttachment());

    await act(async () => {
      await result.current.attachPhotoFromCamera();
    });

    expect(result.current.selectedPhotoUris).toEqual([]);
    expect(result.current.isProcessingPhoto).toBe(false);
    expect(result.current.errorMessage).toBeNull();
    expect(mockedStorePhoto).not.toHaveBeenCalled();
  });

  it('si el picker lanza Error, errorMessage recoge el mensaje y la lista queda intacta', async () => {
    const pickerErrorMessage =
      'No pudimos abrir tu galería de fotos. Inténtalo de nuevo.';
    mockedPickPhotoFromLibrary.mockRejectedValueOnce(new Error(pickerErrorMessage));
    const { result } = await renderHook(() => usePhotoAttachment());

    await act(async () => {
      await result.current.attachPhotoFromLibrary();
    });

    expect(result.current.errorMessage).toBe(pickerErrorMessage);
    expect(result.current.selectedPhotoUris).toEqual([]);
    expect(result.current.isProcessingPhoto).toBe(false);
    expect(mockedStorePhoto).not.toHaveBeenCalled();
  });

  it('removePhoto elimina únicamente la foto indicada', async () => {
    mockedPickPhotoFromCamera
      .mockResolvedValueOnce(cameraPhotoUri)
      .mockResolvedValueOnce(libraryPhotoUri);
    const { result } = await renderHook(() => usePhotoAttachment());

    jest.useFakeTimers();

    await act(async () => {
      const firstAttach = result.current.attachPhotoFromCamera();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await firstAttach;

      const secondAttach = result.current.attachPhotoFromCamera();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await secondAttach;
    });

    jest.useRealTimers();

    await act(async () => {
      result.current.removePhoto(cameraPhotoUri);
    });

    expect(result.current.selectedPhotoUris).toEqual([libraryPhotoUri]);
    expect(result.current.errorMessage).toBeNull();
  });

  it('ignora solicitudes simultáneas mientras otra foto está en proceso', async () => {
    // Picker diferido: permanece "abierto" hasta que el test decida resolverlo,
    // garantizando la ventana en la que `isProcessingPhoto` es true.
    let resolvePhotoPick!: (value: string | null) => void;
    mockedPickPhotoFromCamera.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePhotoPick = resolve;
        }),
    );
    const { result } = await renderHook(() => usePhotoAttachment());

    jest.useFakeTimers();

    await act(async () => {
      const firstAttach = result.current.attachPhotoFromCamera();
      const secondAttach = result.current.attachPhotoFromCamera();

      // La segunda solicitud se descarta: el picker solo se abrió una vez.
      expect(mockedPickPhotoFromCamera).toHaveBeenCalledTimes(1);

      resolvePhotoPick(cameraPhotoUri);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(SIMULATED_STORAGE_DELAY_MS);
      await firstAttach;
      await secondAttach;
    });

    expect(mockedPickPhotoFromCamera).toHaveBeenCalledTimes(1);
    expect(mockedStorePhoto).toHaveBeenCalledTimes(1);
    expect(result.current.selectedPhotoUris).toEqual([cameraPhotoUri]);
    expect(result.current.isProcessingPhoto).toBe(false);
  });
});
