/// <reference types="jest" />
import { Alert, type AlertButton, Text } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import NewIncidentScreen from '@/app/incidents/new';
import { SHEET_DISMISS_DELAY_MS } from '@/components/photo-picker';
import { useSession, type SessionContextValue } from '@/hooks/use-session';
import { fetchCategories } from '@/services/category.service';
import {
  areLocationServicesEnabled,
  getCurrentCoordinates,
  requestLocationPermission,
} from '@/services/device-location';
import { createIncident } from '@/services/incident.service';
import { pickPhotoFromCamera, pickPhotoFromLibrary } from '@/services/photo-picker';
import { storePhoto } from '@/services/storage.service';
import type {
  CreateIncidentInput,
  CreateIncidentResult,
  CreatedIncident,
} from '@/types/incident';
import type { LocationCoordinates } from '@/types/location';
import type { SessionUser } from '@/types/user';

// ---------------------------------------------------------------------------
// Test de INTEGRACIÓN de la pantalla de nueva incidencia: se monta el
// componente real y solo se sustituyen los límites externos (servicios de
// red, del dispositivo y navegación). Los hooks, la validación y el flujo de
// envío corren con su implementación real.
//
// Las fotos viajan dentro del mismo POST multipart de la incidencia: la
// pantalla ya no persiste imágenes por separado.
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test (mismo patrón
// que `photo-picker.test.tsx` y `location-toggle.test.tsx`).
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// La pantalla usa `router.back()` desde la confirmación y `<Redirect>` cuando
// no hay sesión. `Redirect` se sustituye por un stub que pinta el `href`, para
// distinguir "se redirigió a /login" por contenido visible.
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const { Text: MockText } = jest.requireActual<{ Text: typeof Text }>('react-native');

  return {
    router: {
      back: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) =>
      mockReact.createElement(MockText, null, `redirect:${href}`),
  };
});

// Sesión controlada por test: la pantalla lee `user.civicId` para el envío.
jest.mock('@/hooks/use-session', () => ({
  useSession: jest.fn(),
}));

// Insets del área segura a cero; el resto del módulo (SafeAreaView nativo)
// se conserva real vía `requireActual`, igual que hace el mock oficial.
jest.mock('react-native-safe-area-context', () => {
  const safeAreaContext = jest.requireActual(
    'react-native-safe-area-context',
  ) as Record<string, unknown>;

  return {
    ...safeAreaContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  };
});

// Creación de incidencia (POST multipart): se controla su respuesta y se
// verifica con qué input y con qué URIs de fotos se invoca.
jest.mock('@/services/incident.service', () => ({
  createIncident: jest.fn(),
}));

// Ubicación del dispositivo: en los defaults felices los servicios están
// activos, el permiso está concedido y las coordenadas son fijas.
jest.mock('@/services/device-location', () => ({
  areLocationServicesEnabled: jest.fn(),
  requestLocationPermission: jest.fn(),
  getCurrentCoordinates: jest.fn(),
}));

jest.mock('@/services/photo-picker', () => ({
  pickPhotoFromCamera: jest.fn(),
  pickPhotoFromLibrary: jest.fn(),
}));

// Almacenamiento simulado: resuelve de inmediato, sin el retardo real.
jest.mock('@/services/storage.service', () => ({
  storePhoto: jest.fn(),
}));

// Catálogo de categorías: vacío para que el test sea hermético (sin red).
jest.mock('@/services/category.service', () => ({
  fetchCategories: jest.fn(),
}));

// Versiones tipadas de los mocks para configurar respuestas y verificar llamadas.
const mockedCreateIncident = createIncident as jest.MockedFunction<typeof createIncident>;
const mockedFetchCategories = fetchCategories as jest.MockedFunction<typeof fetchCategories>;
const mockedAreLocationServicesEnabled = areLocationServicesEnabled as jest.MockedFunction<
  typeof areLocationServicesEnabled
>;
const mockedRequestLocationPermission = requestLocationPermission as jest.MockedFunction<
  typeof requestLocationPermission
>;
const mockedGetCurrentCoordinates = getCurrentCoordinates as jest.MockedFunction<
  typeof getCurrentCoordinates
>;
const mockedPickPhotoFromCamera = pickPhotoFromCamera as jest.MockedFunction<
  typeof pickPhotoFromCamera
>;
const mockedPickPhotoFromLibrary = pickPhotoFromLibrary as jest.MockedFunction<
  typeof pickPhotoFromLibrary
>;
const mockedStorePhoto = storePhoto as jest.MockedFunction<typeof storePhoto>;
const mockedUseSession = jest.mocked(useSession);

// Civic ID de la sesión activa de fixture. Es el valor que la pantalla debe
// pasar a `createIncident` como segundo argumento (distinto del `id` de usuario).
const SESSION_CIVIC_ID = '6f1c2a3e-8b4d-4e5f-9a0b-1c2d3e4f5a6b';

const sessionUser: SessionUser = {
  id: '1',
  username: 'ciudadano-test',
  email: 'ciudadano@example.com',
  role: 'civic',
  civicId: SESSION_CIVIC_ID,
  source: 'mock',
};

// Construye un valor de sesión completo; por defecto hay un ciudadano activo.
function buildSessionValue(
  overrides: Partial<SessionContextValue> = {},
): SessionContextValue {
  return {
    user: sessionUser,
    token: null,
    isRestoringSession: false,
    signIn: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// URI local fija que devuelve el picker de Galería en el test.
const libraryPhotoUri = 'file:///photos/library-2.jpg';

// Coordenadas fijas resueltas por el dispositivo en el entorno de test.
const deviceCoordinates: LocationCoordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
};

// Texto del formulario: se usa tanto para rellenar la UI como para las aserciones.
const incidentTitle = 'Bache en la avenida';
const incidentDescription = 'Hay un bache profundo que pone en riesgo a los vehículos.';

// Incidencia devuelta por el backend tras el POST multipart (shape CreatedIncident).
const createdIncident: CreatedIncident = {
  id: '42',
  title: incidentTitle,
  description: incidentDescription,
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

// Resultado de `createIncident` cuando la incidencia la registra el backend real.
const backendCreateResult: CreateIncidentResult = {
  incident: createdIncident,
  source: 'backend',
};

// Resultado de `createIncident` cuando el backend no respondió y se simuló en el mock.
const mockCreateResult: CreateIncidentResult = {
  incident: createdIncident,
  source: 'mock',
};

// Aviso que muestra la confirmación cuando la incidencia se guardó en el mock.
const MOCK_FALLBACK_NOTICE = 'No se ha podido conectar al backend, realizando en el mock';

// Input esperado en `createIncident` con los datos del formulario relleno por
// `fillValidIncidentForm`, sin categoría y con la ubicación del dispositivo.
const expectedDeviceSubmission: CreateIncidentInput = {
  title: incidentTitle,
  description: incidentDescription,
  categoryId: null,
  category: null,
  latitude: deviceCoordinates.latitude,
  longitude: deviceCoordinates.longitude,
  accuracy: deviceCoordinates.accuracy,
};

// Mismo envío pero sin ubicación (los tres valores de coordenadas a null).
const expectedNoLocationSubmission: CreateIncidentInput = {
  ...expectedDeviceSubmission,
  latitude: null,
  longitude: null,
  accuracy: null,
};

// Monta la pantalla real con los límites externos ya simulados.
async function renderScreen() {
  return render(<NewIncidentScreen />);
}

// Rellena título y descripción válidos, evitando así los avisos de envío.
async function fillValidIncidentForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Título de la incidencia'), incidentTitle);
  await user.type(
    screen.getByLabelText('Descripción de la incidencia'),
    incidentDescription,
  );
}

// Abre la hoja del PhotoPicker, elige "Galería" y espera a que la foto
// aparezca como miniatura adjunta (el tile "Foto adjunta").
async function attachPhotoFromLibrary(user: ReturnType<typeof userEvent.setup>) {
  // Sin fotos adjuntas no hay cabecera ni tile de añadir: la hoja se abre
  // desde el recuadro pulsable del estado vacío "Añadir imágenes".
  await user.press(screen.getByLabelText('Añadir imágenes'));
  await user.press(screen.getByRole('button', { name: 'Galería' }));

  // La hoja difiere el lanzamiento del picker nativo `SHEET_DISMISS_DELAY_MS`
  // ms para no chocar con la animación de cierre del Modal (expo/expo#8213).
  // Se avanza ese retardo dentro de `act` porque el lanzamiento arranca de
  // forma síncrona el flujo de adjunto (estado de procesamiento del hook).
  // RNTL v14 envuelve el callback de `act` en una función async: hay que
  // AWAIT el act para cerrar su scope (si no, React advierte de act sin await
  // y las actualizaciones de estado siguientes se pierden).
  await act(async () => {
    jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
  });

  await screen.findByLabelText('Foto adjunta');
}

// Añade una segunda foto desde la galería cuando ya hay al menos una adjunta
// (el acceso es el tile "Añadir imagen" en lugar del recuadro vacío).
async function attachAnotherPhotoFromLibrary(
  user: ReturnType<typeof userEvent.setup>,
  expectedPhotoCount: number,
) {
  await user.press(screen.getByLabelText('Añadir imagen'));
  await user.press(screen.getByRole('button', { name: 'Galería' }));

  await act(async () => {
    jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
  });

  await screen.findByText(`Imágenes subidas (${expectedPhotoCount}):`);
}

// Pulsa el botón del último `Alert.alert` que coincida con el texto indicado.
// El diálogo nativo no existe en Jest: se ejecuta directamente su `onPress`.
async function pressLastAlertButton(
  alertSpy: jest.SpyInstance,
  buttonText: string,
): Promise<void> {
  const lastAlertCall = alertSpy.mock.calls.at(-1) as Parameters<typeof Alert.alert> | undefined;
  if (!lastAlertCall) {
    throw new Error('Alert.alert no fue llamado.');
  }

  const alertButtons: AlertButton[] = lastAlertCall[2] ?? [];
  const targetButton = alertButtons.find((button) => button.text === buttonText);
  if (!targetButton?.onPress) {
    throw new Error(`No hay un botón de Alert con el texto "${buttonText}".`);
  }

  await act(async () => {
    targetButton.onPress?.();
  });
}

describe('NewIncidentScreen', () => {
  // Espía de Alert.alert: evita el diálogo nativo y permite pulsar sus botones.
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    // userEvent.press simula una pulsación con duración; los fake timers la aceleran.
    jest.useFakeTimers();

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    mockedCreateIncident.mockReset();
    mockedFetchCategories.mockReset();
    mockedAreLocationServicesEnabled.mockReset();
    mockedRequestLocationPermission.mockReset();
    mockedGetCurrentCoordinates.mockReset();
    mockedPickPhotoFromCamera.mockReset();
    mockedPickPhotoFromLibrary.mockReset();
    mockedStorePhoto.mockReset();
    mockedUseSession.mockReturnValue(buildSessionValue());

    // Defaults felices de todos los límites externos: catálogo vacío,
    // ubicación resuelta y envío correcto.
    mockedFetchCategories.mockResolvedValue({ categories: [], source: 'backend', backendErrorMessage: null });
    mockedCreateIncident.mockResolvedValue(backendCreateResult);
    mockedAreLocationServicesEnabled.mockResolvedValue(true);
    mockedRequestLocationPermission.mockResolvedValue(true);
    mockedGetCurrentCoordinates.mockResolvedValue(deviceCoordinates);
    mockedPickPhotoFromCamera.mockResolvedValue(libraryPhotoUri);
    mockedPickPhotoFromLibrary.mockResolvedValue(libraryPhotoUri);
    // Sin retardo real: el "guardado" de la foto se resuelve de inmediato.
    mockedStorePhoto.mockResolvedValue(libraryPhotoUri);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  it('renderiza la sección de fotos y los controles fijos de envío y ubicación', async () => {
    await renderScreen();

    // Estado vacío de fotos: sin cabecera de contador (solo aparece con ≥1
    // foto) y con el recuadro pulsable "Añadir imágenes" y su texto de
    // invitación. El tile de añadir "+" ("Añadir imagen") solo aparece con
    // ≥1 foto (aquí aún no hay ninguna).
    expect(screen.queryByText('Imágenes subidas (0):')).not.toBeOnTheScreen();
    expect(screen.getByText('¿Desea añadir imágenes?')).toBeOnTheScreen();
    expect(screen.getByLabelText('Añadir imágenes')).toBeOnTheScreen();
    expect(screen.queryByText('Recomendado')).not.toBeOnTheScreen();

    // Footer fijo en fila: Enviar (flex-1) y el toggle de ubicación a su
    // derecha (activado por defecto), ya sin FAB absoluto.
    expect(screen.getByLabelText('Enviar incidencia')).toBeOnTheScreen();
    expect(screen.getByLabelText('Desactivar ubicación')).toBeOnTheScreen();
  });

  it('aplica los colores finales: Enviar con fondo blanco y texto negro, y el toggle con fondo negro', async () => {
    await renderScreen();

    // El Pressable solo gestiona la opacidad activa; el fondo blanco final
    // (#ffffff) vive en el `View` interior que contiene el texto "Enviar".
    const submitButton = screen.getByLabelText('Enviar incidencia');
    expect(submitButton.children[0]).toHaveStyle({ backgroundColor: '#ffffff' });

    // El texto "Enviar" (ThemedText) recibe el color final negro (#000000).
    expect(screen.getByText('Enviar')).toHaveStyle({ color: '#000000' });

    // DEBUG temporal: inspeccionar props del host del toggle.
    // El botón de localización (ubicación activada por defecto en los mocks)
    // usa `bg-black` en className, que debe resolver a #000000 en el estilo.
    expect(screen.getByLabelText('Desactivar ubicación')).toHaveStyle({
      backgroundColor: '#000000',
    });
  });

  it('al adjuntar una foto y enviar, pasa la URI adjunta como segundo argumento de createIncident', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);
    await attachPhotoFromLibrary(user);

    // La URI elegida aparece como miniatura antes de enviar y el display
    // cambia al de fotos: encabezado con contador actualizado y el tile "+"
    // de añadir (ya sin el texto "Recomendado").
    expect(screen.getByLabelText('Foto adjunta')).toBeOnTheScreen();
    expect(screen.getByText('Imágenes subidas (1):')).toBeOnTheScreen();
    expect(screen.getByLabelText('Añadir imagen')).toBeOnTheScreen();
    expect(screen.queryByText('Recomendado')).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText('Enviar incidencia'));

    // Pantalla de confirmación tras el registro correcto.
    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    // Una sola llamada: el input de la incidencia y las URIs de las fotos
    // viajan juntos en el mismo envío multipart.
    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedDeviceSubmission, SESSION_CIVIC_ID,[libraryPhotoUri]);

    // Sin aviso de fotos en la confirmación.
    expect(screen.queryByText(/no pudo guardarse/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/no pudieron guardarse/)).not.toBeOnTheScreen();
  });

  it('con dos fotos adjuntas envía ambas URIs en orden de adjunto', async () => {
    const firstPhotoUri = 'file:///photos/first-1.png';
    mockedPickPhotoFromLibrary
      .mockResolvedValueOnce(firstPhotoUri)
      .mockResolvedValueOnce(libraryPhotoUri);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);
    await attachPhotoFromLibrary(user);
    await attachAnotherPhotoFromLibrary(user, 2);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedDeviceSubmission, SESSION_CIVIC_ID,[
      firstPhotoUri,
      libraryPhotoUri,
    ]);
  });

  it('al enviar sin fotos pasa un array vacío como segundo argumento y no muestra aviso de fotos', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedDeviceSubmission, SESSION_CIVIC_ID,[]);
    expect(screen.queryByText(/no pudo guardarse/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/no pudieron guardarse/)).not.toBeOnTheScreen();
  });

  it('si falla la creación de la incidencia muestra el banner de error y no llega a la confirmación', async () => {
    mockedCreateIncident.mockRejectedValue(
      new Error('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    );

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(
      await screen.findByText('No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Incidencia registrada')).not.toBeOnTheScreen();
  });

  it('"Volver" en la confirmación navega hacia atrás', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));
    await screen.findByText('Incidencia registrada');

    await user.press(screen.getByLabelText('Volver al inicio'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('con la ubicación activa envía latitude, longitude y accuracy del dispositivo y confirma con estado "reported"', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedGetCurrentCoordinates).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedDeviceSubmission, SESSION_CIVIC_ID,[]);
    expect(screen.getByText('reported')).toBeOnTheScreen();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('con el toggle de ubicación apagado envía latitude, longitude y accuracy null tras confirmar el aviso', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByLabelText('Desactivar ubicación'));
    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    // Con la ubicación desactivada se pide confirmación antes de enviar.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    await pressLastAlertButton(alertSpy, 'Enviar de todas formas');

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    // Con el toggle apagado no se consulta al dispositivo y se envían los tres null.
    expect(mockedAreLocationServicesEnabled).not.toHaveBeenCalled();
    expect(mockedGetCurrentCoordinates).not.toHaveBeenCalled();
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedNoLocationSubmission, SESSION_CIVIC_ID,[]);
    expect(screen.getByText('reported')).toBeOnTheScreen();
  });

  it('si el dispositivo no devuelve coordenadas envía los tres null y avisa en la confirmación', async () => {
    mockedGetCurrentCoordinates.mockResolvedValue(null);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedNoLocationSubmission, SESSION_CIVIC_ID,[]);
    expect(
      screen.getByText('No se pudo obtener la ubicación; la incidencia se registró sin posición.'),
    ).toBeOnTheScreen();
  });

  it('si no hay permiso de ubicación y el usuario envía sin ubicación, envía los tres null', async () => {
    mockedRequestLocationPermission.mockResolvedValue(false);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    await pressLastAlertButton(alertSpy, 'Enviar sin ubicación');

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedGetCurrentCoordinates).not.toHaveBeenCalled();
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedNoLocationSubmission, SESSION_CIVIC_ID,[]);
    expect(
      screen.getByText('La incidencia se registró sin ubicación porque no hay permiso de ubicación.'),
    ).toBeOnTheScreen();
  });

  it('si los servicios de ubicación del dispositivo están desactivados y el usuario envía sin ubicación, envía los tres null', async () => {
    mockedAreLocationServicesEnabled.mockResolvedValue(false);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    await pressLastAlertButton(alertSpy, 'Enviar sin ubicación');

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();

    expect(mockedRequestLocationPermission).not.toHaveBeenCalled();
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedNoLocationSubmission, SESSION_CIVIC_ID,[]);
  });

  it('con source "mock" muestra el aviso de fallback al backend en la confirmación', async () => {
    mockedCreateIncident.mockResolvedValue(mockCreateResult);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();
    expect(screen.getByText(MOCK_FALLBACK_NOTICE)).toBeOnTheScreen();
  });

  it('con source "backend" NO muestra el aviso de fallback al backend', async () => {
    mockedCreateIncident.mockResolvedValue(backendCreateResult);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();
    expect(screen.queryByText(MOCK_FALLBACK_NOTICE)).not.toBeOnTheScreen();
    expect(screen.queryByText(/realizando en el mock/)).not.toBeOnTheScreen();
  });

  it('con source "mock" mantiene el estado "reported", el envío con fotos y el resto de la confirmación', async () => {
    mockedCreateIncident.mockResolvedValue(mockCreateResult);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);
    await attachPhotoFromLibrary(user);

    await user.press(screen.getByLabelText('Enviar incidencia'));

    expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();
    expect(screen.getByText('reported')).toBeOnTheScreen();
    expect(screen.getByText(MOCK_FALLBACK_NOTICE)).toBeOnTheScreen();
    expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
    expect(mockedCreateIncident).toHaveBeenCalledWith(expectedDeviceSubmission, SESSION_CIVIC_ID,[libraryPhotoUri]);
  });

  it('el aviso de fallback no aparece en el formulario antes de enviar', async () => {
    mockedCreateIncident.mockResolvedValue(mockCreateResult);

    const user = userEvent.setup();
    await renderScreen();

    await fillValidIncidentForm(user);

    expect(screen.queryByText(MOCK_FALLBACK_NOTICE)).not.toBeOnTheScreen();
  });

  describe('control de sesión', () => {
    it('sin sesión (user null y ya resuelta) redirige a /login y no muestra el formulario', async () => {
      mockedUseSession.mockReturnValue(
        buildSessionValue({ user: null, isRestoringSession: false }),
      );

      await renderScreen();

      expect(screen.getByText('redirect:/login')).toBeOnTheScreen();
      expect(screen.queryByLabelText('Enviar incidencia')).not.toBeOnTheScreen();
      expect(screen.queryByLabelText('Título de la incidencia')).not.toBeOnTheScreen();
    });

    it('mientras se restaura la sesión muestra el formulario y no redirige a /login', async () => {
      mockedUseSession.mockReturnValue(
        buildSessionValue({ user: null, isRestoringSession: true }),
      );

      await renderScreen();

      expect(screen.queryByText('redirect:/login')).not.toBeOnTheScreen();
      expect(screen.getByLabelText('Enviar incidencia')).toBeOnTheScreen();
      expect(screen.getByLabelText('Título de la incidencia')).toBeOnTheScreen();
    });

    it('con sesión activa envía la incidencia con el civicId de la sesión como segundo argumento', async () => {
      const user = userEvent.setup();
      await renderScreen();

      await fillValidIncidentForm(user);
      await user.press(screen.getByLabelText('Enviar incidencia'));

      expect(await screen.findByText('Incidencia registrada')).toBeOnTheScreen();
      expect(mockedCreateIncident).toHaveBeenCalledTimes(1);
      // El fixture de usuario tiene `id: '1'` y `civicId` distinto: la aserción
      // exige el civicId, no el id de usuario.
      expect(mockedCreateIncident).toHaveBeenCalledWith(
        expectedDeviceSubmission,
        SESSION_CIVIC_ID,
        [],
      );
    });
  });
});
