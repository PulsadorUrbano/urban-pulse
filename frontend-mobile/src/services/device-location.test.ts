/// <reference types="jest" />
import * as ExpoLocation from 'expo-location';

import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from './device-location';

// Mockea el módulo nativo de ubicación para controlar permisos, servicios y posiciones.
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const getForegroundPermissionsMock = jest.mocked(ExpoLocation.getForegroundPermissionsAsync);
const requestForegroundPermissionsMock = jest.mocked(ExpoLocation.requestForegroundPermissionsAsync);
const hasServicesEnabledMock = jest.mocked(ExpoLocation.hasServicesEnabledAsync);
const getCurrentPositionMock = jest.mocked(ExpoLocation.getCurrentPositionAsync);
const getLastKnownPositionMock = jest.mocked(ExpoLocation.getLastKnownPositionAsync);

// Construye una respuesta de permiso con el estado indicado.
function buildPermissionResponse(granted: boolean): ExpoLocation.LocationPermissionResponse {
  return {
    granted,
    status: (granted ? 'granted' : 'denied') as ExpoLocation.LocationPermissionResponse['status'],
    canAskAgain: true,
    expires: 'never',
  };
}

// Construye una posición nativa con las coordenadas indicadas.
function buildPosition(
  latitude: number,
  longitude: number,
  accuracy: number | null,
): ExpoLocation.LocationObject {
  return {
    coords: {
      latitude,
      longitude,
      altitude: null,
      accuracy,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1760000000000,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('requestLocationPermission', () => {
  it('devuelve true sin volver a pedir el permiso cuando ya está concedido', async () => {
    getForegroundPermissionsMock.mockResolvedValue(buildPermissionResponse(true));

    await expect(requestLocationPermission()).resolves.toBe(true);
    expect(requestForegroundPermissionsMock).not.toHaveBeenCalled();
  });

  it('devuelve true cuando el permiso no estaba concedido y el usuario lo concede', async () => {
    getForegroundPermissionsMock.mockResolvedValue(buildPermissionResponse(false));
    requestForegroundPermissionsMock.mockResolvedValue(buildPermissionResponse(true));

    await expect(requestLocationPermission()).resolves.toBe(true);
    expect(requestForegroundPermissionsMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve false cuando el usuario deniega el permiso', async () => {
    getForegroundPermissionsMock.mockResolvedValue(buildPermissionResponse(false));
    requestForegroundPermissionsMock.mockResolvedValue(buildPermissionResponse(false));

    await expect(requestLocationPermission()).resolves.toBe(false);
    expect(requestForegroundPermissionsMock).toHaveBeenCalledTimes(1);
  });
});

describe('areLocationServicesEnabled', () => {
  it('devuelve true cuando los servicios están activos', async () => {
    hasServicesEnabledMock.mockResolvedValue(true);

    await expect(areLocationServicesEnabled()).resolves.toBe(true);
  });

  it('devuelve false cuando los servicios están desactivados', async () => {
    hasServicesEnabledMock.mockResolvedValue(false);

    await expect(areLocationServicesEnabled()).resolves.toBe(false);
  });

  it('devuelve true cuando la consulta nativa lanza un error', async () => {
    hasServicesEnabledMock.mockRejectedValue(new Error('services unavailable'));

    await expect(areLocationServicesEnabled()).resolves.toBe(true);
  });
});

describe('getCurrentCoordinates', () => {
  it('devuelve las coordenadas de la posición actual', async () => {
    getCurrentPositionMock.mockResolvedValue(buildPosition(4.6533, -74.0836, 12.5));

    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 4.6533,
      longitude: -74.0836,
      accuracy: 12.5,
    });

    // La posición actual se pide con la precisión equilibrada del mock (Balanced = 3).
    expect(getCurrentPositionMock).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('devuelve accuracy null cuando la posición actual no la reporta', async () => {
    getCurrentPositionMock.mockResolvedValue(buildPosition(4.6533, -74.0836, null));

    const coordinates = await getCurrentCoordinates();

    expect(coordinates?.accuracy).toBeNull();
  });

  it('usa la última posición conocida cuando falla la posición actual', async () => {
    getCurrentPositionMock.mockRejectedValue(new Error('no signal'));
    getLastKnownPositionMock.mockResolvedValue(buildPosition(1.5, -2.5, 30));

    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 1.5,
      longitude: -2.5,
      accuracy: 30,
    });
    expect(getLastKnownPositionMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve null cuando no hay última posición conocida', async () => {
    getCurrentPositionMock.mockRejectedValue(new Error('no signal'));
    getLastKnownPositionMock.mockResolvedValue(null);

    await expect(getCurrentCoordinates()).resolves.toBeNull();
  });

  it('devuelve null cuando fallan la posición actual y la última conocida', async () => {
    getCurrentPositionMock.mockRejectedValue(new Error('no signal'));
    getLastKnownPositionMock.mockRejectedValue(new Error('no last known'));

    await expect(getCurrentCoordinates()).resolves.toBeNull();
  });
});
