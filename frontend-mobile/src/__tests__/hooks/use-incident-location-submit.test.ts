/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton, Linking, Platform } from 'react-native';

import {
  CATEGORY_REQUIRED_MESSAGE,
  DEVICE_LOCATION_DISABLED_MESSAGE,
  LOCATION_DISABLED_MESSAGE,
  LOCATION_PERMISSION_DENIED_MESSAGE,
  LOCATION_UNAVAILABLE_MESSAGE,
  useIncidentLocationSubmit,
  type UseIncidentLocationSubmitParams,
} from '@/hooks/use-incident-location-submit';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import type {
  CreateIncidentInput,
  CreateIncidentResult,
  CreatedIncident,
} from '@/types/incident';
import type { LocationCoordinates } from '@/types/location';

// ---------------------------------------------------------------------------
// Test unitario del hook de envío con resolución de ubicación. Solo se
// sustituyen los servicios del dispositivo (`@/services/device-location`), la
// API nativa de alertas y `Linking`; el hook corre con su implementación real.
// Contrato PR #185: la ubicación es obligatoria, nunca se envía sin coordenadas.
// ---------------------------------------------------------------------------

jest.mock('@/services/device-location', () => ({
  areLocationServicesEnabled: jest.fn(),
  requestLocationPermission: jest.fn(),
  getCurrentCoordinates: jest.fn(),
}));

const mockedAreLocationServicesEnabled = jest.mocked(areLocationServicesEnabled);
const mockedRequestLocationPermission = jest.mocked(requestLocationPermission);
const mockedGetCurrentCoordinates = jest.mocked(getCurrentCoordinates);

type SubmitIncidentFn = UseIncidentLocationSubmitParams['submitIncident'];
type UploadPendingImagesFn = UseIncidentLocationSubmitParams['uploadPendingImages'];

// Textos fijos del hook; se repiten aquí para que cualquier cambio de copy rompa el test a propósito.
const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, realizando en el mock';
const IMAGES_UPLOAD_ERROR = 'La incidencia se registró, pero no se pudieron subir las fotos.';
const UNEXPECTED_SUBMIT_ERROR = 'No se pudo registrar la incidencia. Inténtalo de nuevo.';
const CATEGORY_ID = 'b7c1e1c2-0b6a-4b2f-9b1a-1f2d3e4c5a6b';

const deviceCoordinates: LocationCoordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

const selectedPhotoUris = ['file:///photos/bache-1.jpg', 'file:///photos/bache-2.png'];

const createdIncident: CreatedIncident = {
  id: '42',
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  civicId: '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5',
  categoryId: CATEGORY_ID,
  category: 'Transporte',
  urbanAssetId: null,
  location: {
    latitude: deviceCoordinates.latitude,
    longitude: deviceCoordinates.longitude,
    accuracy: deviceCoordinates.accuracy,
    createdAt: '2026-10-19T10:00:00.000Z',
  },
  images: [],
  status: 'reported',
  priority: 'low',
  createdAt: '2026-10-19T10:00:00.000Z',
};

const backendCreateResult: CreateIncidentResult = {
  incident: createdIncident,
  source: 'backend',
  pendingImageUris: [],
  imagesUploadErrorMessage: null,
};

const mockCreateResult: CreateIncidentResult = {
  ...backendCreateResult,
  incident: { ...createdIncident, id: '99' },
  source: 'mock',
};

const failedImagesCreateResult: CreateIncidentResult = {
  ...backendCreateResult,
  pendingImageUris: selectedPhotoUris,
  imagesUploadErrorMessage: IMAGES_UPLOAD_ERROR,
};

// Promesa controlada desde fuera para observar los estados intermedios.
function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

// Parámetros base del hook: ubicación activada, formulario válido y submit con éxito.
function buildParams(
  overrides: Partial<UseIncidentLocationSubmitParams> = {},
): UseIncidentLocationSubmitParams {
  return {
    isLocationEnabled: true,
    title: createdIncident.title,
    description: createdIncident.description ?? '',
    categoryId: CATEGORY_ID,
    selectedPhotoUris,
    submitIncident: jest.fn<
      ReturnType<SubmitIncidentFn>,
      Parameters<SubmitIncidentFn>
    >().mockResolvedValue(backendCreateResult),
    uploadPendingImages: jest.fn<
      ReturnType<UploadPendingImagesFn>,
      Parameters<UploadPendingImagesFn>
    >().mockImplementation(async (result) => ({
      ...result,
      pendingImageUris: [],
      imagesUploadErrorMessage: null,
    })),
    ...overrides,
  };
}

// Input esperado cuando la ubicación del dispositivo se resolvió correctamente.
const expectedDeviceLocationInput: CreateIncidentInput = {
  title: createdIncident.title,
  description: createdIncident.description ?? '',
  categoryId: CATEGORY_ID,
  latitude: deviceCoordinates.latitude,
  longitude: deviceCoordinates.longitude,
  accuracy: deviceCoordinates.accuracy,
};

describe('useIncidentLocationSubmit', () => {
  // Espía de Alert.alert: evita el diálogo nativo y permite pulsar sus botones.
  let alertSpy: jest.SpyInstance;
  let openSettingsSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    mockedAreLocationServicesEnabled.mockReset();
    mockedRequestLocationPermission.mockReset();
    mockedGetCurrentCoordinates.mockReset();

    // Defaults felices: servicios activos, permiso concedido y coordenadas fijas.
    mockedAreLocationServicesEnabled.mockResolvedValue(true);
    mockedRequestLocationPermission.mockResolvedValue(true);
    mockedGetCurrentCoordinates.mockResolvedValue(deviceCoordinates);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    openSettingsSpy.mockRestore();
  });

  // Devuelve los botones del último Alert.alert emitido.
  function getLastAlertButtons(): AlertButton[] {
    const lastAlertCall = alertSpy.mock.calls.at(-1) as Parameters<typeof Alert.alert> | undefined;
    if (!lastAlertCall) {
      throw new Error('Alert.alert no fue llamado.');
    }
    return lastAlertCall[2] ?? [];
  }

  // Ejecuta el `onPress` del botón indicado del último Alert (el diálogo nativo no existe en Jest).
  async function pressLastAlertButton(buttonText: string): Promise<void> {
    const targetButton = getLastAlertButtons().find((button) => button.text === buttonText);
    if (!targetButton?.onPress) {
      throw new Error(`No hay un botón de Alert con el texto "${buttonText}".`);
    }
    await act(async () => {
      targetButton.onPress?.();
    });
  }

  // Lanza el envío y espera a que se libere el bloqueo.
  async function startSubmitAndWait(params: UseIncidentLocationSubmitParams) {
    const hook = await renderHook(
      (hookParams: UseIncidentLocationSubmitParams) => useIncidentLocationSubmit(hookParams),
      { initialProps: params },
    );
    await act(async () => {
      hook.result.current.startSubmit();
    });
    await waitFor(() => expect(hook.result.current.isResolvingLocation).toBe(false));
    return hook;
  }

  // Escenarios en los que no hay ubicación: nunca se envía y se explica el motivo.
  const blockedLocationScenarios: {
    name: string;
    arrange: (params: UseIncidentLocationSubmitParams) => UseIncidentLocationSubmitParams;
    expectedMessage: string;
  }[] = [
    {
      name: 'la preferencia de ubicación está desactivada',
      arrange: (params) => ({ ...params, isLocationEnabled: false }),
      expectedMessage: LOCATION_DISABLED_MESSAGE,
    },
    {
      name: 'la ubicación del dispositivo está desactivada',
      arrange: (params) => {
        mockedAreLocationServicesEnabled.mockResolvedValue(false);
        return params;
      },
      expectedMessage: DEVICE_LOCATION_DISABLED_MESSAGE,
    },
    {
      name: 'no hay permiso de ubicación',
      arrange: (params) => {
        mockedRequestLocationPermission.mockResolvedValue(false);
        return params;
      },
      expectedMessage: LOCATION_PERMISSION_DENIED_MESSAGE,
    },
    {
      name: 'no se pueden obtener las coordenadas',
      arrange: (params) => {
        mockedGetCurrentCoordinates.mockResolvedValue(null);
        return params;
      },
      expectedMessage: LOCATION_UNAVAILABLE_MESSAGE,
    },
  ];

  describe.each(blockedLocationScenarios)('cuando $name', ({ arrange, expectedMessage }) => {
    it('no envía la incidencia y expone un mensaje claro', async () => {
      const params = arrange(buildParams());
      const { result } = await startSubmitAndWait(params);

      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(result.current.submitErrorMessage).toBe(expectedMessage);
      expect(result.current.createdIncident).toBeNull();
    });

    it('libera el bloqueo para poder reintentar y, al reintentar con ubicación, envía', async () => {
      const params = arrange(buildParams());
      const { result, rerender } = await startSubmitAndWait(params);

      // Se resuelve la causa (ubicación disponible) y se reintenta.
      mockedAreLocationServicesEnabled.mockResolvedValue(true);
      mockedRequestLocationPermission.mockResolvedValue(true);
      mockedGetCurrentCoordinates.mockResolvedValue(deviceCoordinates);
      const retryParams = { ...params, isLocationEnabled: true };
      await rerender(retryParams);

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));

      expect(retryParams.submitIncident).toHaveBeenCalledWith(expectedDeviceLocationInput, selectedPhotoUris);
      expect(result.current.submitErrorMessage).toBeNull();
    });
  });

  describe('ubicación desactivada por preferencia', () => {
    it('no consulta los servicios ni los permisos de ubicación del dispositivo', async () => {
      await startSubmitAndWait(buildParams({ isLocationEnabled: false }));

      expect(mockedAreLocationServicesEnabled).not.toHaveBeenCalled();
      expect(mockedRequestLocationPermission).not.toHaveBeenCalled();
    });
  });

  describe('sin permiso de ubicación (native)', () => {
    beforeEach(() => {
      mockedRequestLocationPermission.mockResolvedValue(false);
    });

    it('ofrece un Alert con "Cerrar" y "Abrir Ajustes", sin opción de enviar sin ubicación', async () => {
      await startSubmitAndWait(buildParams());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      const buttonTexts = getLastAlertButtons().map((button) => button.text);
      expect(buttonTexts).toEqual(['Cerrar', 'Abrir Ajustes']);
      expect(buttonTexts).not.toContain('Enviar sin ubicación');
    });

    it('al pulsar "Abrir Ajustes" llama a Linking.openSettings y no envía la incidencia', async () => {
      const params = buildParams();
      await startSubmitAndWait(params);

      await pressLastAlertButton('Abrir Ajustes');

      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
      expect(params.submitIncident).not.toHaveBeenCalled();
    });
  });

  describe('servicios del dispositivo desactivados', () => {
    it('no muestra ningún Alert (el mensaje en pantalla basta)', async () => {
      mockedAreLocationServicesEnabled.mockResolvedValue(false);
      await startSubmitAndWait(buildParams());

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('sin categoría', () => {
    it('no envía la incidencia ni consulta la ubicación', async () => {
      const params = buildParams({ categoryId: null });
      const { result } = await startSubmitAndWait(params);

      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(mockedAreLocationServicesEnabled).not.toHaveBeenCalled();
      expect(result.current.submitErrorMessage).toBe(CATEGORY_REQUIRED_MESSAGE);
    });
  });

  describe('camino feliz con ubicación del dispositivo', () => {
    it('pasa las coordenadas reales, la precisión y la categoría a submitIncident junto con las fotos', async () => {
      const params = buildParams();
      await startSubmitAndWait(params);

      expect(params.submitIncident).toHaveBeenCalledTimes(1);
      expect(params.submitIncident).toHaveBeenCalledWith(expectedDeviceLocationInput, selectedPhotoUris);
    });

    it('puebla createdIncident con result.incident sin errores ni avisos de fotos', async () => {
      const { result } = await startSubmitAndWait(buildParams());

      expect(result.current.createdIncident).toEqual(createdIncident);
      expect(result.current.submitErrorMessage).toBeNull();
      expect(result.current.imagesUploadErrorMessage).toBeNull();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('usa accuracy null cuando el dispositivo no informa de precisión', async () => {
      mockedGetCurrentCoordinates.mockResolvedValue({ ...deviceCoordinates, accuracy: null });
      const params = buildParams();
      await startSubmitAndWait(params);

      expect(params.submitIncident).toHaveBeenCalledWith(
        { ...expectedDeviceLocationInput, accuracy: null },
        selectedPhotoUris,
      );
    });
  });

  describe('backendFallbackNotice', () => {
    it('es null cuando la incidencia la registró el backend real', async () => {
      const { result } = await startSubmitAndWait(buildParams());

      expect(result.current.backendFallbackNotice).toBeNull();
    });

    it('muestra el aviso de mock cuando result.source es "mock"', async () => {
      const params = buildParams({
        submitIncident: jest.fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockResolvedValue(mockCreateResult),
      });
      const { result } = await startSubmitAndWait(params);

      expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
    });
  });

  describe('submitIncident devuelve null', () => {
    it('no puebla createdIncident ni avisos', async () => {
      const params = buildParams({
        submitIncident: jest.fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockResolvedValue(null),
      });
      const { result } = await startSubmitAndWait(params);

      expect(result.current.createdIncident).toBeNull();
      expect(result.current.backendFallbackNotice).toBeNull();
      expect(result.current.imagesUploadErrorMessage).toBeNull();
    });
  });

  describe('fallo de la subida de fotos', () => {
    function buildFailedImagesParams() {
      return buildParams({
        submitIncident: jest.fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockResolvedValue(failedImagesCreateResult),
      });
    }

    it('la incidencia queda creada y se expone el mensaje de fotos por separado', async () => {
      const { result } = await startSubmitAndWait(buildFailedImagesParams());

      expect(result.current.createdIncident).toEqual(createdIncident);
      expect(result.current.imagesUploadErrorMessage).toBe(IMAGES_UPLOAD_ERROR);
      expect(result.current.submitErrorMessage).toBeNull();
    });

    it('retryImageUpload reintenta solo la subida, sin volver a crear la incidencia', async () => {
      const params = buildFailedImagesParams();
      const { result } = await startSubmitAndWait(params);

      await act(async () => {
        result.current.retryImageUpload();
      });
      await waitFor(() => expect(result.current.imagesUploadErrorMessage).toBeNull());

      expect(params.uploadPendingImages).toHaveBeenCalledTimes(1);
      expect(params.uploadPendingImages).toHaveBeenCalledWith(failedImagesCreateResult);
      expect(params.submitIncident).toHaveBeenCalledTimes(1);
      expect(result.current.isRetryingImageUpload).toBe(false);
    });

    it('si el reintento vuelve a fallar se mantiene el mensaje', async () => {
      const params = buildFailedImagesParams();
      jest.mocked(params.uploadPendingImages).mockImplementation(async (result) => result);
      const { result } = await startSubmitAndWait(params);

      await act(async () => {
        result.current.retryImageUpload();
      });
      await waitFor(() => expect(result.current.isRetryingImageUpload).toBe(false));

      expect(result.current.imagesUploadErrorMessage).toBe(IMAGES_UPLOAD_ERROR);
    });

    it('ignora un segundo retryImageUpload mientras el primero está en curso', async () => {
      const pendingUpload = createDeferred<CreateIncidentResult>();
      const params = buildFailedImagesParams();
      jest.mocked(params.uploadPendingImages).mockReturnValue(pendingUpload.promise);
      const { result } = await startSubmitAndWait(params);

      await act(async () => {
        result.current.retryImageUpload();
        result.current.retryImageUpload();
      });
      expect(result.current.isRetryingImageUpload).toBe(true);

      await act(async () => {
        pendingUpload.resolve({ ...failedImagesCreateResult, pendingImageUris: [], imagesUploadErrorMessage: null });
      });

      expect(params.uploadPendingImages).toHaveBeenCalledTimes(1);
      expect(result.current.isRetryingImageUpload).toBe(false);
    });

    it('retryImageUpload no hace nada si no hay fotos pendientes', async () => {
      const params = buildParams();
      const { result } = await startSubmitAndWait(params);

      await act(async () => {
        result.current.retryImageUpload();
      });

      expect(params.uploadPendingImages).not.toHaveBeenCalled();
    });
  });

  describe('isResolvingLocation y doble envío', () => {
    it('sigue en true mientras submitIncident está pendiente y vuelve a false al terminar', async () => {
      const pendingSubmit = createDeferred<CreateIncidentResult | null>();
      const params = buildParams({
        submitIncident: jest.fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockReturnValue(pendingSubmit.promise),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(params.submitIncident).toHaveBeenCalled());
      expect(result.current.isResolvingLocation).toBe(true);

      await act(async () => {
        pendingSubmit.resolve(backendCreateResult);
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
    });

    it('ignora un segundo startSubmit mientras hay un envío en curso', async () => {
      const pendingSubmit = createDeferred<CreateIncidentResult | null>();
      const params = buildParams({
        submitIncident: jest.fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockReturnValue(pendingSubmit.promise),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
        result.current.startSubmit();
      });
      await act(async () => {
        pendingSubmit.resolve(backendCreateResult);
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
      expect(params.submitIncident).toHaveBeenCalledTimes(1);
    });

    it('si un servicio lanza, expone submitErrorMessage y libera el bloqueo', async () => {
      mockedAreLocationServicesEnabled.mockRejectedValue(new Error('fallo nativo'));
      const params = buildParams();
      const { result } = await startSubmitAndWait(params);

      expect(result.current.submitErrorMessage).toBe(UNEXPECTED_SUBMIT_ERROR);
      expect(params.submitIncident).not.toHaveBeenCalled();
    });
  });

  describe('en web (Platform.OS = web)', () => {
    let originalPlatformOsDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalPlatformOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        enumerable: true,
        get: () => 'web',
      });
    });

    afterEach(() => {
      if (originalPlatformOsDescriptor) {
        Object.defineProperty(Platform, 'OS', originalPlatformOsDescriptor);
      }
    });

    it('sin permiso no muestra diálogos, no envía y libera el bloqueo con el mensaje', async () => {
      mockedRequestLocationPermission.mockResolvedValue(false);
      const params = buildParams();
      const { result } = await startSubmitAndWait(params);

      expect(alertSpy).not.toHaveBeenCalled();
      expect(openSettingsSpy).not.toHaveBeenCalled();
      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(result.current.submitErrorMessage).toBe(LOCATION_PERMISSION_DENIED_MESSAGE);
    });
  });
});
