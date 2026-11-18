/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton, Linking, Platform } from 'react-native';

import {
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

// Textos fijos del hook; se repiten aquí para que cualquier cambio de copy rompa el test a propósito.
const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, realizando en el mock';
const DEVICE_OFF_ALERT_TITLE = 'Ubicación del dispositivo desactivada';
const PERMISSION_ALERT_TITLE = 'Permiso de ubicación';
const NO_LOCATION_DEVICE_OFF_NOTICE =
  'La incidencia se registró sin ubicación porque la ubicación del dispositivo está desactivada.';
const NO_LOCATION_PERMISSION_NOTICE =
  'La incidencia se registró sin ubicación porque no hay permiso de ubicación.';
const NO_COORDINATES_NOTICE =
  'No se pudo obtener la ubicación; la incidencia se registró sin posición.';

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
  categoryId: null,
  category: null,
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
};

const mockCreateResult: CreateIncidentResult = {
  incident: { ...createdIncident, id: '99' },
  source: 'mock',
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
    categoryId: null,
    category: null,
    selectedPhotoUris,
    submitIncident: jest.fn<
      ReturnType<SubmitIncidentFn>,
      Parameters<SubmitIncidentFn>
    >().mockResolvedValue(backendCreateResult),
    ...overrides,
  };
}

// Input esperado en `submitIncident` cuando no hay ubicación (coordenadas a null).
const expectedNoLocationInput: CreateIncidentInput = {
  title: createdIncident.title,
  description: createdIncident.description ?? '',
  categoryId: null,
  category: null,
  latitude: null,
  longitude: null,
  accuracy: null,
};

// Input esperado cuando la ubicación del dispositivo se resolvió correctamente.
const expectedDeviceLocationInput: CreateIncidentInput = {
  ...expectedNoLocationInput,
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

  // Devuelve el título del último Alert.alert emitido.
  function getLastAlertTitle(): string {
    const lastAlertCall = alertSpy.mock.calls.at(-1) as Parameters<typeof Alert.alert> | undefined;
    if (!lastAlertCall) {
      throw new Error('Alert.alert no fue llamado.');
    }
    const title = lastAlertCall[0];
    if (typeof title !== 'string') {
      throw new Error('Alert.alert se llamó sin título string.');
    }
    return title;
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

  describe('ubicación desactivada por preferencia', () => {
    it('llama a submitIncident directamente con coordenadas null y sin mostrar ningún Alert', async () => {
      const params = buildParams({ isLocationEnabled: false });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(params.submitIncident).toHaveBeenCalledTimes(1));
      expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('no consulta los servicios ni los permisos de ubicación del dispositivo', async () => {
      const params = buildParams({ isLocationEnabled: false });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
      expect(mockedAreLocationServicesEnabled).not.toHaveBeenCalled();
      expect(mockedRequestLocationPermission).not.toHaveBeenCalled();
      expect(mockedGetCurrentCoordinates).not.toHaveBeenCalled();
    });

    it('deja locationNotice en null porque la omisión fue una preferencia del usuario', async () => {
      const params = buildParams({ isLocationEnabled: false });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(result.current.locationNotice).toBeNull();
    });
  });

  describe('servicios de ubicación del dispositivo desactivados', () => {
    beforeEach(() => {
      mockedAreLocationServicesEnabled.mockResolvedValue(false);
    });

    it('muestra el Alert de ubicación desactivada con los botones Cancelar y Enviar sin ubicación', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      expect(getLastAlertTitle()).toBe(DEVICE_OFF_ALERT_TITLE);
      expect(getLastAlertButtons().map((button) => button.text)).toEqual([
        'Cancelar',
        'Enviar sin ubicación',
      ]);
      expect(getLastAlertButtons()[0]?.style).toBe('cancel');
    });

    it('no envía la incidencia ni pide permiso hasta que el usuario elige una opción', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(mockedRequestLocationPermission).not.toHaveBeenCalled();
      expect(mockedGetCurrentCoordinates).not.toHaveBeenCalled();
    });

    it('mantiene isResolvingLocation en true mientras el Alert espera respuesta', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      expect(result.current.isResolvingLocation).toBe(true);
    });

    it('mantiene el bloqueo hasta que termina el envío lanzado desde el Alert', async () => {
      const deferredSubmit = createDeferred<CreateIncidentResult | null>();
      const params = buildParams({
        submitIncident: jest
          .fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockReturnValue(deferredSubmit.promise),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      await pressLastAlertButton('Enviar sin ubicación');

      expect(result.current.isResolvingLocation).toBe(true);

      await act(async () => {
        deferredSubmit.resolve(backendCreateResult);
      });

      expect(result.current.isResolvingLocation).toBe(false);
      expect(result.current.createdIncident).toEqual(createdIncident);
    });

    it('al pulsar "Enviar sin ubicación" envía con coordenadas null y el notice de dispositivo desactivado', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

      await pressLastAlertButton('Enviar sin ubicación');

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(params.submitIncident).toHaveBeenCalledTimes(1);
      expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
      expect(result.current.locationNotice).toBe(NO_LOCATION_DEVICE_OFF_NOTICE);
    });

    it('al pulsar "Cancelar" no envía la incidencia ni deja createdIncident ni notice', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

      await pressLastAlertButton('Cancelar');

      expect(result.current.isResolvingLocation).toBe(false);
      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(result.current.createdIncident).toBeNull();
      expect(result.current.locationNotice).toBeNull();
    });
  });

  describe('sin permiso de ubicación', () => {
    beforeEach(() => {
      mockedRequestLocationPermission.mockResolvedValue(false);
    });

    it('muestra el Alert de permiso con los botones Cancelar, Abrir Ajustes y Enviar sin ubicación', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      expect(getLastAlertTitle()).toBe(PERMISSION_ALERT_TITLE);
      expect(getLastAlertButtons().map((button) => button.text)).toEqual([
        'Cancelar',
        'Abrir Ajustes',
        'Enviar sin ubicación',
      ]);
      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(mockedGetCurrentCoordinates).not.toHaveBeenCalled();
    });

    it('al pulsar "Abrir Ajustes" llama a Linking.openSettings y no envía la incidencia', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

      await pressLastAlertButton('Abrir Ajustes');

      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
      expect(params.submitIncident).not.toHaveBeenCalled();
      expect(result.current.createdIncident).toBeNull();
    });

    it('al pulsar "Enviar sin ubicación" envía con coordenadas null y el notice de permiso', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

      await pressLastAlertButton('Enviar sin ubicación');

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
      expect(result.current.locationNotice).toBe(NO_LOCATION_PERMISSION_NOTICE);
      expect(openSettingsSpy).not.toHaveBeenCalled();
    });
  });

  describe('coordenadas no resueltas', () => {
    beforeEach(() => {
      mockedGetCurrentCoordinates.mockResolvedValue(null);
    });

    it('envía sin coordenadas y sin mostrar Alert, con el notice de posición no obtenida', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(alertSpy).not.toHaveBeenCalled();
      expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
      expect(result.current.locationNotice).toBe(NO_COORDINATES_NOTICE);
    });
  });

  describe('camino feliz con ubicación del dispositivo', () => {
    it('pasa las coordenadas reales y la precisión a submitIncident junto con las fotos', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(params.submitIncident).toHaveBeenCalledTimes(1);
      expect(params.submitIncident).toHaveBeenCalledWith(expectedDeviceLocationInput, selectedPhotoUris);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('deja locationNotice en null y puebla createdIncident con result.incident', async () => {
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(result.current.locationNotice).toBeNull();
      expect(result.current.isResolvingLocation).toBe(false);
    });

    it('usa accuracy null cuando el dispositivo no informa de precisión', async () => {
      mockedGetCurrentCoordinates.mockResolvedValue({ ...deviceCoordinates, accuracy: null });
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(params.submitIncident).toHaveBeenCalledWith(
        { ...expectedDeviceLocationInput, accuracy: null },
        selectedPhotoUris,
      );
    });
  });

  describe('backendFallbackNotice', () => {
    it('es null cuando la incidencia la registró el backend real', async () => {
      const params = buildParams({
        submitIncident: jest.fn().mockResolvedValue(backendCreateResult),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
      expect(result.current.backendFallbackNotice).toBeNull();
    });

    it('muestra el aviso de mock cuando result.source es "mock"', async () => {
      const params = buildParams({
        submitIncident: jest.fn().mockResolvedValue(mockCreateResult),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.createdIncident).toEqual(mockCreateResult.incident));
      expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
    });
  });

  describe('submitIncident devuelve null', () => {
    it('no modifica locationNotice, backendFallbackNotice ni createdIncident desde su valor inicial', async () => {
      const params = buildParams({
        submitIncident: jest.fn().mockResolvedValue(null),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
      expect(params.submitIncident).toHaveBeenCalledTimes(1);
      expect(result.current.locationNotice).toBeNull();
      expect(result.current.backendFallbackNotice).toBeNull();
      expect(result.current.createdIncident).toBeNull();
    });

    it('conserva el resultado previo de un envío anterior exitoso', async () => {
      const submitIncident = jest
        .fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
        .mockResolvedValueOnce(mockCreateResult)
        .mockResolvedValueOnce(null);
      const params = buildParams({ submitIncident });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(result.current.createdIncident).toEqual(mockCreateResult.incident));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(submitIncident).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));

      expect(result.current.createdIncident).toEqual(mockCreateResult.incident);
      expect(result.current.backendFallbackNotice).toBe(MOCK_FALLBACK_NOTICE);
      expect(result.current.locationNotice).toBeNull();
    });
  });

  describe('isResolvingLocation', () => {
    it('es true justo tras startSubmit mientras se comprueban los servicios de ubicación', async () => {
      const servicesCheck = createDeferred<boolean>();
      mockedAreLocationServicesEnabled.mockReturnValueOnce(servicesCheck.promise);
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      expect(result.current.isResolvingLocation).toBe(true);
      expect(params.submitIncident).not.toHaveBeenCalled();

      await act(async () => {
        servicesCheck.resolve(true);
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
    });

    it('sigue en true mientras submitIncident está pendiente y vuelve a false al terminar', async () => {
      const submission = createDeferred<CreateIncidentResult | null>();
      const params = buildParams({
        submitIncident: jest.fn().mockReturnValueOnce(submission.promise),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(params.submitIncident).toHaveBeenCalledTimes(1));
      expect(result.current.isResolvingLocation).toBe(true);

      await act(async () => {
        submission.resolve(backendCreateResult);
      });

      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
      expect(result.current.createdIncident).toEqual(createdIncident);
    });

    it('vuelve a false cuando la ubicación no se resuelve y el envío termina sin resultado', async () => {
      mockedGetCurrentCoordinates.mockResolvedValue(null);
      const params = buildParams({
        submitIncident: jest.fn().mockResolvedValue(null),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(params.submitIncident).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
    });
  });

  describe('doble envío y errores', () => {
    it('ignora un segundo startSubmit mientras hay un envío en curso', async () => {
      const deferredSubmit = createDeferred<CreateIncidentResult | null>();
      const params = buildParams({
        isLocationEnabled: false,
        submitIncident: jest
          .fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockReturnValue(deferredSubmit.promise),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
        result.current.startSubmit();
      });

      expect(params.submitIncident).toHaveBeenCalledTimes(1);

      await act(async () => {
        deferredSubmit.resolve(backendCreateResult);
      });
      expect(result.current.isResolvingLocation).toBe(false);
    });

    it('ignora un segundo startSubmit mientras el Alert está abierto', async () => {
      mockedAreLocationServicesEnabled.mockResolvedValue(false);
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

      await act(async () => {
        result.current.startSubmit();
      });

      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('tras cancelar el Alert se puede volver a enviar', async () => {
      mockedAreLocationServicesEnabled.mockResolvedValue(false);
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      await pressLastAlertButton('Cancelar');

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    });

    it('si un servicio lanza, expone submitErrorMessage y libera el bloqueo', async () => {
      mockedAreLocationServicesEnabled.mockRejectedValue(new Error('boom'));
      const params = buildParams();
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });

      await waitFor(() =>
        expect(result.current.submitErrorMessage).toBe(
          'No se pudo registrar la incidencia. Inténtalo de nuevo.',
        ),
      );
      expect(result.current.isResolvingLocation).toBe(false);
      expect(params.submitIncident).not.toHaveBeenCalled();
    });

    it('si submitIncident lanza desde el Alert, expone submitErrorMessage y libera el bloqueo', async () => {
      mockedAreLocationServicesEnabled.mockResolvedValue(false);
      const params = buildParams({
        submitIncident: jest
          .fn<ReturnType<SubmitIncidentFn>, Parameters<SubmitIncidentFn>>()
          .mockRejectedValue(new Error('boom')),
      });
      const { result } = await renderHook(() => useIncidentLocationSubmit(params));

      await act(async () => {
        result.current.startSubmit();
      });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
      await pressLastAlertButton('Enviar sin ubicación');

      await waitFor(() =>
        expect(result.current.submitErrorMessage).toBe(
          'No se pudo registrar la incidencia. Inténtalo de nuevo.',
        ),
      );
      expect(result.current.isResolvingLocation).toBe(false);
      expect(result.current.createdIncident).toBeNull();
    });
  });

  describe('en web (Platform.OS = web)', () => {
    // Escenarios de ubicación bloqueada. En web ambos diálogos pasan por window.confirm.
    const webBlockedLocationScenarios: {
      name: string;
      arrangeBlockedLocation: () => void;
      expectedAlertTitle: string;
      expectedNoLocationNotice: string;
    }[] = [
      {
        name: 'permiso denegado',
        arrangeBlockedLocation: () => mockedRequestLocationPermission.mockResolvedValue(false),
        expectedAlertTitle: PERMISSION_ALERT_TITLE,
        expectedNoLocationNotice: NO_LOCATION_PERMISSION_NOTICE,
      },
      {
        name: 'servicios de ubicación desactivados',
        arrangeBlockedLocation: () => mockedAreLocationServicesEnabled.mockResolvedValue(false),
        expectedAlertTitle: DEVICE_OFF_ALERT_TITLE,
        expectedNoLocationNotice: NO_LOCATION_DEVICE_OFF_NOTICE,
      },
    ];

    // Descriptores originales para restaurarlos en afterEach.
    let originalPlatformOsDescriptor: PropertyDescriptor | undefined;
    let originalWindowDescriptor: PropertyDescriptor | undefined;
    let originalWindowConfirmDescriptor: PropertyDescriptor | undefined;
    let windowConfirmMock: jest.Mock<boolean, [string]>;

    beforeEach(() => {
      originalPlatformOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        enumerable: true,
        get: () => 'web',
      });

      originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
      if (typeof globalThis.window === 'undefined') {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          writable: true,
          value: globalThis,
        });
      }
      originalWindowConfirmDescriptor = Object.getOwnPropertyDescriptor(globalThis.window, 'confirm');
      windowConfirmMock = jest.fn<boolean, [string]>().mockReturnValue(false);
      Object.defineProperty(globalThis.window, 'confirm', {
        configurable: true,
        writable: true,
        value: windowConfirmMock,
      });
    });

    afterEach(() => {
      if (originalPlatformOsDescriptor) {
        Object.defineProperty(Platform, 'OS', originalPlatformOsDescriptor);
      }

      if (originalWindowConfirmDescriptor) {
        Object.defineProperty(globalThis.window, 'confirm', originalWindowConfirmDescriptor);
      } else {
        delete (globalThis.window as unknown as { confirm?: unknown }).confirm;
      }

      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
      } else {
        delete (globalThis as unknown as { window?: unknown }).window;
      }
    });

    describe.each(webBlockedLocationScenarios)(
      'cuando $name',
      ({ arrangeBlockedLocation, expectedAlertTitle, expectedNoLocationNotice }) => {
        it('con window.confirm en true envía sin ubicación con el notice correcto y libera el bloqueo', async () => {
          arrangeBlockedLocation();
          windowConfirmMock.mockReturnValue(true);
          const params = buildParams();
          const { result } = await renderHook(() => useIncidentLocationSubmit(params));

          await act(async () => {
            result.current.startSubmit();
          });

          await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
          expect(windowConfirmMock).toHaveBeenCalledTimes(1);
          expect(windowConfirmMock).toHaveBeenCalledWith(expect.stringContaining(expectedAlertTitle));
          expect(params.submitIncident).toHaveBeenCalledTimes(1);
          expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
          expect(result.current.locationNotice).toBe(expectedNoLocationNotice);
        });

        it('con window.confirm en false no envía la incidencia y libera el bloqueo', async () => {
          arrangeBlockedLocation();
          windowConfirmMock.mockReturnValue(false);
          const params = buildParams();
          const { result } = await renderHook(() => useIncidentLocationSubmit(params));

          await act(async () => {
            result.current.startSubmit();
          });

          await waitFor(() => expect(windowConfirmMock).toHaveBeenCalledTimes(1));
          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
          expect(params.submitIncident).not.toHaveBeenCalled();
          expect(result.current.createdIncident).toBeNull();
          expect(result.current.locationNotice).toBeNull();
        });

        it('tras cancelar con window.confirm en false, un segundo startSubmit vuelve a mostrar la confirmación', async () => {
          arrangeBlockedLocation();
          windowConfirmMock.mockReturnValueOnce(false).mockReturnValueOnce(true);
          const params = buildParams();
          const { result } = await renderHook(() => useIncidentLocationSubmit(params));

          await act(async () => {
            result.current.startSubmit();
          });
          await waitFor(() => expect(windowConfirmMock).toHaveBeenCalledTimes(1));
          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));

          await act(async () => {
            result.current.startSubmit();
          });
          await waitFor(() => expect(windowConfirmMock).toHaveBeenCalledTimes(2));
          await waitFor(() => expect(result.current.createdIncident).toEqual(createdIncident));
          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
          expect(params.submitIncident).toHaveBeenCalledTimes(1);
          expect(params.submitIncident).toHaveBeenCalledWith(expectedNoLocationInput, selectedPhotoUris);
        });

        it('no llama a Alert.alert ni a Linking.openSettings', async () => {
          arrangeBlockedLocation();
          windowConfirmMock.mockReturnValue(false);
          const params = buildParams();
          const { result } = await renderHook(() => useIncidentLocationSubmit(params));

          await act(async () => {
            result.current.startSubmit();
          });

          await waitFor(() => expect(windowConfirmMock).toHaveBeenCalledTimes(1));
          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
          expect(alertSpy).not.toHaveBeenCalled();
          expect(openSettingsSpy).not.toHaveBeenCalled();
        });

        it('con window.confirm indefinido libera el bloqueo sin enviar la incidencia', async () => {
          arrangeBlockedLocation();
          Object.defineProperty(globalThis.window, 'confirm', {
            configurable: true,
            writable: true,
            value: undefined,
          });
          const params = buildParams();
          const { result } = await renderHook(() => useIncidentLocationSubmit(params));

          await act(async () => {
            result.current.startSubmit();
          });

          await waitFor(() => expect(result.current.isResolvingLocation).toBe(false));
          expect(params.submitIncident).not.toHaveBeenCalled();
          expect(result.current.createdIncident).toBeNull();
          expect(alertSpy).not.toHaveBeenCalled();
          expect(openSettingsSpy).not.toHaveBeenCalled();
        });
      },
    );
  });
});
