import * as ExpoImagePicker from 'expo-image-picker';

// ---------------------------------------------------------------------------
// Servicio de dispositivo: aísla el acceso a `expo-image-picker` (cámara y
// galería) para poder mockearlo fácilmente en los tests, siguiendo el mismo
// patrón que `device-location.ts`.
//
// Contrato de retorno:
//   - `string`  → URI local (`file://...`) de la foto elegida o capturada.
//   - `null`    → el usuario canceló la selección (acción legítima, no error).
//   - `Error`   → permiso denegado o fallo del picker, con mensaje amigable
//                 en español listo para mostrarse al ciudadano.
//
// Este servicio no guarda estado ni persiste nada: el almacenamiento y el
// estado de la UI pertenecen al hook y a `storage.service.ts`.
// ---------------------------------------------------------------------------

// Opciones comunes a la cámara y a la galería:
//   - `mediaTypes: ['images']`: en SDK 57 `MediaTypeOptions` está deprecado;
//     la doc recomienda el array de strings `MediaType` ('images' | 'videos'
//     | 'livePhotos'). Solo interesan fotos estáticas de la incidencia.
//   - `quality: 0.8`: equilibrio entre peso del archivo y nitidez (0 a 1).
//
// La galería NO activa `allowsEditing` a propósito: la pantalla de recorte
// está detrás de cuelgues conocidos al abrir el selector de la biblioteca en
// Android y, además, en SDK 54+ el valor por defecto de la doc ya es `false`.
// Decisión del usuario: galería sin recorte.
const LIBRARY_PICKER_OPTIONS: ExpoImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
};

// La cámara SÍ mantiene el recorte simple tras capturar (`allowsEditing:
// true`), flujo estable en iOS y Android para la captura directa.
const CAMERA_PICKER_OPTIONS: ExpoImagePicker.ImagePickerOptions = {
  ...LIBRARY_PICKER_OPTIONS,
  allowsEditing: true,
};

// Mensajes amigables en español, coherentes con el resto de la app.
const CAMERA_PERMISSION_ERROR_MESSAGE =
  'Necesitamos permiso para usar la cámara. Actívalo desde los ajustes de tu dispositivo para fotografiar la incidencia.';

const CAMERA_LAUNCH_ERROR_MESSAGE =
  'No pudimos abrir la cámara. Inténtalo de nuevo.';

const LIBRARY_LAUNCH_ERROR_MESSAGE =
  'No pudimos abrir tu galería de fotos. Inténtalo de nuevo.';

// Ejecuta el lanzador nativo ya iniciado y normaliza su resultado al contrato
// amigable del servicio. Los errores nativos se convierten en un `Error` con
// el mensaje indicado; la cancelación devuelve `null`.
async function resolvePhotoSelection(
  launchPromise: Promise<ExpoImagePicker.ImagePickerResult>,
  friendlyFailureMessage: string,
): Promise<string | null> {
  let pickerResult: ExpoImagePicker.ImagePickerResult;

  try {
    pickerResult = await launchPromise;
  } catch {
    throw new Error(friendlyFailureMessage);
  }

  if (pickerResult.canceled) {
    // La cancelación es una acción legítima del usuario, no un error.
    return null;
  }

  // Según la doc, `assets` es `null` únicamente cuando se cancela. Se protege
  // el acceso igualmente por si el array llegara vacío.
  return pickerResult.assets?.[0]?.uri ?? null;
}

// Abre la cámara del dispositivo para capturar una foto de la incidencia.
// La cámara siempre exige permiso explícito del usuario: si se deniega se
// lanza un error amigable; si el usuario cancela la captura se devuelve `null`.
export async function pickPhotoFromCamera(): Promise<string | null> {
  let cameraPermission: ExpoImagePicker.PermissionResponse;

  try {
    cameraPermission = await ExpoImagePicker.requestCameraPermissionsAsync();
  } catch {
    throw new Error(CAMERA_PERMISSION_ERROR_MESSAGE);
  }

  if (!cameraPermission.granted) {
    throw new Error(CAMERA_PERMISSION_ERROR_MESSAGE);
  }

  return resolvePhotoSelection(
    ExpoImagePicker.launchCameraAsync(CAMERA_PICKER_OPTIONS),
    CAMERA_LAUNCH_ERROR_MESSAGE,
  );
}

// Abre la galería para elegir una foto existente. En SDK 57 el selector del
// sistema (PHPicker en iOS / Photo Picker en Android) no requiere permiso de
// biblioteca para imágenes, por lo que se lanza directamente sin pedirlo.
export async function pickPhotoFromLibrary(): Promise<string | null> {
  return resolvePhotoSelection(
    ExpoImagePicker.launchImageLibraryAsync(LIBRARY_PICKER_OPTIONS),
    LIBRARY_LAUNCH_ERROR_MESSAGE,
  );
}
