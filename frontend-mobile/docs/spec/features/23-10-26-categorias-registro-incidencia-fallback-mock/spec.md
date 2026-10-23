# 2026-10-23 — Especificación: Categorías del registro de incidencia con lectura real-first y fallback visible al mock

- Desarrollador responsable: Sofía Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: feature/registro-incidencia-frontend-mobile.
- Última actualización: 2026-10-23.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: `backend/docs/spec/endpoint/get-categories/README.md` (contrato ya documentado del endpoint, solo lectura, última revisión 2026-10-21); `src/services/incident.service.ts` (patrón real-first/fallback ya validado para `POST /incidents`).

## Objetivo y decisiones vigentes

El formulario de registro de incidencia (`src/app/incidents/new.tsx`) carga el catálogo de categorías para el selector (`src/components/category-picker.tsx`), pero hoy `src/services/category.service.ts` solo consulta el servidor mock (`API_BASE_URL/categories`, json-server). El backend real ya expone `GET /categories` (contrato documentado y verificado en `backend/docs/spec/endpoint/get-categories/README.md`), pero el front todavía no lo consume. Esta especificación formaliza que la ciudadanía que abre el selector de categorías vea primero el catálogo real del backend y, solo si ese catálogo no está disponible por cualquier motivo, vea el catálogo simulado del mock junto con un aviso explícito de que se está usando el fallback.

**Esta es una ampliación de la feature core "registro de incidencia"** (su sub-flujo de carga de categorías), no un bug fix (el comportamiento actual no está roto, solo incompleto: nunca consulta el backend) ni un refactor (cambia comportamiento observable para la persona usuaria: ahora intenta el backend real primero y puede mostrar un aviso nuevo en pantalla).

- Alcance confirmado:
  - `fetchCategories()` intenta primero `GET {BACKEND_API_URL}/categories` y cae a `GET {API_BASE_URL}/categories` (mock) ante cualquier fallo del backend.
  - La UI del selector de categorías muestra un aviso visible cuando el catálogo mostrado proviene del fallback al mock, con el motivo real que dio el backend cuando se conoce.
  - El catálogo del mock (`db.json`, endpoint `/categories` de json-server) se conserva sin cambios como fallback; no se retira ninguna simulación existente.
- Decisiones confirmadas:
  - **Cualquier fallo del backend activa el fallback al mock**, no solo los fallos de conexión/timeout. Esto difiere deliberadamente del patrón ya usado en `createIncident` (`src/services/incident.service.ts`), donde un `!response.ok` del backend se trata como **rechazo de negocio** de una escritura (`POST /incidents`) y por tanto **no** cae al mock, solo se informa el rechazo. `GET /categories` es una lectura sin semántica de rechazo de negocio: no existe un "categoría rechazada", solo "no se pudo leer el catálogo real ahora mismo", así que cualquier fallo (conexión, timeout o `!response.ok`) es equivalente a efectos de fallback y activa la simulación del mock para no bloquear el formulario.
  - `Category` (`src/types/category.ts`) **no se amplía** con el campo `createdAt` que el backend sí devuelve en cada elemento: el front no lo consume en ningún punto de la UI actual, así que añadirlo sería especulativo.
  - El aviso de fallback se muestra únicamente dentro de la hoja (`Modal`) del selector de categorías, reutilizando el estilo de error ya existente (`styles.errorText`, `#d92d20`), igual que ya ocurre con `isLoading`/`errorMessage` hoy.
- Suposiciones por validar: ninguna — el diseño de esta sub-feature ya fue validado contra el código real antes de iniciar esta especificación.
- Fuera de alcance:
  - No se modifica el patrón de `createIncident`/`POST /incidents` ni su manejo de rechazo de negocio.
  - No se depura ni se verifica la lógica interna del backend (`GET /categories`); solo se comprueba que el front envía la petición correctamente y maneja su respuesta o fallo.
  - No se añade `createdAt` ni ningún otro campo nuevo a `Category`.
  - No se duplica el aviso de fallback fuera de la hoja del selector (p. ej. no se añade en el trigger cerrado del picker ni en otro punto de `new.tsx`).
  - No se tocan `backend/` ni `database/` (solo lectura).

## Contexto verificado

- Implementación actual:
  - `src/types/category.ts` define `Category { id: string; name: string }`.
  - `src/services/category.service.ts` exporta `CATEGORIES_ENDPOINT = ${API_BASE_URL}/categories` y `fetchCategories(): Promise<Category[]>`, que llama solo al mock con `fetchWithTimeout` y lanza `Error` con mensajes en español ante timeout, fallo de red o `!response.ok`.
  - `src/hooks/use-categories.ts` expone `UseCategoriesResult { categories, isLoading, errorMessage, reload }`; carga al montar, resetea `errorMessage` en `reload()`.
  - `src/components/category-picker.tsx` recibe `isLoading` y `errorMessage` (ambos ya requeridos) y los renderiza dentro de la hoja (`Modal`) antes de listar las categorías; `errorMessage` usa `styles.errorText` (`color: '#d92d20'`).
  - `src/app/incidents/new.tsx` destructura `categories`, `isLoading: isCategoriesLoading`, `errorMessage: categoriesErrorMessage` de `useCategories()` y los pasa a `<CategoryPicker>`; ya existe un estado local `backendFallbackNotice` (para el envío de la incidencia, no para las categorías) renderizado aparte en el formulario.
- Contratos y referencias del dominio:
  - `backend/docs/spec/endpoint/get-categories/README.md`: `GET /categories`, sin cuerpo ni parámetros, respuesta 200 con array `[{ id, name, createdAt }]` sin envoltorio, catálogo en memoria (se reinicia con el backend), sin autenticación.
  - `src/services/incident.service.ts`: patrón ya validado de real-first/fallback con helpers `toConnectionError`, `extractBackendErrorMessage`, `buildBackendRejectionMessage` y endpoints separados `BACKEND_INCIDENTS_ENDPOINT`/`MOCK_INCIDENTS_ENDPOINT`.
- Configuración y dependencias disponibles: `BACKEND_API_URL` y `API_BASE_URL` ya están definidas en `@/constants/config` y en uso por `incident.service.ts`; no se requiere ninguna dependencia nueva.
- Diferencia entre estado actual y propuesto: `fetchCategories()` pasa de devolver `Category[]` consultando solo el mock, a devolver `FetchCategoriesResult` intentando primero el backend real y cayendo al mock ante cualquier fallo, propagando al hook y al componente de qué fuente proviene el catálogo mostrado.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

Referencia de solo lectura al contrato ya documentado por backend; nunca redefinirlo ni implementarlo desde el frontend.

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `GET {BACKEND_API_URL}/categories` | Sin cuerpo, sin parámetros | 200 con array sin envoltorio `[{ id: string (UUID), name: string, createdAt: string (ISO) }]` | `backend/docs/spec/endpoint/get-categories/README.md` |

- Identidad y permisos: el endpoint no requiere autenticación (según el contrato documentado); el front no añade ninguna cabecera de identidad para esta llamada.
- Si el backend no responde: cualquier fallo (timeout, fallo de red o `response.ok === false`) activa el fallback al mock con un aviso claro en pantalla que incluye el motivo real cuando está disponible (ver decisión deliberada en "Objetivo y decisiones vigentes").

### Mock (json-server / db.json)

La entidad `categories` ya existe en `db.json` y no cambia; el flujo descrito en CLAUDE.md (comprobar existencia, ajustar tipos, pedir confirmación) no aplica porque no se introduce ni se modifica ningún campo del recurso mock.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `id` | `string` | Sí | Identificador ya existente en `db.json`, sin normalización adicional | No aplica (siempre presente en el fixture) |
| `name` | `string` | Sí | Texto tal cual se guarda en `db.json`, sin trim adicional en el front | No aplica (siempre presente en el fixture) |

- Recurso simulado: sin cambios respecto al `db.json` actual (array de categorías con `id` y `name`).
- Errores simulados: los ya existentes en `fetchCategories` (hoy `fetchCategoriesFromMock`): timeout (10 s) y `!response.ok` del servidor mock, ambos con mensaje genérico en español; si el mock también falla tras el fallback del backend, ese error se propaga tal cual (sin combinar mensajes).

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/` (Expo Router): `src/app/incidents/new.tsx` (pantalla empujada desde el Stack raíz, ya existente; no cambia su ubicación en la navegación).
- Ubicación: sin cambios de navegación; el selector de categorías sigue viviendo dentro del formulario de registro de incidencia.
- Componentes nuevos vs. reutilizados: no se crea ningún componente nuevo. Se reutiliza `src/components/category-picker.tsx` (nuevo prop `fallbackNotice`) y `src/hooks/use-categories.ts` (nuevo campo `fallbackNotice`).
- Estados explícitos de carga/error: se mantiene el `isLoading`/`errorMessage` actual (errores de carga totales, cuando falla tanto backend como mock) y se añade un tercer estado independiente, `fallbackNotice`, para el caso de éxito parcial (el mock sirvió el catálogo porque el backend falló). Los tres estados son mutuamente compatibles con el formulario: no bloquean el envío de la incidencia, solo informan de la procedencia del catálogo mostrado.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `Category` (reutilizado, sin cambios) | `{ id: string; name: string }` | Sin cambios; el backend devuelve también `createdAt`, pero el front no lo consume y no se añade al tipo. |
| `CategorySource` (nuevo) | `'backend' \| 'mock'` | Indica de qué origen proviene el catálogo devuelto por `fetchCategories()`. |
| `FetchCategoriesResult` (nuevo) | `{ categories: Category[]; source: CategorySource; backendErrorMessage: string \| null }` | `backendErrorMessage` es `null` cuando `source === 'backend'` (éxito sin fallback); contiene el motivo real del fallo del backend cuando `source === 'mock'`. |

No hay diferencia entre el tipo interno y la respuesta pública del backend más allá de la omisión deliberada de `createdAt`, ya documentada arriba. No se introduce ninguna entidad nueva en `db.json`.

- Estrategia de medios: no aplica — esta sub-feature no maneja fotos ni medios.
- Almacenamiento de esta fase: el mock (`db.json` vía json-server) se conserva íntegramente como fallback; se añade el camino real (`GET {BACKEND_API_URL}/categories`) sin borrar ni recortar la simulación existente, conforme a la regla dura de CLAUDE.md.
- Ciclo de vida: el catálogo del backend vive en memoria del proceso backend (se reinicia con la aplicación, según su propio contrato documentado); el catálogo del mock persiste en `db.json` igual que hoy.

## Diseño mínimo

- `src/services/category.service.ts`: se reescribe siguiendo el patrón ya validado en `src/services/incident.service.ts`. Se definen `BACKEND_CATEGORIES_ENDPOINT = ${BACKEND_API_URL}/categories` y `MOCK_CATEGORIES_ENDPOINT = ${API_BASE_URL}/categories`; `CATEGORIES_ENDPOINT` pasa a ser un alias del endpoint del backend (igual que `INCIDENTS_ENDPOINT` hoy) para no romper imports existentes. Se extraen helpers locales con comentarios en español: `describeConnectionError(error): string` (traduce timeout/fallo de red a mensaje amigable), `extractBackendErrorMessage(rawBody): string | null` (copia de la lógica ya existente en `incident.service.ts` para leer `message` de un cuerpo de error de NestJS), `describeBackendRejection(response): Promise<string>` (equivalente de solo-lectura de `buildBackendRejectionMessage`, pero sin lanzar: describe el motivo para componer el aviso de fallback en vez de un error fatal). La lógica actual completa de `fetchCategories()` (timeout, fallo de red, `!response.ok`) se renombra a `fetchCategoriesFromMock(): Promise<Category[]>` sin cambiar su comportamiento. La nueva `fetchCategories(): Promise<FetchCategoriesResult>` intenta primero el backend; ante cualquier fallo (conexión/timeout o `!response.ok`) delega en `fetchCategoriesFromMock()` y devuelve `{ categories, source: 'mock', backendErrorMessage }`; si el mock también falla, ese error se propaga sin modificar; si el backend responde con éxito, devuelve `{ categories, source: 'backend', backendErrorMessage: null }` sin llamar nunca al mock.
- `src/hooks/use-categories.ts`: se añade `fallbackNotice: string | null` a `UseCategoriesResult`. En el `.then` de la carga, si `result.source === 'mock'` se compone `` `${result.backendErrorMessage} Mostrando el catálogo de categorías guardado en el mock.` ``; si `result.source === 'backend'`, se fija `null`. En el `.catch` (fallo total, backend y mock fallan), `fallbackNotice` se fija a `null` (el error total ya se comunica vía `errorMessage`, no se duplica). `reload()` resetea `fallbackNotice` a `null` igual que ya hace con `errorMessage`.
- `src/components/category-picker.tsx`: se añade el prop **required** `fallbackNotice: string | null` (consistente con que `errorMessage` ya es required). Se renderiza dentro de la hoja (`Modal`), reutilizando literalmente `styles.errorText` (`#d92d20`) ya definido, justo después del bloque `isLoading`/`errorMessage` existente y antes de listar las categorías. No se duplica en el trigger cerrado del picker ni en otro punto de `new.tsx`: es el mismo lugar donde la persona usuaria ya espera ver el estado de carga de categorías, mantiene la responsabilidad encapsulada en el componente y evita rediseñar el trigger sin que se haya pedido. Trade-off aceptado: si la persona usuaria nunca abre la hoja, no verá el aviso — razonable porque el aviso solo importa si interactúa con el selector de categorías.
- `src/app/incidents/new.tsx`: se destructura `fallbackNotice: categoriesFallbackNotice` de `useCategories()` (renombrado para no chocar con el `backendFallbackNotice` local ya existente, que es para el envío de la incidencia) y se pasa a `<CategoryPicker fallbackNotice={categoriesFallbackNotice} ... />`. No se cambia la lógica de negocio dentro de la pantalla más allá de este cableado, conforme a la convención de no mezclar lógica con enrutado.

## Criterios de aceptación

1. Cuando `GET {BACKEND_API_URL}/categories` responde con éxito (`response.ok === true`), `fetchCategories()` devuelve `{ categories, source: 'backend', backendErrorMessage: null }`, nunca llama al endpoint del mock, y la hoja del selector de categorías no muestra ningún aviso de fallback.
2. Cuando `GET {BACKEND_API_URL}/categories` falla por timeout o por fallo de red (error de conexión), `fetchCategories()` cae a `fetchCategoriesFromMock()`, devuelve `{ categories: <catálogo del mock>, source: 'mock', backendErrorMessage: <motivo de conexión> }`, y la hoja del selector muestra el aviso compuesto (`${backendErrorMessage} Mostrando el catálogo de categorías guardado en el mock.`) con el estilo `styles.errorText`.
3. Cuando `GET {BACKEND_API_URL}/categories` responde pero con `response.ok === false` (p. ej. 404 o 500), `fetchCategories()` también cae al mock (a diferencia del patrón de `createIncident`) y compone `backendErrorMessage` incluyendo el mensaje real del cuerpo JSON de error cuando está disponible, o un mensaje genérico cuando el cuerpo no es JSON o no trae `message`.
4. Cuando tanto el backend como el mock fallan, `fetchCategories()` propaga el error del fallo del mock tal cual (sin combinar ambos mensajes); el hook refleja esto en `errorMessage` (no nulo) y deja `fallbackNotice` en `null`; `reload()` resetea tanto `errorMessage` como `fallbackNotice` a `null` antes de reintentar.
5. `Category` (`src/types/category.ts`) no incluye `createdAt` tras esta implementación, aunque el backend lo devuelva; `CategoryPicker` exige `fallbackNotice` como prop obligatoria (falla en compilación de TypeScript si se omite en cualquier punto donde se instancia el componente, incluidos los tests).

## Estrategia de verificación

Casos de prueba que demuestran cada criterio:

- `src/__tests__/services/category.service.test.ts`: éxito del backend sin tocar el mock (criterio 1); fallback por fallo de conexión (criterio 2); fallback por timeout (criterio 2); fallback por `!response.ok` con cuerpo `{ message }` y con cuerpo no-JSON/sin `message` (criterio 3); doble fallo (backend y mock) propagando el error del mock (criterio 4); verificación de que un backend exitoso nunca invoca el endpoint del mock (criterio 1).
- `src/__tests__/hooks/use-categories.test.ts`: fixtures con la nueva forma `{ categories, source, backendErrorMessage }`; caso `source: 'mock'` produce `fallbackNotice` no nulo con el texto compuesto esperado (criterio 2 y 3); caso de error total deja `fallbackNotice: null` junto con `errorMessage` no nulo (criterio 4); caso de `reload()` que resetea `fallbackNotice` a `null` antes de la nueva carga (criterio 4).
- `src/__tests__/components/category-picker.test.tsx`: prop `fallbackNotice: null` por defecto no rompe el render existente; un test nuevo con `fallbackNotice` con texto verifica que el aviso aparece dentro de la hoja junto a la lista de categorías, sin sustituirla (criterio 5).
- `src/__tests__/app/incidents/new-incident-screen.test.tsx`: ajuste del fixture de `fetchCategories` a `{ categories: [], source: 'backend', backendErrorMessage: null }` para mantener el test existente compilando y pasando con la nueva forma del resultado (criterio 5).

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e o integración. Un contrato de consumo documentado no equivale a una verificación de que el backend responde correctamente: el frontend solo comprueba que la petición se envía bien formada y llega con respuesta (ver política de backend en CLAUDE.md); no es responsabilidad del frontend depurar la lógica interna del backend.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el plan](./plan.md#confirmación-de-implementación). No se crean informes, archivos de tareas o documentos de cierre separados.
