/// <reference types="jest" />
import { Alert, Platform } from 'react-native';

import { type ConfirmActionParams, confirmAction } from '@/utils/confirm-action';

// ---------------------------------------------------------------------------
// Test unitario de la confirmación multiplataforma. Se sustituyen solo la API
// nativa de alertas (`Alert.alert`), `Platform.OS` y `window.confirm`; la
// función corre con su implementación real.
// ---------------------------------------------------------------------------

const CONFIRM_TITLE = 'Eliminar incidencia';
const CONFIRM_MESSAGE = 'Esta acción no se puede deshacer.';

// Descriptor original de Platform.OS para restaurarlo en afterEach.
const originalPlatformOsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

function setPlatformOs(platformOs: 'ios' | 'android' | 'web'): void {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    enumerable: true,
    get: () => platformOs,
  });
}

function buildConfirmParams(
  overrides: Partial<ConfirmActionParams> = {},
): ConfirmActionParams {
  return {
    title: CONFIRM_TITLE,
    message: CONFIRM_MESSAGE,
    cancel: { text: 'Cancelar', onPress: jest.fn() },
    confirm: { text: 'Eliminar', onPress: jest.fn() },
    ...overrides,
  };
}

describe('confirmAction', () => {
  let alertSpy: jest.SpyInstance;
  let windowConfirmMock: jest.Mock;
  // Indica si este test creó `globalThis.window` y debe eliminarlo al terminar.
  let createdWindowForTest: boolean;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    createdWindowForTest = typeof globalThis.window === 'undefined';
    if (createdWindowForTest) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: globalThis,
      });
    }
    windowConfirmMock = jest.fn<boolean, [string]>().mockReturnValue(false);
    Object.defineProperty(globalThis.window, 'confirm', {
      configurable: true,
      writable: true,
      value: windowConfirmMock,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();

    if (originalPlatformOsDescriptor) {
      Object.defineProperty(Platform, 'OS', originalPlatformOsDescriptor);
    }

    delete (globalThis.window as unknown as { confirm?: unknown }).confirm;
    if (createdWindowForTest) {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
    jest.clearAllMocks();
  });

  describe('en native (Platform.OS = ios)', () => {
    beforeEach(() => {
      setPlatformOs('ios');
    });

    it('llama a Alert.alert con título y mensaje, y con los botones en el orden esperado', () => {
      const nativeOnlyOnPress = jest.fn();
      const params = buildConfirmParams({
        nativeOnlyOptions: [{ text: 'Abrir Ajustes', onPress: nativeOnlyOnPress }],
      });

      confirmAction(params);

      expect(alertSpy).toHaveBeenCalledTimes(1);
      const [alertTitle, alertMessage, alertButtons, alertOptions] = alertSpy.mock.calls[0];
      expect(alertTitle).toBe(CONFIRM_TITLE);
      expect(alertMessage).toBe(CONFIRM_MESSAGE);
      expect(alertButtons).toEqual([
        { text: 'Cancelar', style: 'cancel', onPress: params.cancel.onPress },
        { text: 'Abrir Ajustes', onPress: nativeOnlyOnPress },
        { text: 'Eliminar', onPress: params.confirm.onPress },
      ]);
      expect(alertOptions).toEqual({
        cancelable: true,
        onDismiss: params.cancel.onPress,
      });
    });

    it('no añade estilo a los botones de nativeOnlyOptions', () => {
      const params = buildConfirmParams({
        nativeOnlyOptions: [{ text: 'Abrir Ajustes', onPress: jest.fn() }],
      });

      confirmAction(params);

      const alertButtons = alertSpy.mock.calls[0][2] as { style?: string }[];
      expect(alertButtons[1]).not.toHaveProperty('style');
    });

    it('muestra solo 2 botones (cancelar y confirmar) cuando no hay nativeOnlyOptions', () => {
      const params = buildConfirmParams();

      confirmAction(params);

      const alertButtons = alertSpy.mock.calls[0][2] as { text: string }[];
      expect(alertButtons).toHaveLength(2);
      expect(alertButtons.map((button) => button.text)).toEqual(['Cancelar', 'Eliminar']);
    });

    it('omite nativeOnlyOptions cuando se pasa un array vacío', () => {
      confirmAction(buildConfirmParams({ nativeOnlyOptions: [] }));

      const alertButtons = alertSpy.mock.calls[0][2] as { text: string }[];
      expect(alertButtons).toHaveLength(2);
    });

    it('ejecuta el onPress de cancelar al pulsar el botón cancelar', () => {
      const params = buildConfirmParams();
      confirmAction(params);

      const alertButtons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
      alertButtons[0].onPress();

      expect(params.cancel.onPress).toHaveBeenCalledTimes(1);
      expect(params.confirm.onPress).not.toHaveBeenCalled();
    });

    it('ejecuta el onPress de confirmar al pulsar el botón confirmar', () => {
      const params = buildConfirmParams();
      confirmAction(params);

      const alertButtons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
      alertButtons[1].onPress();

      expect(params.confirm.onPress).toHaveBeenCalledTimes(1);
      expect(params.cancel.onPress).not.toHaveBeenCalled();
    });

    it('ejecuta el onPress de cada nativeOnlyOption al pulsar su botón', () => {
      const nativeOnlyOnPress = jest.fn();
      const params = buildConfirmParams({
        nativeOnlyOptions: [{ text: 'Abrir Ajustes', onPress: nativeOnlyOnPress }],
      });
      confirmAction(params);

      const alertButtons = alertSpy.mock.calls[0][2] as { onPress: () => void }[];
      alertButtons[1].onPress();

      expect(nativeOnlyOnPress).toHaveBeenCalledTimes(1);
      expect(params.cancel.onPress).not.toHaveBeenCalled();
      expect(params.confirm.onPress).not.toHaveBeenCalled();
    });

    it('ejecuta el onDismiss de cancelar cuando el diálogo se descarta', () => {
      const params = buildConfirmParams();
      confirmAction(params);

      const alertOptions = alertSpy.mock.calls[0][3] as { onDismiss: () => void };
      alertOptions.onDismiss();

      expect(params.cancel.onPress).toHaveBeenCalledTimes(1);
      expect(params.confirm.onPress).not.toHaveBeenCalled();
    });

    it('no llama a window.confirm', () => {
      confirmAction(buildConfirmParams());

      expect(windowConfirmMock).not.toHaveBeenCalled();
    });
  });

  describe('en web (Platform.OS = web)', () => {
    beforeEach(() => {
      setPlatformOs('web');
    });

    it('llama a window.confirm con título y mensaje separados por una línea en blanco', () => {
      confirmAction(buildConfirmParams());

      expect(windowConfirmMock).toHaveBeenCalledTimes(1);
      expect(windowConfirmMock).toHaveBeenCalledWith(`${CONFIRM_TITLE}\n\n${CONFIRM_MESSAGE}`);
    });

    it('ejecuta solo confirm.onPress cuando window.confirm devuelve true', () => {
      windowConfirmMock.mockReturnValue(true);
      const params = buildConfirmParams();

      confirmAction(params);

      expect(params.confirm.onPress).toHaveBeenCalledTimes(1);
      expect(params.cancel.onPress).not.toHaveBeenCalled();
    });

    it('ejecuta solo cancel.onPress cuando window.confirm devuelve false', () => {
      windowConfirmMock.mockReturnValue(false);
      const params = buildConfirmParams();

      confirmAction(params);

      expect(params.cancel.onPress).toHaveBeenCalledTimes(1);
      expect(params.confirm.onPress).not.toHaveBeenCalled();
    });

    it('no llama a Alert.alert', () => {
      confirmAction(buildConfirmParams());

      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('nunca ejecuta los nativeOnlyOptions', () => {
      windowConfirmMock.mockReturnValue(true);
      const nativeOnlyOnPress = jest.fn();
      const params = buildConfirmParams({
        nativeOnlyOptions: [{ text: 'Abrir Ajustes', onPress: nativeOnlyOnPress }],
      });

      confirmAction(params);

      expect(nativeOnlyOnPress).not.toHaveBeenCalled();
    });

    it('cancela sin lanzar error cuando window.confirm no es una función', () => {
      Object.defineProperty(globalThis.window, 'confirm', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      const params = buildConfirmParams();

      expect(() => confirmAction(params)).not.toThrow();
      expect(params.cancel.onPress).toHaveBeenCalledTimes(1);
      expect(params.confirm.onPress).not.toHaveBeenCalled();
    });
  });
});
