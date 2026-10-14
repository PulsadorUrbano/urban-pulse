/// <reference types="jest" />
import { act, render, screen, userEvent } from '@testing-library/react-native';

import {
  PHOTO_TILE_SIZE,
  PhotoPicker,
  SHEET_DISMISS_DELAY_MS,
  type PhotoPickerProps,
} from '@/components/photo-picker';
import { MAX_SELECTED_PHOTOS } from '@/hooks/use-photo-attachment';

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

// Evita cargar la fuente del icono en el entorno de test (mismo patrón
// que `location-toggle.test.tsx`).
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

const cameraPhotoUri = 'file:///photos/incident-1.jpg';
const libraryPhotoUri = 'file:///photos/library-2.jpg';

// Ocho URIs únicas para cubrir el límite máximo de fotos adjuntas.
const eightPhotoUris = Array.from(
  { length: MAX_SELECTED_PHOTOS },
  (_, index) => `file:///photos/full-${index}.jpg`,
);

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

  it('en estado vacío muestra el Pressable "Añadir imágenes" y el texto de invitación, sin los textos antiguos ni recuadro de añadir', async () => {
    await renderPhotoPicker();

    // Sin fotos solo hay un Pressable a lo ancho con "+" grande y un texto de
    // invitación; ya no existen el botón "Subir imágenes" ni la aclaración
    // "Son totalmente opcionales…".
    expect(screen.getByLabelText('Añadir imágenes')).toBeOnTheScreen();
    expect(screen.getByText('¿Desea añadir imágenes?')).toBeOnTheScreen();
    expect(screen.queryByText('Subir imágenes')).not.toBeOnTheScreen();
    expect(screen.queryByText('Son totalmente opcionales, pero muy recomendables.')).not.toBeOnTheScreen();

    // El recuadro de añadir solo se renderiza con ≥1 foto.
    expect(screen.queryByLabelText('Añadir imagen')).not.toBeOnTheScreen();
    expect(screen.queryByText('Recomendado')).not.toBeOnTheScreen();
    expect(screen.queryAllByLabelText('Foto adjunta')).toHaveLength(0);
  });

  it('al pulsar "Añadir imágenes" abre la hoja con las opciones "Cámara" y "Galería"', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker();

    await user.press(screen.getByLabelText('Añadir imágenes'));

    expect(screen.getByText('Elige la fuente')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cámara' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Galería' })).toBeOnTheScreen();
  });

  it('al pulsar "Cámara" cierra la hoja y difiere onAttachFromCamera hasta el fin de la animación de cierre', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByLabelText('Añadir imágenes'));
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

    await user.press(screen.getByLabelText('Añadir imágenes'));
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

    await user.press(screen.getByLabelText('Añadir imágenes'));
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

    await user.press(screen.getByLabelText('Añadir imágenes'));
    await user.press(screen.getByLabelText('Cerrar selector de fotos'));

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
    expect(props.onAttachFromCamera).not.toHaveBeenCalled();
    expect(props.onAttachFromLibrary).not.toHaveBeenCalled();
    expect(props.onRemovePhoto).not.toHaveBeenCalled();
  });

  it('al cerrar la hoja por el backdrop no queda ningún callback programado tras el retardo', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker();

    await user.press(screen.getByLabelText('Añadir imágenes'));
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

  it('con URIs renderiza una miniatura por foto, el tile "+" de 120dp y "×" quita la foto correcta', async () => {
    const user = userEvent.setup();
    const { props } = await renderPhotoPicker({
      selectedPhotoUris: [cameraPhotoUri, libraryPhotoUri],
    });

    expect(screen.getAllByLabelText('Foto adjunta')).toHaveLength(2);

    // El tile de añadir sigue disponible al final de la fila y conserva su
    // tamaño cuadrado de 120dp (fuente única en PHOTO_TILE_SIZE). Ahora es un
    // único "+" sin los textos "Añadir imagen" / "Recomendado".
    const addTile = screen.getByLabelText('Añadir imagen');
    expect(addTile).toBeOnTheScreen();
    expect(addTile).toHaveStyle({ width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE });
    expect(screen.queryByText('Añadir imagen')).not.toBeOnTheScreen();
    expect(screen.queryByText('Recomendado')).not.toBeOnTheScreen();

    // Con fotos adjuntas el estado vacío (Pressable "Añadir imágenes") desaparece.
    expect(screen.queryByLabelText('Añadir imágenes')).not.toBeOnTheScreen();

    // El orden de los botones "×" sigue el de la lista: el segundo corresponde
    // a la foto de la galería.
    const removeButtons = screen.getAllByLabelText('Quitar foto');
    expect(removeButtons).toHaveLength(2);

    await user.press(removeButtons[1]);

    expect(props.onRemovePhoto).toHaveBeenCalledTimes(1);
    expect(props.onRemovePhoto).toHaveBeenCalledWith(libraryPhotoUri);
  });

  it('con fotos y isProcessingPhoto el tile "+" muestra el ActivityIndicator y queda deshabilitado', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker({
      selectedPhotoUris: [cameraPhotoUri],
      isProcessingPhoto: true,
    });

    // El tile de añadir queda deshabilitado mientras se procesa: no debe abrir
    // la hoja de selección de origen.
    const addTile = screen.getByLabelText('Añadir imagen');
    expect(addTile.props.accessibilityState.disabled).toBe(true);
    expect(addTile).toBeDisabled();

    // En el tile se muestra el ActivityIndicator en lugar del icono "+".
    // RNTL v14 eliminó UNSAFE_getByType; se recorre el árbol raíz buscando el
    // host nativo del ActivityIndicator (RCTActivityIndicatorView en iOS).
    const root = screen.root;
    expect(root).not.toBeNull();
    const indicatorNodes = (root ?? screen.container).queryAll((instance) =>
      instance.type.includes('ActivityIndicator'),
    );
    expect(indicatorNodes).toHaveLength(1);

    await user.press(addTile);

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
  });

  it('mientras procesa en estado vacío muestra el ActivityIndicator y deshabilita el Pressable "Añadir imágenes"', async () => {
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

    // En estado vacío el spinner sustituye al "+", el Pressable queda
    // deshabilitado y no abre la hoja.
    const emptyStateButton = screen.getByLabelText('Añadir imágenes');
    expect(emptyStateButton.props.accessibilityState.disabled).toBe(true);
    expect(emptyStateButton).toBeDisabled();

    await user.press(emptyStateButton);

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
  });

  it('con 8 URIs muestra el mensaje de máximo y oculta el tile "+"', async () => {
    await renderPhotoPicker({ selectedPhotoUris: eightPhotoUris });

    // Al alcanzar el límite se informa en rojo y desaparece el recuadro de
    // añadir de la fila.
    expect(screen.getByText('El número máximo de imágenes son 8')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Añadir imagen')).not.toBeOnTheScreen();

    // Las ocho miniaturas siguen presentes.
    expect(screen.getAllByLabelText('Foto adjunta')).toHaveLength(MAX_SELECTED_PHOTOS);
  });

  it('muestra el mensaje de error bajo la fila de fotos', async () => {
    const errorMessage = 'No se pudo adjuntar la foto. Inténtalo de nuevo.';
    await renderPhotoPicker({ errorMessage });

    expect(screen.getByText(errorMessage)).toBeOnTheScreen();
  });

  it('deshabilitado expone accessibilityState.disabled y no abre la hoja', async () => {
    const user = userEvent.setup();
    await renderPhotoPicker({ disabled: true });

    const emptyStateButton = screen.getByLabelText('Añadir imágenes');
    expect(emptyStateButton.props.accessibilityState.disabled).toBe(true);
    expect(emptyStateButton).toBeDisabled();

    await user.press(emptyStateButton);

    expect(screen.queryByText('Elige la fuente')).not.toBeOnTheScreen();
  });
});
