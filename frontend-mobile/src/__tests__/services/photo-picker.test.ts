/// <reference types="jest" />
import * as ExpoImagePicker from 'expo-image-picker';

import { pickPhotoFromCamera, pickPhotoFromLibrary } from '@/services/photo-picker';

// Mockea el módulo nativo del selector de fotos para controlar permisos,
// capturas y selecciones de galería sin tocar el hardware del dispositivo.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const requestCameraPermissionsMock = jest.mocked(
  ExpoImagePicker.requestCameraPermissionsAsync,
);
const launchCameraMock = jest.mocked(ExpoImagePicker.launchCameraAsync);
const launchLibraryMock = jest.mocked(ExpoImagePicker.launchImageLibraryAsync);

// Mensajes amigables que el servicio debe exponer ante fallos. Se mantienen
// idénticos a las constantes de `photo-picker.ts` para que cualquier cambio
// de copy rompa estos tests y obligue a revisar el contrato con la UI.
const cameraPermissionErrorMessage =
  'Necesitamos permiso para usar la cámara. Actívalo desde los ajustes de tu dispositivo para fotografiar la incidencia.';
const cameraLaunchErrorMessage = 'No pudimos abrir la cámara. Inténtalo de nuevo.';
const libraryLaunchErrorMessage =
  'No pudimos abrir tu galería de fotos. Inténtalo de nuevo.';

// Construye una respuesta de permiso de cámara con el estado indicado.
function buildCameraPermissionResponse(
  granted: boolean,
): ExpoImagePicker.PermissionResponse {
  return {
    granted,
    status: (granted
      ? 'granted'
      : 'denied') as ExpoImagePicker.PermissionResponse['status'],
    canAskAgain: true,
    expires: 'never',
  };
}

// Construye un resultado exitoso del picker nativo con la uri indicada.
function buildSuccessfulPickerResult(
  uri: string,
): ExpoImagePicker.ImagePickerResult {
  return {
    canceled: false,
    assets: [{ uri, width: 1200, height: 900 }],
  };
}

// Resultado nativo de cancelación (el usuario cerró el flujo sin elegir).
const canceledPickerResult: ExpoImagePicker.ImagePickerResult = {
  canceled: true,
  assets: null,
};

// Devuelve las opciones exactas con las que se lanzó el picker nativo en la
// llamada indicada (o `undefined` si esa llamada no existiera).
function getLaunchOptions(
  launchMock: jest.Mock,
  callIndex = 0,
): ExpoImagePicker.ImagePickerOptions | undefined {
  return launchMock.mock.calls[callIndex]?.[0] as
    | ExpoImagePicker.ImagePickerOptions
    | undefined;
}

// Verifica que las opciones enviadas al lanzador nativo pidan únicamente
// imágenes estáticas (contrato de `LIBRARY_PICKER_OPTIONS` y
// `CAMERA_PICKER_OPTIONS` en el servicio).
function expectImagesOnlyMediaTypes(
  launchMock: jest.Mock,
  callIndex = 0,
): void {
  const launchOptions = getLaunchOptions(launchMock, callIndex);

  expect(launchOptions).toBeDefined();
  expect(Array.isArray(launchOptions?.mediaTypes)).toBe(true);
  if (Array.isArray(launchOptions?.mediaTypes)) {
    expect(launchOptions.mediaTypes).toContain('images');
  }
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('pickPhotoFromCamera', () => {
  it('devuelve la uri de la foto capturada cuando el permiso está concedido', async () => {
    const capturedPhotoUri = 'file:///data/user/0/app/cache/incidencia.jpg';
    requestCameraPermissionsMock.mockResolvedValue(
      buildCameraPermissionResponse(true),
    );
    launchCameraMock.mockResolvedValue(
      buildSuccessfulPickerResult(capturedPhotoUri),
    );

    await expect(pickPhotoFromCamera()).resolves.toBe(capturedPhotoUri);

    expect(requestCameraPermissionsMock).toHaveBeenCalledTimes(1);
    expect(launchCameraMock).toHaveBeenCalledTimes(1);
    expectImagesOnlyMediaTypes(launchCameraMock);
    // La cámara mantiene el recorte simple tras capturar
    // (`CAMERA_PICKER_OPTIONS`): flujo estable para la captura directa.
    expect(getLaunchOptions(launchCameraMock)?.allowsEditing).toBe(true);
  });

  it('devuelve null sin lanzar error cuando el usuario cancela la captura', async () => {
    requestCameraPermissionsMock.mockResolvedValue(
      buildCameraPermissionResponse(true),
    );
    launchCameraMock.mockResolvedValue(canceledPickerResult);

    await expect(pickPhotoFromCamera()).resolves.toBeNull();
    expect(launchCameraMock).toHaveBeenCalledTimes(1);
  });

  it('lanza el error de permiso en español y no abre la cámara cuando se deniega', async () => {
    requestCameraPermissionsMock.mockResolvedValue(
      buildCameraPermissionResponse(false),
    );

    await expect(pickPhotoFromCamera()).rejects.toThrow(
      cameraPermissionErrorMessage,
    );
    // Sin permiso no debe siquiera intentar lanzar la cámara nativa.
    expect(launchCameraMock).not.toHaveBeenCalled();
  });

  it('lanza un error amigable en español cuando la cámara nativa falla', async () => {
    requestCameraPermissionsMock.mockResolvedValue(
      buildCameraPermissionResponse(true),
    );
    launchCameraMock.mockRejectedValue(new Error('native camera failure'));

    await expect(pickPhotoFromCamera()).rejects.toThrow(
      cameraLaunchErrorMessage,
    );
  });

  it('lanza el error de permiso si la consulta de permiso nativa falla', async () => {
    requestCameraPermissionsMock.mockRejectedValue(
      new Error('permission request failure'),
    );

    await expect(pickPhotoFromCamera()).rejects.toThrow(
      cameraPermissionErrorMessage,
    );
    expect(launchCameraMock).not.toHaveBeenCalled();
  });
});

describe('pickPhotoFromLibrary', () => {
  it('devuelve la uri de la foto elegida sin pedir permiso de galería', async () => {
    const selectedPhotoUri = 'file:///data/user/0/app/cache/foto-bache.jpg';
    launchLibraryMock.mockResolvedValue(
      buildSuccessfulPickerResult(selectedPhotoUri),
    );

    await expect(pickPhotoFromLibrary()).resolves.toBe(selectedPhotoUri);

    // En SDK 57 el selector del sistema no exige permiso de biblioteca.
    expect(requestCameraPermissionsMock).not.toHaveBeenCalled();
    expect(launchLibraryMock).toHaveBeenCalledTimes(1);
    expectImagesOnlyMediaTypes(launchLibraryMock);
    // La galería NO activa la pantalla de recorte (`LIBRARY_PICKER_OPTIONS`):
    // el recorte está detrás de cuelgues conocidos del selector de la
    // biblioteca en Android y el valor por defecto de la doc ya es `false`.
    expect(getLaunchOptions(launchLibraryMock)?.allowsEditing).toBeFalsy();
  });

  it('devuelve null sin lanzar error cuando el usuario cancela la selección', async () => {
    launchLibraryMock.mockResolvedValue(canceledPickerResult);

    await expect(pickPhotoFromLibrary()).resolves.toBeNull();
  });

  it('lanza un error amigable en español cuando la galería nativa falla', async () => {
    launchLibraryMock.mockRejectedValue(new Error('native library failure'));

    await expect(pickPhotoFromLibrary()).rejects.toThrow(
      libraryLaunchErrorMessage,
    );
  });
});
