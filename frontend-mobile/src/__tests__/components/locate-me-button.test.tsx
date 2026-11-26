/// <reference types="jest" />
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { LocateMeButton } from '@/components/locate-me-button';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import type { LocationCoordinates } from '@/types/location';

// Mockea el servicio de ubicación del dispositivo para controlar permisos, servicios y coordenadas.
jest.mock('@/services/device-location', () => ({
  requestLocationPermission: jest.fn(),
  areLocationServicesEnabled: jest.fn(),
  getCurrentCoordinates: jest.fn(),
}));

const requestLocationPermissionMock = jest.mocked(requestLocationPermission);
const areLocationServicesEnabledMock = jest.mocked(areLocationServicesEnabled);
const getCurrentCoordinatesMock = jest.mocked(getCurrentCoordinates);

const SAMPLE_COORDINATES: LocationCoordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 12,
};

const LOCATION_ALERT_TITLE = 'Ubicación';

// Renderiza el botón con un onLocate espía y devuelve el propio espía.
async function renderLocateMeButton() {
  const onLocate = jest.fn();
  await render(<LocateMeButton onLocate={onLocate} />);
  return { onLocate };
}

// Devuelve el botón por su etiqueta de accesibilidad.
function getLocateButton() {
  return screen.getByRole('button', { name: 'Centrar en mi ubicación' });
}

describe('LocateMeButton', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    // Por defecto el flujo completo tiene éxito; cada test sobreescribe lo que necesite.
    requestLocationPermissionMock.mockResolvedValue(true);
    areLocationServicesEnabledMock.mockResolvedValue(true);
    getCurrentCoordinatesMock.mockResolvedValue(SAMPLE_COORDINATES);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('flujo feliz', () => {
    it('al pulsar llama a onLocate con las coordenadas obtenidas y no muestra alertas', async () => {
      const user = userEvent.setup();
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(onLocate).toHaveBeenCalledTimes(1);
      expect(onLocate).toHaveBeenCalledWith(SAMPLE_COORDINATES);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('consulta permiso, servicios y coordenadas en ese orden', async () => {
      const user = userEvent.setup();
      await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(requestLocationPermissionMock).toHaveBeenCalledTimes(1);
      expect(areLocationServicesEnabledMock).toHaveBeenCalledTimes(1);
      expect(getCurrentCoordinatesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('errores', () => {
    it('con permiso denegado muestra alerta y no llama a onLocate', async () => {
      const user = userEvent.setup();
      requestLocationPermissionMock.mockResolvedValue(false);
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        LOCATION_ALERT_TITLE,
        'Permiso de ubicación denegado. Actívalo en los ajustes.',
      );
      expect(onLocate).not.toHaveBeenCalled();
      // Sin permiso no tiene sentido comprobar servicios ni pedir coordenadas.
      expect(areLocationServicesEnabledMock).not.toHaveBeenCalled();
      expect(getCurrentCoordinatesMock).not.toHaveBeenCalled();
    });

    it('con los servicios de ubicación apagados muestra alerta y no llama a onLocate', async () => {
      const user = userEvent.setup();
      areLocationServicesEnabledMock.mockResolvedValue(false);
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        LOCATION_ALERT_TITLE,
        'Los servicios de ubicación están desactivados.',
      );
      expect(onLocate).not.toHaveBeenCalled();
      expect(getCurrentCoordinatesMock).not.toHaveBeenCalled();
    });

    it('con coordenadas null muestra alerta y no llama a onLocate', async () => {
      const user = userEvent.setup();
      getCurrentCoordinatesMock.mockResolvedValue(null);
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        LOCATION_ALERT_TITLE,
        'No se pudo obtener tu ubicación actual.',
      );
      expect(onLocate).not.toHaveBeenCalled();
    });

    it('si un servicio lanza excepción muestra alerta genérica y no llama a onLocate', async () => {
      const user = userEvent.setup();
      getCurrentCoordinatesMock.mockRejectedValue(new Error('native failure'));
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        LOCATION_ALERT_TITLE,
        'No se pudo obtener tu ubicación actual.',
      );
      expect(onLocate).not.toHaveBeenCalled();
    });

    it('si la comprobación de permiso lanza excepción muestra alerta y no llama a onLocate', async () => {
      const user = userEvent.setup();
      requestLocationPermissionMock.mockRejectedValue(new Error('permission failure'));
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(onLocate).not.toHaveBeenCalled();
    });

    it('tras un error vuelve a estar habilitado y una nueva pulsación con éxito llama a onLocate', async () => {
      const user = userEvent.setup();
      getCurrentCoordinatesMock.mockResolvedValueOnce(null);
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(getLocateButton()).toBeEnabled();
      expect(getLocateButton().props.accessibilityState.busy).toBe(false);

      await user.press(getLocateButton());

      expect(getCurrentCoordinatesMock).toHaveBeenCalledTimes(2);
      expect(onLocate).toHaveBeenCalledTimes(1);
      expect(onLocate).toHaveBeenCalledWith(SAMPLE_COORDINATES);
    });
  });

  describe('durante la carga', () => {
    // Deja pendiente la petición de permiso para observar el estado intermedio.
    function holdPermissionRequest() {
      let resolvePermission: (granted: boolean) => void = () => undefined;
      requestLocationPermissionMock.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolvePermission = resolve;
          }),
      );
      return {
        grantPermission: (granted: boolean) => resolvePermission(granted),
      };
    }

    it('muestra el indicador de carga, deshabilita el botón y lo marca como ocupado', async () => {
      const user = userEvent.setup();
      holdPermissionRequest();
      await renderLocateMeButton();

      await user.press(getLocateButton());

      expect(screen.getByTestId('locate-me-loading')).toBeOnTheScreen();
      expect(getLocateButton()).toBeDisabled();
      expect(getLocateButton().props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true, busy: true }),
      );
    });

    it('una segunda pulsación durante la carga no repite las llamadas al servicio', async () => {
      const user = userEvent.setup();
      holdPermissionRequest();
      await renderLocateMeButton();

      await user.press(getLocateButton());
      await user.press(getLocateButton());

      expect(requestLocationPermissionMock).toHaveBeenCalledTimes(1);
      expect(getCurrentCoordinatesMock).not.toHaveBeenCalled();
    });

    it('al terminar la carga quita el indicador, rehabilita el botón y llama a onLocate', async () => {
      const user = userEvent.setup();
      const { grantPermission } = holdPermissionRequest();
      const { onLocate } = await renderLocateMeButton();

      await user.press(getLocateButton());
      await act(async () => {
        grantPermission(true);
      });

      expect(screen.queryByTestId('locate-me-loading')).toBeNull();
      expect(getLocateButton()).toBeEnabled();
      expect(onLocate).toHaveBeenCalledWith(SAMPLE_COORDINATES);
    });
  });
});
