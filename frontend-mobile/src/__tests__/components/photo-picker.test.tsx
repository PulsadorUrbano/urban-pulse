/// <reference types="jest" />
import { act, render, screen, userEvent } from '@testing-library/react-native';

import {
  PHOTO_TILE_SIZE,
  PhotoPicker,
  SHEET_DISMISS_DELAY_MS,
  type PhotoPickerProps,
} from '@/components/photo-picker';

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test (mismo patrón
// que `location-toggle.test.tsx`).
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

const cameraPhotoUri = 'file:///photos/incident-1.jpg';
const libraryPhotoUri = 'file:///photos/library-2.jpg';

// Construye las props por defecto del componente y permite sobreescribirlas.
async function renderPhotoPicker(overrides: Partial<PhotoPickerProps> = {}) {
  const props: PhotoPickerProps = {
    selectedPhotoUris: [],
    isProcessingPhoto: false,
    errorMessage: null,
    onAttachFromCamera: jest.fn(),
    onAttachFromLibrary: jest.fn(),
    onRemovePhoto: jest.fn(),
    ...overrides,
  };

  const renderResult = await render(<PhotoPicker {...props} />);

  return { props, renderResult };
}

describe('PhotoPicker', () => {
  beforeEach(() => {
    // userEvent.press simula una pulsación con duración; los fake timers la aceleran.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('en estado vacío muestra el botón "Subir imágenes" y el texto opcional, sin recuadro de añadir', async () => {
    await renderPhotoPicker();

    // Sin fotos el recuadro discontinuo ya no existe: hay un botón a lo ancho
    // y un texto secundario que aclara que las fotos son opcionales.
    expect(screen.getByRole('button', { name: 'Subir imágenes' })).toBeOnTheScreen();
    expect(
      screen.getByText('Son totalmente opcionales, pero muy recomendables.'),
    ).toBeOnTheScreen();

    // El recuadro de añadir solo se renderiza con ≥1 foto.
    expect(screen.queryByText('Añadir imagen')).not.toBeOnTheScreen();
    expect(screen.queryByText('Recomendado')).not.toBeOnTheScreen();
    expect(screen.queryAllByLabelText('Foto adjunta')).toHaveLength(0);
  });

  it('al pulsar "Subir imágenes" abre la hoja con las opciones "Cámara" y "Galería"', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));

    expect(screen.getByText('Elige la fuente')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cámara' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Galería' })).toBeOnTheScreen();
  });

  it('al pulsar "Cámara" cierra la hoja y difiere onAttachFromCamera hasta el fin de la animación de cierre', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));
    await user.press(screen.getByRole('button', { name: 'Cámara' }));

    // La hoja se cierra de inmediato, pero el picker nativo se lanza diferido
    // `SHEET_DISMISS_DELAY_MS` ms después para no chocar con la animación de
    // cierre del Modal (expo/expo#8213).
    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();

    // El avance se hace dentro de act: al disparar el timer también corren los
    // timers internos del FlatList (VirtualizedList), que actualizan estado.
    await act(async () => {
      jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
    });

    expect(props.onAttachFromCamera).toHaveBeenCalledTimes(1);
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();
  });

  it('al pulsar "Galería" cierra la hoja y difiere onAttachFromLibrary hasta el fin de la animación de cierre', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));
    await user.press(screen.getByRole('button', { name: 'Galería' }));

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
    });

    expect(props.onAttachFromLibrary).toHaveBeenCalledTimes(1);
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
  });

  it('tras elegir "Galería" y avanzar el retardo, onAttachFromLibrary se llama exactamente una vez', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));
    await user.press(screen.getByRole('button', { name: 'Galería' }));

    // Un instante antes del retardo el callback aún no debe haberse lanzado.
    await act(async () => {
      jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS - 1);
    });
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();

    // El último milisegundo dispara el timer; avanzar de más no duplica la llamada.
    await act(async () => {
      jest.advanceTimersByTime(1);
      jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
    });
    expect(props.onAttachFromLibrary).toHaveBeenCalledTimes(1);
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
  });

  it('al pulsar el backdrop cierra la hoja sin llamar a ningún callback', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));
    await user.press(screen.getByLabelText('Cerrar selector de fotos'));

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();
    expect(props.onRemovePhoto).not.toHaveBeenCalled();
  });

  it('al cerrar la hoja por el backdrop no queda ningún callback programado tras el retardo', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByRole('button', { name: 'Subir imágenes' }));
    await user.press(screen.getByLabelText('Cerrar selector de fotos'));

    // Se avanza más allá del retardo de cierre: como no se eligió ningún
    // origen, el timer pendiente (si existiera) no debe disparar callbacks.
    await act(async () => {
      jest.advanceTimersByTime(SHEET_DISMISS_DELAY_MS);
    });

    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();
    expect(props.onRemovePhoto).not.toHaveBeenCalled();
  });

  it('con URIs renderiza una miniatura por foto, el recuadro de 120dp con "Recomendado" y "×" quita la foto correcta', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker({
      selectedPhotoUris: [cameraPhotoUri, libraryPhotoUri],
    });

    expect(screen.getAllByLabelText('Foto adjunta')).toHaveLength(2);

    // El recuadro de añadir sigue disponible al final de la fila y conserva
    // su tamaño cuadrado de 120dp (fuente única en PHOTO_TILE_SIZE).
    const addTile = screen.getByLabelText('Añadir imagen');
    expect(addTile).toBeOnTheScreen();
    expect(addTile).toHaveStyle({ width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE });
    expect(screen.getByText('Añadir imagen')).toBeOnTheScreen();
    expect(screen.getByText('Recomendado')).toBeOnTheScreen();

    // Con fotos adjuntas el estado vacío (botón a lo ancho) desaparece.
    expect(screen.queryByRole('button', { name: 'Subir imágenes' })).not.toBeOnTheScreen();

    // El orden de los botones "×" sigue el de la lista: el segundo corresponde
    // a la foto de la galería.
    const removeButtons = screen.getAllByLabelText('Quitar foto');
    expect(removeButtons).toHaveLength(2);

    await user.press(removeButtons[1]);

    expect(props.onRemovePhoto).toHaveBeenCalledTimes(1);
    expect(props.onRemovePhoto).toHaveBeenCalledWith(libraryPhotoUri);
  });

  it('mientras procesa muestra el ActivityIndicator y deshabilita el botón "Subir imágenes"', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker({ isProcessingPhoto: true });

    // RNTL v14 eliminó UNSAFE_getByType; se recorre el árbol raíz buscando el
    // host nativo del ActivityIndicator (RCTActivityIndicatorView en iOS).
    const root = screen.root;
    expect(root).not.toBeNull();
    const indicatorNodes = (root ?? screen.container).queryAll((instance) =>
      instance.type.includes('ActivityIndicator'),
    );
    expect(indicatorNodes).toHaveLength(1);

    // En estado vacío el spinner sustituye al texto del botón, que queda
    // deshabilitado y no abre la hoja.
    const uploadButton = screen.getByRole('button', { name: 'Subir imágenes' });
    expect(uploadButton.props.accessibilityState.disabled).toBe(true);
    expect(uploadButton).toBeDisabled();

    await user.press(uploadButton);

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
  });

  it('muestra el mensaje de error bajo la fila de fotos', async () => {
    const errorMessage = 'No se pudo adjuntar la foto. Inténtalo de nuevo.';
    await renderPhotoPicker({ errorMessage });

    expect(screen.getByText(errorMessage)).toBeOnTheScreen();
  });

  it('deshabilitado expone accessibilityState.disabled y no abre la hoja', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker({ disabled: true });

    const uploadButton = screen.getByRole('button', { name: 'Subir imágenes' });
    expect(uploadButton.props.accessibilityState.disabled).toBe(true);
    expect(uploadButton).toBeDisabled();

    await user.press(uploadButton);

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
  });
});
