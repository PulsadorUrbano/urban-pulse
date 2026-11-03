/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

import IncidentDetailScreen from '@/app/incidents/[id]';
import { STATUS_LABELS } from '@/components/incident-status-badge';
import { useIncidentDetail, type UseIncidentDetailResult } from '@/hooks/use-incident-detail';
import type { CreatedIncidentImage, IncidentDetail } from '@/types/incident';

// ---------------------------------------------------------------------------
// Test de la pantalla de detalle de incidencia (`incidents/[id]`). Se monta la
// pantalla real con su visor de fotos y su badge reales; solo se sustituyen los
// límites externos: los parámetros de ruta (`useLocalSearchParams`), la
// navegación (`router`) y el hook de carga (`useIncidentDetail`), para poder
// fijar cada escenario sin ejercitar el fetch real.
// ---------------------------------------------------------------------------

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test (mismo patrón
// que `new-incident-screen.test.tsx`).
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// `expo-image` renderiza una vista nativa que RNTL no considera accesible, por lo
// que `getAllByRole('image')` no la encontraría. Se sustituye por un `View` host
// que reenvía las props y se marca como accesible (mismo patrón que
// `incident-photo-viewer.test.tsx`).
jest.mock('expo-image', () => {
  // `jest.mock` no permite referenciar variables externas fuera de un scope
  // permitido (ni siquiera el `React` importado arriba, por la transformación
  // de NativeWind); se usa `jest.requireActual` en vez de `require()` directo
  // para evitar también el warning de lint `no-require-imports`.
  const mockReact = jest.requireActual<typeof React>('react');

  return {
    Image: (props: Record<string, unknown>) =>
      mockReact.createElement('View', { ...props, accessible: true }),
  };
});

// Parámetros de ruta: se inyecta el `id` de la incidencia consultada.
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

// Insets del área segura a cero; el resto del módulo (SafeAreaView nativo)
// se conserva real vía `requireActual`, igual que en el resto de tests de pantallas.
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

// Hook de carga: cada escenario fija su estado devuelto; no hay fetch real.
jest.mock('@/hooks/use-incident-detail', () => ({
  useIncidentDetail: jest.fn(),
}));

const mockedUseIncidentDetail = useIncidentDetail as jest.MockedFunction<typeof useIncidentDetail>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;

const INCIDENT_IMAGE_ACCESSIBILITY_LABEL = 'Foto de la incidencia';
const INCIDENT_ID = 'iB09J7Gfu1k';
const NOT_FOUND_MESSAGE = 'Esta incidencia no existe o ya no está disponible.';
const GENERIC_ERROR_MESSAGE = 'No se pudo obtener la incidencia. Inténtalo de nuevo más tarde.';
// Mismo texto que `BACKEND_FALLBACK_NOTICE` del hook (no exportado).
const BACKEND_FALLBACK_NOTICE = 'No se ha podido conectar al backend, mostrando los datos del mock.';
const EMPTY_CATEGORY_TEXT = 'Sin categoría';
const EMPTY_DESCRIPTION_TEXT = 'Sin descripción';
const NO_PHOTOS_TEXT = 'Sin fotos adjuntas';

function buildIncidentImage(index: number): CreatedIncidentImage {
  return {
    id: `image-${index}`,
    url: `https://picsum.photos/seed/incident-detail-${index}/800/600`,
    mimeType: 'image/jpeg',
    createdAt: '2026-10-24T10:00:00.000Z',
  };
}

const FULL_CATEGORY = 'Vía pública';
const FULL_DESCRIPTION = 'Hay un bache profundo que pone en riesgo a los vehículos.';

// Fixture de incidencia con todos los campos rellenos (imágenes, categoría y descripción).
const fullIncident: IncidentDetail = {
  id: INCIDENT_ID,
  title: 'Bache en la avenida',
  description: FULL_DESCRIPTION,
  civicId: '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5',
  categoryId: 'category-roads',
  category: FULL_CATEGORY,
  urbanAssetId: null,
  location: {
    latitude: 40.4168,
    longitude: -3.7038,
    accuracy: 10,
    createdAt: '2026-10-19T10:00:00.000Z',
  },
  images: [buildIncidentImage(1), buildIncidentImage(2)],
  status: 'validated',
  priority: 'medium',
  createdAt: '2026-10-19T10:00:00.000Z',
};

// Fixture sin imágenes, sin categoría y sin descripción: no debe romper el render.
const incidentWithEmptyFields: IncidentDetail = {
  ...fullIncident,
  description: null,
  category: null,
  categoryId: null,
  images: [],
};

// Estado por defecto del hook: cargado sin incidencia ni error. Cada test sobrescribe lo necesario.
function buildHookState(
  overrides: Partial<UseIncidentDetailResult> = {},
): UseIncidentDetailResult {
  return {
    incident: null,
    isLoading: false,
    errorMessage: null,
    isNotFound: false,
    backendFallbackNotice: null,
    reload: jest.fn(),
    ...overrides,
  };
}

// Monta la pantalla real con el estado del hook indicado.
async function renderDetailScreenWithHookState(state: UseIncidentDetailResult) {
  mockedUseIncidentDetail.mockReturnValue(state);
  await render(<IncidentDetailScreen />);
}

describe('IncidentDetailScreen', () => {
  beforeEach(() => {
    mockedUseIncidentDetail.mockReset();
    mockedUseLocalSearchParams.mockReset();
    jest.mocked(router.back).mockReset();

    mockedUseLocalSearchParams.mockReturnValue({ id: INCIDENT_ID });
  });

  it('con incidencia completa muestra el visor de fotos, el título, el estado, la categoría y la descripción', async () => {
    await renderDetailScreenWithHookState(buildHookState({ incident: fullIncident }));

    // El hook recibe el id de la ruta tal cual.
    expect(mockedUseIncidentDetail).toHaveBeenCalledWith(INCIDENT_ID);

    // Visor de fotos real: una imagen accesible por cada adjunto.
    const renderedImages = screen.getAllByRole('image');
    expect(renderedImages).toHaveLength(fullIncident.images.length);
    renderedImages.forEach((renderedImage, index) => {
      expect(renderedImage).toHaveProp('accessibilityLabel', INCIDENT_IMAGE_ACCESSIBILITY_LABEL);
      expect(renderedImage).toHaveProp('source', { uri: fullIncident.images[index].url });
    });
    expect(screen.queryByText(NO_PHOTOS_TEXT)).not.toBeOnTheScreen();

    expect(screen.getByText(fullIncident.title)).toBeOnTheScreen();
    expect(screen.getByText(STATUS_LABELS[fullIncident.status])).toBeOnTheScreen();
    expect(screen.getByText(FULL_CATEGORY)).toBeOnTheScreen();
    expect(screen.getByText(FULL_DESCRIPTION)).toBeOnTheScreen();

    // Con contenido completo no hay campos de relleno ni estados de error o carga.
    expect(screen.queryByText(EMPTY_CATEGORY_TEXT)).not.toBeOnTheScreen();
    expect(screen.queryByText(EMPTY_DESCRIPTION_TEXT)).not.toBeOnTheScreen();
    expect(screen.queryByText(NOT_FOUND_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByText(GENERIC_ERROR_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Reintentar')).not.toBeOnTheScreen();
  });

  it('con campos vacíos (sin imágenes, categoría ni descripción) no rompe y muestra los textos de relleno', async () => {
    await renderDetailScreenWithHookState(
      buildHookState({ incident: incidentWithEmptyFields }),
    );

    // Sin adjuntos: ninguna imagen renderizada y el placeholder explícito del visor.
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(screen.getByText(NO_PHOTOS_TEXT)).toBeOnTheScreen();

    // El título y el estado siguen visibles aunque falten los demás campos.
    expect(screen.getByText(incidentWithEmptyFields.title)).toBeOnTheScreen();
    expect(screen.getByText(STATUS_LABELS[incidentWithEmptyFields.status])).toBeOnTheScreen();

    expect(screen.getByText(EMPTY_CATEGORY_TEXT)).toBeOnTheScreen();
    expect(screen.getByText(EMPTY_DESCRIPTION_TEXT)).toBeOnTheScreen();
  });

  it('con isNotFound muestra el estado "no encontrado", el botón "Volver" y ningún botón "Reintentar"', async () => {
    await renderDetailScreenWithHookState(buildHookState({ isNotFound: true }));

    expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeOnTheScreen();
    expect(screen.getByLabelText('Volver')).toBeOnTheScreen();

    // Un 404 no ofrece reintento: ni por etiqueta de accesibilidad ni por texto visible.
    expect(screen.queryByLabelText('Reintentar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Reintentar')).not.toBeOnTheScreen();

    // No se muestran el error genérico ni el contenido de la incidencia.
    expect(screen.queryByText(GENERIC_ERROR_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByText(fullIncident.title)).not.toBeOnTheScreen();
  });

  it('con isNotFound, pulsar "Volver" navega hacia atrás una vez', async () => {
    await renderDetailScreenWithHookState(buildHookState({ isNotFound: true }));

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('con errorMessage genérico muestra el mensaje y el botón "Reintentar"; pulsarlo llama a reload una sola vez', async () => {
    const reload = jest.fn();
    await renderDetailScreenWithHookState(
      buildHookState({ errorMessage: GENERIC_ERROR_MESSAGE, reload }),
    );

    expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeOnTheScreen();
    expect(screen.queryByText(NOT_FOUND_MESSAGE)).not.toBeOnTheScreen();

    const retryButton = screen.getByLabelText('Reintentar');
    expect(retryButton).toBeOnTheScreen();

    fireEvent.press(retryButton);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('con backendFallbackNotice no nulo muestra el aviso en pantalla junto al contenido completo', async () => {
    await renderDetailScreenWithHookState(
      buildHookState({
        incident: fullIncident,
        backendFallbackNotice: BACKEND_FALLBACK_NOTICE,
      }),
    );

    expect(screen.getByText(BACKEND_FALLBACK_NOTICE)).toBeOnTheScreen();
    // El aviso no sustituye al contenido: la incidencia sigue mostrándose.
    expect(screen.getByText(fullIncident.title)).toBeOnTheScreen();
  });

  it('con backendFallbackNotice no nulo el aviso sigue visible aunque la carga haya fallado con isNotFound', async () => {
    await renderDetailScreenWithHookState(
      buildHookState({
        isNotFound: true,
        backendFallbackNotice: BACKEND_FALLBACK_NOTICE,
      }),
    );

    expect(screen.getByText(BACKEND_FALLBACK_NOTICE)).toBeOnTheScreen();
    expect(screen.getByText(NOT_FOUND_MESSAGE)).toBeOnTheScreen();
  });

  it('sin backendFallbackNotice no muestra ningún aviso de fallback', async () => {
    await renderDetailScreenWithHookState(buildHookState({ incident: fullIncident }));

    expect(screen.queryByText(BACKEND_FALLBACK_NOTICE)).not.toBeOnTheScreen();
  });

  it('con isLoading y sin incidencia muestra solo el ActivityIndicator, sin error, isNotFound ni contenido', async () => {
    await renderDetailScreenWithHookState(buildHookState({ isLoading: true, incident: null }));

    // RNTL v14 eliminó UNSAFE_getByType; se recorre el árbol buscando el spinner.
    const root = screen.root;
    expect(root).not.toBeNull();
    const indicatorNodes = (root ?? screen.container).queryAll((instance) =>
      instance.type.includes('ActivityIndicator'),
    );
    expect(indicatorNodes).toHaveLength(1);

    // Ningún otro estado visible mientras carga.
    expect(screen.queryByText(NOT_FOUND_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Volver')).not.toBeOnTheScreen();
    expect(screen.queryByText(GENERIC_ERROR_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Reintentar')).not.toBeOnTheScreen();
    expect(screen.queryByText(fullIncident.title)).not.toBeOnTheScreen();
    expect(screen.queryByText(EMPTY_CATEGORY_TEXT)).not.toBeOnTheScreen();
    expect(screen.queryByText(EMPTY_DESCRIPTION_TEXT)).not.toBeOnTheScreen();
  });
});
