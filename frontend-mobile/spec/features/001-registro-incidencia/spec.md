# 001 · Registro de incidencia

**Estado:** implementado ✅

## Qué hace

Permite al ciudadano, desde la pantalla de inicio de la app, abrir un formulario y registrar
una incidencia urbana indicando un **título** obligatorio, una **descripción** opcional y una
**categoría** opcional. La categoría no es un campo independiente: es un control situado en la
**esquina inferior del campo Descripción** que, cuando no hay selección, muestra
**"Añadir categoría +"**. Al pulsarlo se despliega una **hoja inferior** (bottom sheet) con las
categorías del mock (`Transporte`, `Alumbrado público`, `Objetos urbanos`) más la opción
**"Otros"**: elegir una categoría existente la selecciona (`categoryId`), mientras que elegir
**"Otros"** abre un **modal** con un `TextInput` para escribirla como texto libre (`category`,
con el botón Guardar deshabilitado mientras el texto está vacío). Una vez seleccionada, el
control muestra el **nombre** de la categoría acompañado de una **"×"** para deseleccionar. Al
enviar, la app crea la incidencia con estado inicial `reported`, fecha de creación automática y
el resto de campos sin asignar (`null`), y confirma visualmente que el registro se ha
completado.

Además, el formulario incorpora un **toggle de ubicación** flotante en la **esquina inferior
derecha** de la pantalla: un **círculo grisáceo con un icono blanco Material `location_on`** que
muestra una **línea diagonal** superpuesta cuando está **desactivado** (estado **activado** por
defecto). Si al pulsar Enviar el toggle está activado, la app captura la posición actual con
precisión equilibrada (`Accuracy.Balanced`), crea una **`Location`** (`latitude`, `longitude`,
`accuracy`, `createdAt`) y guarda la incidencia con su `locationId`; si está desactivado, la
incidencia se guarda con `locationId: null`. Antes de capturar, si el permiso no está concedido la
app **siempre intenta solicitarlo**; si no puede concederse, muestra un `Alert` con **"Abrir
Ajustes"** (`Linking.openSettings()`), **"Enviar sin ubicación"** y **"Cancelar"**. Si el GPS del
dispositivo está apagado o la captura falla, el reporte se envía igualmente sin ubicación con un
**aviso no bloqueante**. Antes de enviar, un **único `Alert`** agrupa los avisos de descripción
(vacía o demasiado corta) y de ubicación desactivada.

Además, el formulario incorpora una **sección de foto** situada **debajo del campo Descripción**
y **encima del botón Enviar**. **Sin fotos (0 imágenes)**, la sección **no muestra cabecera ni
botón a lo ancho**: muestra un **"+" grande centrado** (`MaterialIcons add`, tamaño 48) con, debajo,
el texto **"¿Desea añadir imágenes?"**, todo dentro de un único `Pressable` que abre la **hoja
inferior** Cámara/Galería (también al pulsar cerca del "+"), y un `ActivityIndicator` mientras
procesa; el título **"Imágenes subidas (n):"** —un **contador dinámico** de fotos adjuntas— **solo
se muestra con `n ≥ 1`**. **Con una o más fotos**, la sección muestra la cabecera con el título
**"Imágenes subidas (n):"** y una **fila horizontal de cuadrados** (~120 dp, token
`PHOTO_TILE_SIZE`) con una **miniatura** por foto (vía `expo-image`), un botón **"×"** para
quitarla y un **overlay de carga** mientras se procesa, y la fila termina en un **tile de añadir**
que es un único **"+"** (Material `add`, color secundario) **sin borde, sin fondo y sin textos**,
con `accessibilityLabel="Añadir imagen"` y un `ActivityIndicator` mientras procesa. El número de
adjuntos está limitado por **`MAX_SELECTED_PHOTOS = 8`** (exportado en el hook de adjuntos, con un
**guard** que ignora nuevos adjuntos al llegar a 8): **con 8 fotos**, el **tile "+" desaparece** y,
debajo de los previews, se muestra **en rojo** el mensaje **"El número máximo de imágenes son 8"**;
al quitar una foto, **vuelve el "+"** y desaparece el mensaje. Tanto el **"+"** del estado vacío
como el tile de añadir abren una **hoja inferior** (bottom sheet con `Modal` nativo, mismo patrón
visual que `CategoryPicker`) con dos opciones: **"Cámara"** y **"Galería"**. Al elegir una
fuente, `expo-image-picker` devuelve la **URI local temporal** (`file://...`) de la foto, que se
adjunta de inmediato al formulario; **cancelar** el selector no produce ningún error ni adjunta
nada. Al enviar, primero se registra la incidencia (igual que
hasta ahora) y después se persiste **una `IncidentImage` por cada foto adjunta** en la colección
`images` del mock —`url` e `incidentId` **no anulables**, relación 1:M con la incidencia y
colección **vacía, sin seeds**—; si alguna imagen no llega a guardarse, la incidencia **queda
registrada igualmente** y la pantalla de confirmación muestra un **aviso no bloqueante** (mismo
patrón degradado que la ubicación). Para que el botón Enviar y el toggle de ubicación no queden
tapados ni se desplacen, ambos pasan a una **capa superior**: el botón **Enviar** vive en un
**footer fijo** en la parte inferior de la pantalla (safe-area aware) y el **toggle de ubicación**
flota **fijo encima del footer**; el contenido con scroll reserva padding inferior suficiente
para no quedar tapado.

## Por qué

Registrar incidencias es el propósito central de UrbanPulse: es el primer paso de todo el ciclo
de vida de un reporte y la base sobre la que se construirán las siguientes features
(seguimiento de estado, evidencia multimedia). Sin esta feature no hay datos
que gestionar ni que consultar.

Clasificar la incidencia por categoría aporta valor desde el primer reporte: permite agrupar
los avisos por tipo (transporte, alumbrado, mobiliario urbano) y facilita el trabajo posterior
de triage y despacho, sin añadir fricción porque la categoría es opcional y se resuelve con un
control discreto integrado en el propio campo de descripción.

La **ubicación** completa el reporte: saber *qué* ocurre sin saber *dónde* obliga al ayuntamiento a
un ida y vuelta con el ciudadano. Capturarla automáticamente al enviar —con la posibilidad de
desactivarla y de degradar a `locationId: null` si no hay permiso o GPS— mantiene el registro en
menos de un minuto sin añadir fricción.

La **foto** completa el reporte con la evidencia más directa de una incidencia urbana: ahorra al
ayuntamiento una visita de comprobación y mejora la calidad del dato sin alargar el registro,
porque adjuntar es opcional y se resuelve desde cámara o galería sin fricción. Hacerlo sobre el
mock (misma estrategia que en 001) mantiene el principio de no depender del backend real ni de
almacenamiento en la nube.

## Criterios de aceptación

- [x] Desde la pantalla de inicio existe un acceso visible al formulario de registro.
- [x] El formulario contiene campos editables de **título** y **descripción**.
- [x] No se puede enviar el formulario con título vacío o fuera de longitud, y se muestra el
      motivo del error junto al campo.
- [x] Con datos válidos, se crea la incidencia con `status: "reported"`, `createdAt` en ISO 8601
      y `priority: null`.
- [x] Los campos `civicId`, `locationId`, `urbanAssetId`, `departmentId`, `teamId` y
      `technicianId` se persisten con valor `null` en el registro base sin ubicación; con la
      ampliación, `locationId` apunta a la `Location` creada cuando el toggle está activado.
- [x] Mientras se envía, la UI muestra un estado de carga y evita el doble envío.
- [x] Si el servidor mock falla al registrar, se muestra un mensaje de error comprensible.
- [x] Tras un envío correcto, el usuario recibe una confirmación visible.
- [x] Al abrir el formulario, las categorías disponibles se cargan desde el mock (`GET /categories`).
- [ ] El control de categoría (opcional) se ubica en la **esquina inferior del campo Descripción**
      y, sin selección, muestra **"Añadir categoría +"**.
- [ ] Al pulsar "Añadir categoría +" se abre una **hoja inferior** (bottom sheet con `Modal`
      nativo) que lista las categorías del mock más la opción **"Otros"**.
- [x] Al seleccionar una categoría existente, la incidencia se persiste con su `categoryId` y
      `category: null`.
- [ ] Al elegir "Otros" se abre un **modal** con un `TextInput` para escribir la categoría; el
      botón Guardar permanece deshabilitado mientras el texto está vacío.
- [x] Al elegir "Otros" y escribir un texto, la incidencia se persiste con `category` (texto
      libre) y `categoryId: null`.
- [ ] Con una categoría seleccionada, el control muestra el **nombre** de la categoría y una
      **"×"**; al pulsar "×" se deja `categoryId` y `category` en `null`.
- [x] Sin categoría seleccionada, la incidencia se persiste con `categoryId: null` y
      `category: null`; la categoría **nunca** bloquea el registro.
- [x] Si la carga de categorías falla, el control muestra el error y el formulario sigue siendo
      utilizable (se puede registrar sin categoría).
- [x] El formulario muestra un **toggle de ubicación flotante** en la **esquina inferior derecha**:
      un círculo grisáceo con un icono blanco Material `location_on` y una **línea diagonal**
      superpuesta cuando está desactivado.
- [x] El toggle está **activado por defecto** al abrir el formulario y se puede activar/desactivar
      con un toque.
- [x] Con el toggle activado, al enviar se captura la posición con `Accuracy.Balanced` y se crea
      una `Location`; la incidencia se persiste con el `locationId` de esa Location.
- [x] Toda `Location` creada se persiste en la colección `locations` del mock con `id`, `latitude`,
      `longitude`, `accuracy` y `createdAt`; la relación 1:M `Incident` → `Location` se resuelve vía
      `locationId`.
- [x] Con el toggle desactivado, la incidencia se persiste con `locationId: null` y **no** se crea
      ninguna `Location`.
- [x] Si el permiso de ubicación no está concedido al enviar con el toggle activado, **siempre** se
      intenta solicitar; si se concede, se captura la posición.
- [x] Si el permiso no puede concederse, se muestra un `Alert` con **"Abrir Ajustes"**
      (`Linking.openSettings()`), **"Enviar sin ubicación"** y **"Cancelar"**: "Cancelar" no envía
      nada y "Enviar sin ubicación" persiste la incidencia con `locationId: null`.
- [x] Si el GPS del dispositivo está apagado o la captura de posición falla, la incidencia se
      envía con `locationId: null` y se muestra un **aviso no bloqueante**.
- [x] Antes de enviar, `getIncidentWarnings({ description, isLocationEnabled })` puede devolver
      `description-empty`, `description-too-short` y `location-disabled`, y se muestra **un único
      `Alert`** que combina todos los avisos presentes (con opción de cancelar o enviar igualmente).
- [x] El formulario muestra, **debajo del campo Descripción** y **encima del botón Enviar**, la
      sección de fotos. El título **"Imágenes subidas (n):"** —donde `n` es el **contador
      dinámico** de fotos adjuntas— se muestra **solo cuando `n ≥ 1`**; con 0 imágenes **no hay
      cabecera**.
- [x] **Sin fotos (0 imágenes)**, la sección **no muestra cabecera ni botón a lo ancho**: muestra
      un **"+" grande centrado** (`MaterialIcons add`, tamaño 48) con el texto **"¿Desea añadir
      imágenes?"** debajo, todo dentro de un `Pressable` que abre la hoja Cámara/Galería (también
      al pulsar cerca), y un `ActivityIndicator` mientras procesa.
- [x] **Con una o más fotos**, la fila de miniaturas termina en un **tile de añadir** que es un
      único **"+"** (Material `add`, color secundario) **sin borde, sin fondo y sin textos**, con
      `accessibilityLabel="Añadir imagen"` y `ActivityIndicator` mientras procesa.
- [x] Al pulsar el **"+"** del estado vacío o el **tile "+"** (con fotos) se abre una **hoja
      inferior** con las opciones **"Cámara"** y **"Galería"** (mismo patrón visual que
      `CategoryPicker`).
- [x] Elegir "Cámara" o "Galería" adjunta la foto al formulario; **cancelar** el selector no
      produce ningún error ni adjunta nada.
- [x] Cada foto adjunta aparece como un **cuadrado con miniatura** (`expo-image`) y un botón
      **"×"**; al pulsar "×" la foto se elimina de la selección.
- [x] El número de adjuntos está limitado por **`MAX_SELECTED_PHOTOS = 8`** (exportado por
      `use-photo-attachment.ts`): al llegar a 8, el hook **ignora** nuevos adjuntos (guard).
- [x] **Con 8 fotos**, el **tile "+" desaparece** y, debajo de los previews, se muestra **en rojo**
      el mensaje **"El número máximo de imágenes son 8"**; al quitar una foto, **vuelve el "+"** y
      desaparece el mensaje.
- [x] El botón **Enviar** y el **toggle de ubicación** permanecen **fijos y visibles por encima
      del contenido** al hacer scroll (footer fijo + FAB en capa superior, safe-area aware).
- [x] Al enviar con fotos, se crea la incidencia y **una `IncidentImage` por cada foto** con
      `url` (URI local, no nula) e `incidentId` (id de la incidencia) **no nulos**, persistida en
      la colección `images` del mock.
- [x] Si persiste un error al guardar alguna imagen, la incidencia **se registra igualmente** y
      se muestra un **aviso no bloqueante** en la pantalla de confirmación.
- [x] Sin fotos, el envío no muestra avisos adicionales y **no** se crea ninguna imagen.
- [x] `npx tsc --noEmit`, `npx expo lint` y `npx jest --ci` pasan sin errores nuevos.

## Fuera de alcance

- **Subida real a la nube o al backend** (S3, MinIO, endpoint de upload): la `url` guardada es
  la **URI local temporal** (`file://...`) que devuelve `expo-image-picker`.
- **Edición o recorte** de la foto tras seleccionarla.
- **Vídeo**: solo fotos estáticas.
- **Permisos de galería heredados** (Android < 13 / iOS): no se solicitan ni se gestionan.
- **Gestión de imágenes de incidencias ya registradas** (ver, añadir o borrar fotos en reportes
  pasados) → feature futura (backlog).
- **Avisos por no adjuntar foto**: la foto es siempre opcional y no se presiona al ciudadano.
- **Ubicación en segundo plano** — captura con la app cerrada o en background
  (`startLocationUpdatesAsync`, geofencing, `TaskManager`); la ubicación solo se captura en primer
  plano al pulsar Enviar.
- **Mapa, edición y reverse geocoding** — no hay selector de punto en un mapa, ni edición manual de
  coordenadas, ni traducción de coordenadas a dirección postal.
- **Permiso "Always"/background** — solo se solicita permiso mientras se usa la app (*When In
  Use*); nunca se pide permiso de ubicación en segundo plano.
- Gestión de categorías (crear, editar o borrar) desde la app: las categorías son de solo lectura
  y provienen del mock; el texto libre de "Otros" no crea una nueva categoría.
- Librerías de "bottom sheet" de terceros: la hoja inferior se implementa con el `Modal` nativo de
  React Native, sin añadir dependencias.
- Prioridad, activos urbanos, departamentos, equipos y técnicos: se crean como campos `null`, sin
  UI de asignación.
- Autenticación / inicio de sesión del ciudadano.
- Listado y seguimiento del estado de las incidencias (backlog del roadmap).

## Detalles menores pendientes

Ajustes visuales del control de categoría con selección (`nombre ×`) que **no bloquean** la
feature y quedan documentados para corregirlos más adelante:

- El nombre de la categoría y el símbolo "×" se muestran **demasiado juntos**; conviene separarlos
  un poco más.
- El **padding horizontal está desequilibrado**: el lado derecho (junto a la "×") tiene **menos**
  padding que el izquierdo; hay que igualarlo.

## Ampliación: conexión al backend

El registro de incidencia deja de ser solo mock y **se conecta al backend real**.

- `POST /incidents` en **multipart/form-data**, con **imágenes dentro del mismo POST**.
- Estrategia **real-first + fallback al mock**: si no hay conexión con el backend, se registra en
  `json-server` y la pantalla muestra "No se ha podido conectar al backend, realizando en el mock".
- **Contrato alineado front↔backend:** `title` 4–25 caracteres; `description` opcional;
  `civicId` = UUID (temporal `20ac442e-0f00-4fe4-bad3-61c8e8e0bff5`, ciudadano sofia13, issue #61);
  `categoryId`? + `category`? (texto libre); `latitude`/`longitude`/`accuracy` opcionales/nullable;
  imágenes máx. 5 en backend (el móvil recorta a 5, ver issue #91).

Criterios de aceptación:

- [x] Con backend disponible, la incidencia se envía por `POST /incidents` multipart y se informa el origen (`IncidentSource`).
- [x] Sin conexión, se registra en el mock y se muestra el aviso de fallback.
- [x] El título se valida entre 4 y 25 caracteres; descripción, categoría y ubicación son opcionales.
- [ ] Límite de imágenes unificado front/backend (issue #91; hoy el móvil recorta a 5).
- [ ] `civicId` real desde la sesión/token de ciudadanía (issue #61; hoy UUID temporal).

Refactors relacionados (`spec/refactor/001-registro-incidencia/`):
[`payload-incidencia-inline`](../../refactor/001-registro-incidencia/payload-incidencia-inline.md),
[`alineacion-contrato-incidencia`](../../refactor/001-registro-incidencia/alineacion-contrato-incidencia.md),
[`conexion-incidencia-backend-multipart`](../../refactor/001-registro-incidencia/conexion-incidencia-backend-multipart.md).
