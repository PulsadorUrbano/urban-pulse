# 001 · Registro de incidencia — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

## Enfoque

La feature se apoya exclusivamente en la capa mock (`json-server` + `db.json`) y en un contrato
estricto de TypeScript en `src/types/`, sin tocar el backend real. La lógica de red se aísla en
`src/services/` (con un helper HTTP común y reutilizable), el estado de envío y de carga de
categorías en hooks propios y la validación en `src/utils/`, dejando la pantalla como capa de
presentación.

Además, se reorganiza la navegación a la estructura canónica de Expo Router (**`Stack` raíz +
grupo `(tabs)`**) porque NativeTabs no puede empujar pantallas y el formulario debe abrirse
*encima* de las tabs con botón de atrás.

La categoría se modela de forma **dual** para no perder información: si el ciudadano elige una
categoría conocida se guarda su FK (`categoryId`); si escribe una no listada se guarda como texto
libre (`category`). Ambos campos son opcionales y mutuamente excluyentes.

En la UI, la selección de categoría se extrae a un componente presentacional
`CategoryPicker` (`src/components/category-picker.tsx`) con props tipadas, que encapsula la
**hoja inferior** y el **modal de "Otros"** usando el `Modal` nativo de React Native (sin
dependencias nuevas). La pantalla conserva el estado de la selección y los callbacks; el
componente solo pinta.

La **ubicación** se captura **solo al pulsar Enviar** y solo si el toggle está activado:
`expo-location` queda encapsulado tras `src/services/device-location.ts` (permisos + posición) y la
persistencia mock tras `src/services/location.service.ts` (`POST /locations`), de modo que la
pantalla orquesta el flujo (aviso → permiso → captura → `locationId`) sin lógica nativa. Un
`LocationToggle` presentacional (círculo grisáceo + `location_on` con línea diagonal en off) fija la
preferencia y `getIncidentWarnings` unifica en un único `Alert` los motivos de aviso
(`description-empty`, `description-too-short`, `location-disabled`). Cualquier fallo de ubicación
(permiso denegado, GPS apagado, timeout) degrada a envío sin ubicación (`locationId: null`) sin
bloquear el registro.

La **foto** se modela como una entidad propia `IncidentImage` con relación **1:M** respecto a
`Incident` (vía `incidentId`), siguiendo el patrón ya usado con `Location` en 001: el contrato de
`Incident` y de `CreateIncidentInput` **no cambia**. La captura se apoya en `expo-image-picker`
(SDK 57), aislado tras una capa de dispositivo (`src/services/photo-picker.ts`); la persistencia
mock queda en `src/services/image.service.ts` (`POST /images`, reutilizando `fetchWithTimeout`)
y el "almacenamiento" de la foto en `src/services/storage.service.ts`, que simula un retardo de
red para poder probar estados de carga/error sin backend real ni nube.

En la UI, la selección de fotos se concentra en un hook (`use-photo-attachment`) que gestiona la
lista de URIs y los estados (`isProcessing`, `errorMessage`), y en un componente presentacional
`PhotoPicker` (tiles cuadrados + recuadro discontinuo + hoja inferior Cámara/Galería con el
`Modal` nativo, mismo patrón que `CategoryPicker`). La pantalla orquesta el envío:
`createIncident()` primero y, por cada URI, `createImage({ url, incidentId })`; un fallo en las
imágenes degrada a aviso no bloqueante sin deshacer la incidencia. Para que el botón Enviar y el
FAB de ubicación queden siempre visibles, ambos pasan a una **capa superior** (footer fijo +
FAB con `zIndex`/`elevation`) y el `ScrollView` reserva el padding inferior.

## Implementación

1. **Navegación** — `src/app/_layout.tsx` pasa a renderizar un `Stack` raíz; se crea
   `src/app/(tabs)/_layout.tsx` con `AppTabs`; se mueven `index.tsx` y `explore.tsx` a `(tabs)/`.
2. **Tipos** — `src/types/incident.ts`: `IncidentStatus`, `IncidentPriority`, `Incident`
   (incluye `categoryId` y, ahora, `category`) y `CreateIncidentInput`.
3. **Tipo de categoría** — `src/types/category.ts`: `Category { id: string; name: string }`.
4. **Configuración** — `src/constants/config.ts`: `API_BASE_URL` desde `EXPO_PUBLIC_API_URL` con
   fallback a `http://localhost:3001`.
5. **Mock** — `db.json`: colección `incidents` con registros semilla y nueva colección
   `categories` con 3 instancias (`Transporte`, `Alumbrado público`, `Objetos urbanos`).
6. **Helper HTTP** — `src/services/http.ts`: `fetchWithTimeout()` (AbortController + timeout) y
   `RequestTimeoutError`, extraídos de `incident.service.ts` para reutilizarlos en todos los
   servicios.
7. **Servicio de categorías** — `src/services/category.service.ts`: `fetchCategories()` hace
   `GET /categories` y devuelve `Category[]`.
8. **Servicio de incidencias** — `src/services/incident.service.ts`: `createIncident()` añade
   `categoryId` y `category` al payload y migra a `fetchWithTimeout()`.
9. **Hook de envío** — `src/hooks/use-create-incident.ts`: estado `isSubmitting` / `error` /
   `submitIncident()`.
10. **Hook de categorías** — `src/hooks/use-categories.ts`: carga las categorías al montar y expone
    `categories`, `isLoadingCategories` y `categoriesError`.
11. **Validación** — `src/utils/incident-validator.ts`: validación manual de título y del caso
    "Otros" vacío (categoría libre informada sin texto).
12. **Componente de categoría** — `src/components/category-picker.tsx`: control presentacional en
    la esquina inferior del campo Descripción. Sin selección muestra "Añadir categoría +"; al
    pulsarlo abre una **hoja inferior** (`Modal` nativo, `animationType="slide"`, `transparent`
    con overlay) con las categorías del mock y "Otros". "Otros" abre un segundo **modal** con
    `TextInput` y botón Guardar deshabilitado si el texto está vacío. Con selección muestra el
    nombre + "×". Props tipadas: categorías, selección actual, callbacks (`onSelectCategory`,
    `onSelectOther`, `onClear`), estado de carga y error.
13. **UI** — `src/app/incidents/new.tsx`: formulario con estado de carga, error y confirmación.
    Se **retiran los chips** y el campo "Categoría (opcional)" independiente; en su lugar se
    incrusta el `CategoryPicker` en la parte inferior del campo Descripción, conectado al estado
    y a los callbacks existentes.
14. **Acceso** — botón en `(tabs)/index.tsx` que hace `router.push('/incidents/new')`.
15. **Tipo de ubicación** — `src/types/location.ts`: `Location { id: string; latitude: number;
    longitude: number; accuracy: number | null; createdAt: string }` y `CreateLocationInput` (sin
    `id`/`createdAt`, generados al crear).
16. **Contrato de incidencia** — `src/types/incident.ts`: `locationId?: string | null` en
    `CreateIncidentInput`; `Incident` ya declara `locationId: string | null`, que pasa a ser la FK a
    la `Location` creada.
17. **Capa de dispositivo** — `src/services/device-location.ts`: envuelve `expo-location` y expone
    operaciones tipadas (`requestLocationPermission()`, `areLocationServicesEnabled()`,
    `captureCurrentPosition()` con `getCurrentPositionAsync({ accuracy: Accuracy.Balanced })`) que
    no lanzan por causas previsibles (permiso denegado, GPS apagado, fallo/timeout): devuelven un
    resultado que la UI traduce en flujo y avisos.
18. **Servicio de ubicación (mock)** — `src/services/location.service.ts`: `createLocation()` hace
    `POST /locations` y devuelve la `Location` persistida, reutilizando `fetchWithTimeout()` de
    `src/services/http.ts`.
19. **Mock** — `db.json`: nueva colección `locations` (las incidencias semilla mantienen
    `locationId: null`); relación 1:M con `incidents` vía `locationId`.
20. **Hook de preferencia** — `src/hooks/use-location-preference.ts`: `isLocationEnabled` (por
    defecto `true`) y `toggleLocation()`; estado local, sin permisos ni GPS.
21. **Avisos de envío** — `src/utils/incident-validator.ts`: `getIncidentWarnings({ description,
    isLocationEnabled })` devuelve la lista de motivos (`description-empty`, `description-too-short`,
    `location-disabled`) como función pura y testeable; `getDescriptionQuality` se conserva como
    pieza interna.
22. **Componente de toggle** — `src/components/location-toggle.tsx`: `Pressable` circular grisáceo
    con icono blanco Material `location_on` (`@expo/vector-icons`) y línea diagonal superpuesta
    cuando está desactivado. Props tipadas `{ isEnabled, onToggle }`,
    `accessibilityRole="switch"` / `accessibilityState` y label en español.
23. **Integración de UI y flujo** — `src/app/incidents/new.tsx`: toggle flotante en la esquina
    inferior derecha (activado por defecto, respetando safe area y sin tapar "Enviar"); al pulsar
    Enviar, `getIncidentWarnings` → **un único `Alert`**; con el toggle activado: permiso (si no
    está concedido se intenta siempre; si no puede concederse, `Alert` con "Abrir Ajustes" vía
    `Linking.openSettings()`, "Enviar sin ubicación" y "Cancelar") → captura → `createLocation` →
    `submitIncident({ ..., locationId })`; GPS apagado o captura fallida → envío con
    `locationId: null` y aviso no bloqueante.
24. **Configuración** — `app.json`: plugin `expo-location` con `locationWhenInUsePermission`
    (solo primer plano; sin flags de background). Dependencias `expo-location` y
    `@expo/vector-icons` instaladas con `npx expo install` para fijar versiones compatibles con el
    SDK.
25. **Documentación** — `spec/constitution/roadmap.md`, nota de sesión en `docs/` y `AGENTS.md`.
26. **Tipo de imagen** — `src/types/incident-image.ts`: `IncidentImage { id: string; url: string;
    incidentId: string }` y `CreateIncidentImageInput { url: string; incidentId: string }` (sin
    `id`, generado por el mock; patrón de `Location`/`CreateLocationInput`). `url` e `incidentId`
    **no anulables**. `Incident` y `CreateIncidentInput` **no se tocan**.
27. **Mock** — `db.json`: nueva colección `images` que arranca **vacía** (`[]`), **sin seeds**
    sobre las incidencias existentes.
28. **Dependencia y configuración** — instalar `expo-image-picker` con `npx expo install`
    (versión compatible con SDK 57; **consultar la documentación versionada antes de codificar**)
    y declarar su plugin en `app.json` con `photosPermission` y `cameraPermission`. `expo-image`
    ya está instalado para las miniaturas.
29. **Servicio de imágenes (mock)** — `src/services/image.service.ts`: `createImage()` hace
    `POST /images` con `fetchWithTimeout()` y devuelve la `IncidentImage` persistida.
30. **Almacenamiento simulado** — `src/services/storage.service.ts`: `storePhoto(uri)` devuelve
    la URI procesada tras un **retardo simulado** (`setTimeout`), encapsulando el futuro reemplazo
    por almacenamiento real y permitiendo probar overlays de carga y errores sin red.
31. **Capa de dispositivo** — `src/services/photo-picker.ts`: envuelve `expo-image-picker` y
    expone `pickPhotoFromCamera()` / `pickPhotoFromLibrary()` con resultados tipados: **cancelar
    → `null` sin error**; **permiso denegado → error amigable** (traducible a mensaje de UI);
    devuelve la URI local (`file://...`).
32. **Hook de adjuntos** — `src/hooks/use-photo-attachment.ts`: `photoUris: string[]`,
    `isProcessing`, `errorMessage`, `attachFromCamera()`, `attachFromLibrary()`,
    `removeImage(uri)`.
33. **Componente de fotos** — `src/components/photo-picker.tsx`: fila horizontal de tiles
    cuadrados (tamaño `PHOTO_TILE_SIZE` en `src/constants/theme.ts`, ~120 dp) renderizada con
    `FlatList` **horizontal** (nunca `.map()` dentro de `ScrollView`); cada tile muestra la
    miniatura con `expo-image`, el botón "×" y un overlay de carga; el **recuadro discontinuo**
    (borde `dashed`, icono compuesto Material `image` + insignia `arrow-upward`, textos "Añadir
    imagen"/"Recomendado") permanece **al final**; al pulsarlo abre la hoja inferior
    (`Modal` nativo) con "Cámara"/"Galería".
34. **Integración de UI y flujo** — `src/app/incidents/new.tsx`: sección de foto bajo
    Descripción y sobre el botón Enviar; **footer fijo** (safe-area aware) con el botón Enviar y
    **FAB de ubicación fijo encima** del footer (`zIndex`/`elevation`); el `ScrollView` reserva
    padding inferior. En el envío: `createIncident()` → por cada URI, `storePhoto(uri)` +
    `createImage({ url, incidentId: incident.id })`; si alguna imagen falla, la incidencia queda
    registrada y la pantalla de confirmación muestra un **aviso no bloqueante** (mismo patrón
    degradado que la ubicación). Sin fotos, el flujo es idéntico al actual y sin avisos.
35. **Tests colocados** — `image.service.test.ts`, `storage.service.test.ts` (fake timers),
    `photo-picker.test.ts` (mock de `expo-image-picker`), `use-photo-attachment.test.ts`,
    `photo-picker.test.tsx` (componente) y actualización de los tests de `new.tsx`.
36. **Calidad** — `npx expo lint` + `npx tsc --noEmit` sin errores y `npx jest --ci` en verde.
37. **Documentación** — `spec/constitution/roadmap.md` y nota de sesión en `docs/`.

## Decisiones

- **camelCase en el contrato** (`createdAt`, `civicId`…) — idiomático en TypeScript y en DTOs
  NestJS; si el backend expone snake_case, el mapeo se hará en `src/services/`.
- **`category` (texto) + `categoryId` (FK) coexisten** — "Otros" no debe crear categorías en el
  mock (no hay endpoint de escritura aprobado), así que el texto libre se guarda en `category`
  y `categoryId` queda `null`; una categoría listada hace lo contrario. Son mutuamente
  excluyentes para evitar estados ambiguos. Alternativa descartada: reutilizar solo `categoryId`
  con un id sintético para "Otros".
- **`fetchWithTimeout` centralizado** — el patrón `AbortController` + `clearTimeout` estaba
  duplicado en cada servicio; se extrae a `src/services/http.ts` para no repetirlo y exponer un
  `RequestTimeoutError` tipado que cada servicio transforma en un mensaje de usuario.
- **Categorías cargadas en un hook aparte (`useCategories`)** — el formulario no debe mezclar la
  carga del catálogo con el envío; separar responsabilidades facilita el manejo de estados
  (`isLoadingCategories`, `categoriesError`) y su test.
- **"Otros" vacío es error de validación, no warning** — a diferencia de la descripción (que solo
  pide confirmación), elegir "Otros" sin texto deja un campo a medio rellenar y ambiguo; se
  bloquea el envío hasta escribir o quitar la selección.
- **Categoría como control en Descripción, sin chips** — el selector de chips ocupaba una fila
  propia y competía visualmente con los campos; se sustituye por un control discreto en la
  esquina inferior del campo Descripción que abre una hoja inferior. Se descarta mantener los
  chips o crear un campo dedicado.
- **Hoja inferior con `Modal` nativo** — `animationType="slide"` + `transparent` reproduce el
  patrón de bottom sheet sin instalar `@gorhom/bottom-sheet` ni similares (AGENTS.md prohíbe
  dependencias nuevas sin aprobación). El modal de "Otros" reutiliza el mismo mecanismo.
- **Extracción a `CategoryPicker`** — concentra la interacción (trigger, hoja, modal de "Otros",
  nombre + "×") en un componente presentacional con props tipadas y deja la pantalla con el
  estado y los callbacks; evita que `new.tsx` siga creciendo y facilita su test aislado.
- **`StyleSheet` + tokens de tema en lugar de `className`** — NativeWind estaba instalado pero sin
  configurar (faltaban `babel.config.js`, `metro.config.js`, `tailwind.config.js` y las directivas
  `@tailwind`), por lo que `className` era un no-op. Se siguió la convención real del repo. _(Resuelto
  como tarea de infraestructura: NativeWind ya está configurado y operativo; la migración de estos
  componentes a `className` queda en el backlog.)_
- **`Stack` raíz + grupo `(tabs)`** — patrón canónico de Expo Router para poder empujar
  pantallas sobre la tab bar. Alternativa descartada: registrar el formulario como tab.
- **Validación manual, sin Zod** — AGENTS.md prohíbe dependencias nuevas sin aprobación; una
  utilidad propia cubre el caso y es testeable de forma pura.
- **`technicianId`** — se corrige el typo `techinician_id` indicado en el alcance.
- **`Location` como entidad separada con relación 1:M** — el contrato de `Incident` ya reservaba
  `locationId`; separar la ubicación (`latitude`, `longitude`, `accuracy`, `createdAt`) permite
  reutilizarla en features futuras (mapa, agrupación por zonas) y mantiene la incidencia ligera;
  `locationId: null` sigue siendo un estado válido. Alternativa descartada: incrustar
  `latitude`/`longitude` en `Incident`, que rompe el contrato y duplica datos.
- **`Accuracy.Balanced`** — equilibrio entre precisión, batería y tiempo de respuesta para un
  reporte urbano: `High` tarda más y consume más batería (especialmente en interiores) y `Low`
  puede devolver una posición poco útil. La precisión real de la lectura (`coords.accuracy`, que
  puede ser `null` en web) se guarda tal cual en `Location.accuracy` para que el resto del sistema
  decida.
- **Captura al pulsar Enviar, no al montar el formulario** — pedir permiso y encender el GPS antes
  de rellenar el formulario añade fricción y consumo innecesarios; capturar al enviar mantiene el
  principio de mínima interacción y evita pedir permisos si el ciudadano desactiva el toggle.
  Alternativa descartada: capturar al abrir el formulario y pre-rellenar coordenadas.
- **Toggle activado por defecto** — la ubicación es un dato esperado en un reporte urbano; el
  estado desactivado se representa de forma inequívoca con la línea diagonal y un toque lo cambia.
  El icono Material `location_on` llega vía `@expo/vector-icons`, incluido en el ecosistema Expo
  (sin módulo nativo nuevo).
- **Aviso combinado en un único `Alert`** — `getIncidentWarnings({ description, isLocationEnabled })`
  centraliza los motivos (`description-empty`, `description-too-short`, `location-disabled`) y la
  pantalla lanza un solo diálogo; evita alertas encadenadas y cancelaciones ambiguas. Los avisos
  nunca bloquean: solo piden confirmación. Alternativa descartada: un `Alert` por motivo o bloquear
  el envío sin ubicación.
- **El permiso se intenta solicitar siempre** — no se cachea un estado "denegado": si no está
  concedido, cada envío con el toggle activado vuelve a pedirlo; si el sistema ya no permite
  preguntar (`canAskAgain === false`), se ofrece "Abrir Ajustes".
- **`Linking.openSettings()` en el `Alert` de permiso** — API nativa de React Native que abre los
  ajustes de la propia app en iOS y Android (a diferencia de `Linking.openURL('app-settings:')`,
  exclusivo de iOS), necesaria cuando el permiso fue denegado permanentemente. Las opciones "Enviar
  sin ubicación" y "Cancelar" garantizan que el registro nunca quede bloqueado.
- **Los errores de ubicación no bloquean el registro** — GPS apagado, permiso no concedido o
  captura fallida convierten el envío en `locationId: null` con un aviso no bloqueante; una
  incidencia sin coordenadas sigue siendo útil.
- **`device-location.ts` separado de `location.service.ts`** — el primero habla con el
  hardware/permisos del dispositivo y se puede mockear en tests (`jest.mock('expo-location')`); el
  segundo, con el mock REST de `json-server`, respetando que `src/services/` es la capa de
  comunicación.
- **`IncidentImage` como entidad separada 1:M** — una incidencia puede tener **varias** fotos;
  separarla evita tocar `Incident`/`CreateIncidentInput` y sigue el patrón de `Location`.
  `url` e `incidentId` son **no anulables**: no tiene sentido una imagen sin URI ni sin
  incidencia. Alternativa descartada: añadir `photoURL` a `Incident` (limita a una foto y rompe
  el contrato vigente).
- **Colección `images` vacía y sin seeds** — las incidencias semilla de `db.json` no tienen
  fotos reales; no se inventan imágenes para no falsear el estado del mock.
- **URI local temporal (`file://...`) como `url`** — sin nube ni endpoint de subida (fuera de
  alcance aprobado), la URI que devuelve `expo-image-picker` se persiste directamente; coherente
  con la estrategia de "medios locales" de `AGENTS.md`.
- **`storage.service.ts` con retardo simulado** — aísla el manejo de imagen para que el día que
  exista backend solo cambie esa pieza; el `setTimeout` permite probar estados de carga/error
  sin tocar servicios externos.
- **Capa de dispositivo (`photo-picker.ts`) separada del servicio mock (`image.service.ts`)** —
  mismo criterio que `device-location.ts` vs `location.service.ts`: lo que habla con el
  hardware/permisos se mockea con `jest.mock('expo-image-picker')`; lo que habla con
  `json-server` se testea contra `fetch`.
- **Cancelar devuelve `null` sin error** — cancelar el selector es una acción voluntaria del
  ciudadano, no un fallo; solo el permiso denegado se traduce en error amigable.
- **`FlatList` horizontal para las miniaturas** — `AGENTS.md` prohíbe `.map()` en `ScrollView`
  para colecciones dinámicas; la `FlatList` horizontal además no dispara el aviso de anidamiento
  de `VirtualizedList` (solo aplica a anidados en la misma orientación).
- **Hoja inferior con `Modal` nativo** — mismo patrón visual que `CategoryPicker`
  (`animationType="slide"`, `transparent` con overlay): coherencia visual sin dependencias
  nuevas (prohibidas sin aprobación).
- **`PHOTO_TILE_SIZE` como token de tema** — el tamaño ~120 dp se define una sola vez en
  `src/constants/theme.ts` y lo reutilizan el recuadro de añadir y los tiles de miniatura.
- **Footer fijo + FAB en capa superior (`zIndex`/`elevation`)** — el `ScrollView` podía tapar o
  arrastrar el botón Enviar y el toggle de ubicación; fijarlos garantiza que siempre estén
  accesibles. El contenido reserva padding inferior equivalente al alto del footer + FAB.
- **Envío: primero la incidencia, luego las imágenes** — `createIncident()` devuelve el `id`
  necesario como `incidentId`; si una imagen falla, la incidencia **no se deshace**: aviso
  degradado en la confirmación, igual que con la ubicación. Alternativa descartada: bloquear el
  envío si una imagen falla (rompe la regla de "los avisos nunca bloquean").
- **Sin aviso cuando no hay fotos** — adjuntar es opcional y no se presiona al ciudadano; no hay
  alerta previa al envío por foto ausente (a diferencia de descripción corta o ubicación
  desactivada).
- **`expo-image` para miniaturas** — ya está instalado y maneja el cacheado de la URI local;
  evita añadir una dependencia nueva para pintar la imagen.

## Riesgos

- **`localhost` en dispositivo físico no resuelve al host** — documentar el uso de
  `EXPO_PUBLIC_API_URL` con la IP de la máquina o `10.0.2.2` en emulador Android.
- **Baseline de `tsc` con 2 errores de imports `.css`** — se añade una declaración de tipos para
  módulos CSS para dejar el typecheck limpio.
- **NativeWind a medio instalar** — no se usa; evitar introducir `className` para no crear
  expectativa falsa de estilos.
- **Fallback de categorías** — si `GET /categories` falla o tarda, el formulario no debe
  bloquearse: se registra sin categoría y se muestra un aviso reintentable.
- **Duplicación de lógica HTTP** — mitigada extrayendo `fetchWithTimeout` y `RequestTimeoutError`
  a `src/services/http.ts`, de modo que solo se mantenga en un sitio.
- **Teclado vs. modal de "Otros"** — en iOS/Android el `TextInput` dentro del `Modal` puede quedar
  tapado por el teclado; se mitiga con `KeyboardAvoidingView` y `Platform` dentro del propio modal,
  y cerrando el modal al guardar.
- **Accesibilidad del bottom sheet** — el `Modal` nativo no aporta semántica por defecto; se añaden
  `accessibilityRole`/`accessibilityLabel` a los elementos pulsables y un fondo que cierra la hoja.
- **`expo-location` en Expo Go** — la captura en primer plano funciona (el módulo está incluido en
  Expo Go: Android, iOS y web); background location y geofencing exigen development build, por eso
  quedan fuera de alcance. En web se requiere contexto seguro (HTTPS o localhost) y el permiso
  puede denegarse.
- **GPS lento o impreciso** — `getCurrentPositionAsync` puede tardar varios segundos en interiores;
  se usa `Accuracy.Balanced`, se reutiliza el estado de carga existente durante la captura y, si
  falla o expira, se envía sin ubicación con aviso no bloqueante.
- **Permisos denegados permanentemente** — `canAskAgain === false` no debe dejar al ciudadano sin
  registrar; el `Alert` ofrece "Abrir Ajustes" o "Enviar sin ubicación".
- **`accuracy` nulo en web** — `LocationObjectCoords.accuracy` puede ser `null` en web; el contrato
  `Location.accuracy: number | null` ya lo contempla.
- **Tests de módulos nativos** — `expo-location` no está disponible en Jest; toda la interacción
  nativa se concentra en `device-location.ts` para mockearla con `jest.mock('expo-location')` y
  testear el resto con dobles.
- **Toggle flotante sobre el contenido** — la posición absoluta puede tapar el botón Enviar o
  quedar bajo la tab bar/teclado; se respeta la safe area (`BottomTabInset`) y se comprueba en
  iOS/Android.
- **`Location` huérfana si falla el POST de la incidencia** — si se crea la `Location` y después
  falla `POST /incidents`, queda un registro sin incidencia asociada; aceptable en el mock y
  documentado (se resolverá con transacción/cleanup cuando exista backend real).
- **API de `expo-image-picker` en SDK 57** — cambia entre versiones; **obligatorio** consultar
  las docs versionadas (Context7 o docs.expo.dev) antes de codificar (nombres exactos de
  `launchCameraAsync`/`launchImageLibraryAsync`, opciones de `mediaTypes` y permisos).
- **`expo-image-picker` en Expo Go** — el módulo está incluido en Expo Go; si algo no funciona,
  se diagnostica con `npx expo-doctor` antes de asumir un development build.
- **Permisos de galería** — Android 13+ usa el photo picker del sistema sin permiso; no se pide
  permiso de galería heredado (fuera de alcance). El permiso de cámara denegado debe producir un
  error amigable, nunca un crash.
- **URI local fuera de la sesión** — `file://...` solo es válida en el dispositivo y mientras
  exista la foto; aceptable en el mock y documentado (se resolverá con almacenamiento real).
- **`FlatList` dentro de `ScrollView`** — una `FlatList` horizontal dentro del `ScrollView`
  vertical es segura (la advertencia de `VirtualizedList` solo aplica a anidados en la misma
  orientación); aun así se fija un alto (`PHOTO_TILE_SIZE`) para evitar mediciones extrañas.
- **Footer fijo vs teclado** — el comportamiento del teclado puede empujar el footer; se valida
  en iOS/Android y se mantiene el padding inferior del `ScrollView`.
- **`zIndex` en Android** — puede requerir `elevation` para quedar por encima; se aplican ambos
  en footer y FAB.
- **Creación parcial de imágenes** — si una foto de varias falla, quedan las demás creadas y un
  aviso; aceptable en el mock (sin transacciones), documentado como el caso de `Location`
  huérfana de 001.
- **Tests con `setTimeout` en `storage.service`** — los tests usarán fake timers para no esperar
  el retardo real.
