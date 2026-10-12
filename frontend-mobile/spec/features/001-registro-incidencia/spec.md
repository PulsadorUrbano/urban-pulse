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
- [x] `npx tsc --noEmit` y `npx expo lint` pasan sin errores nuevos.

## Fuera de alcance

- Captura de foto (cámara/galería) → feature futura.
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
