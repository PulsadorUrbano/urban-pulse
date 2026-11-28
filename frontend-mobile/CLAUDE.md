# Visión general del proyecto: UrbanPulse (frontend-mobile)

## Contexto

**UrbanPulse** es un proyecto universitario diseñado para agilizar el reporte y la gestión de incidencias urbanas. Aunque la plataforma completa permite a la ciudadanía reportar incidencias por toda la ciudad y al personal del ayuntamiento gestionarlas y resolverlas, esta **aplicación móvil es estrictamente para la ciudadanía en su alcance inicial**.

### Alcance y restricciones

- **Público objetivo:** solo ciudadanía / público general.
- **Fuera de alcance:** paneles de gestión del ayuntamiento/personal, herramientas de triaje o flujos administrativos (pertenecen estrictamente a los servicios web o backend).
- **Capacidades móviles principales:** crear nuevos reportes de incidencias con ubicación/multimedia y hacer seguimiento del estado de los reportes propios.
- **Datos y conexión con el backend:** ver la sección [Integración con backend y datos mock](#integración-con-backend-y-datos-mock) para la política completa (mock vs. backend real).

Esta es una aplicación móvil Expo/React Native. Prioriza patrones mobile-first, el rendimiento y la compatibilidad multiplataforma.

---

## Expo ha cambiado — no te fíes de tu memoria de entrenamiento

Expo y las librerías móviles cambian con frecuencia entre versiones. **No te bases en la memoria de entrenamiento para APIs de Expo o React Native.**

Expo lanza cambios incompatibles en cada versión de SDK. Las APIs que recuerdas probablemente estén renombradas, movidas o eliminadas. Antes de escribir cualquier código que use una API de Expo, EAS o React Native:

1. Lee la versión mayor del paquete `expo` en `package.json`.
2. Consulta la documentación versionada correspondiente: `https://docs.expo.dev/versions/v<major>.0.0/`
3. Para cualquier otra cosa, consulta `https://docs.expo.dev/llms.txt` — un índice de toda la documentación de Expo con correcciones a errores comunes de los LLM. Sigue sus enlaces hasta la página concreta que necesites; nunca respondas de memoria.

- **Usa Context7 primero:** antes de escribir código para módulos poco familiares o APIs de Expo (`expo-image-picker`, `expo-location`, `expo-router`), consulta Context7 para inspeccionar documentación oficial y acorde a la versión.
- **Referencia oficial:** para decisiones generales de arquitectura, consulta `https://docs.expo.dev/llms.txt`.

---

## Comandos

### Frontend

Ejecuta todos los comandos desde `urbanPulse/frontend-mobile/`.

**Gestor de paquetes: `pnpm` exclusivamente.** El proyecto usa `pnpm-lock.yaml` como única fuente de verdad; no uses `npm`, `yarn` ni `bun` para instalar o ejecutar nada en `frontend-mobile/`.

```bash
# Gestión de paquetes (SIEMPRE usa expo install para compatibilidad nativa)

pnpm expo install <package>  # SIEMPRE en lugar de npm/yarn/bun add — resuelve versiones compatibles con el SDK
pnpm run start                # arranca el servidor de desarrollo
pnpm expo lint                # lint
pnpm tsc --noEmit             # typecheck
pnpm typecheck                # typecheck (script de package.json)
pnpm test                     # tests (Jest)
pnpm dlx expo-doctor          # diagnostica problemas de dependencias y configuración
pnpm expo install --fix       # corrige versiones de paquetes incompatibles
```

**Revisión de seguridad antes de instalar cualquier paquete nuevo:** antes de ejecutar `pnpm expo install <package>` (o añadir cualquier dependencia nueva, directa o transitiva relevante), revisa que el paquete no sea peligroso: comprueba el nombre exacto (cuidado con typosquatting), el mantenedor, la fecha de publicación/descargas en npm, y busca scripts de instalación (`postinstall`) sospechosos o reportes de vulnerabilidades/malware recientes. Si tienes dudas razonables sobre un paquete, repórtalo al usuario y pide confirmación explícita antes de instalarlo en lugar de proceder. Esto aplica sobre la restricción ya existente de *Nada de dependencias sin aprobar* (ver *Qué NO hacer*).

Ejecuta lint y typecheck antes de dar por terminada cualquier tarea.

### Servidor mock

```bash
pnpm run mock
```

### Backend + BD

Levanta esto solo para pruebas y únicamente cuando el usuario lo pida explícitamente (ver también *Integración con backend y datos mock*).

```bash
docker compose up --build
```

---

## Integración con backend y datos mock

- **Datos simulados vía json-server:** no intentes conectarte ni leer los endpoints en vivo del backend NestJS hasta que se pida explícitamente; toda la interacción con la API y las pruebas de integración deben basarse estrictamente en datos mock locales (p. ej. usando `json-server`), salvo que se esté verificando explícitamente la conexión al backend real (ver *Backend + BD* en *Comandos*).
- **No verifiques ni depures el backend: NO es tu trabajo.** Cuando se conecte el front con el backend, comprueba ÚNICAMENTE que el **front se conecta y envía correctamente** (petición bien formada, que llega al endpoint y obtiene respuesta). NO gastes tokens en comprobar ni depurar si el backend *funciona como debería* (su lógica interna, sus tests, su almacenamiento): eso es responsabilidad del equipo de backend. Si el backend falla, **repórtalo y continúa**; no intentes arreglarlo salvo que se pida explícitamente.
- **Backend real + simulación mock:** si una feature ya está implementada en el backend, el móvil la consume del backend real; además, el mock (`json-server` / capa de servicio) mantiene una simulación equivalente de esa feature para conservar trazabilidad y permitir desarrollo y pruebas sin backend levantado. Impleméntalo como **real-first con fallback al mock**: intenta el backend y, si **no hay conexión**, cae al mock mostrando un **aviso claro en pantalla** (p. ej. "No se ha podido conectar al backend, realizando en el mock").
- **NUNCA borres del front lógica o simulación que el backend aún no cubra de forma estable.** Si una feature todavía no está en el backend —o no está completa, estable o verificada— **no elimines** su implementación ni su simulación mock del front. Al conectar con el backend, **AÑADE** el camino real pero **CONSERVA** el del mock: el front nunca debe quedar dependiendo solo del backend para algo que antes funcionaba contra el mock. Regla dura: **si dudas, no borras — se conserva el mock.**
- **Flujo de datos mock y esquema:** al trabajar con `db.json`:
  1. Verifica si la entidad o los datos mock requeridos ya existen.
  2. Si faltan, define primero el contrato/interfaz en `src/types/`.
  3. Añade la entidad/registro mock en `db.json` y pide confirmación al usuario antes de continuar con la integración de UI.
- **Estrategia de medios locales e imágenes:**
  - **Nada de almacenamiento en la nube todavía:** no propongas, configures ni esperes por S3, MinIO o endpoints de subida del backend.
  - **Fotos capturadas/seleccionadas:** usa la URI local temporal (`file://...`) que devuelven directamente `expo-image-picker` o los módulos de cámara. Guarda esa URI local directamente en `photoURL` al persistir en `db.json`.
  - **Datos mock semilla:** usa URLs de imágenes placeholder (p. ej. `https://picsum.photos/...`) para los fixtures iniciales en `db.json`.
  - **Encapsulación del servicio de almacenamiento:** aísla el manejo de imágenes dentro de `src/services/storage.service.ts` con un retardo de red simulado (`setTimeout`) para probar los estados de carga/error de la UI sin tocar servicios externos.

---

## Convenciones

- **Primitivas de React Native:** nunca uses elementos HTML (`<div>`, `<p>`, `<span>`). Todo el texto debe ir dentro de `<Text>`.
- **Safe Area:** usa siempre `react-native-safe-area-context` en lugar del `SafeAreaView` heredado de `react-native`.
- **Estilos con NativeWind:** usa `className="..."` con clases de utilidad válidas de React Native. Evita utilidades web no soportadas (p. ej. CSS grid, `vw`/`vh` crudos). Evita objetos `style={{ ... }}` inline y pesados.
- **Convenciones de nombres:**
  - kebab-case para el nombre de archivo tanto de componentes (`button.tsx`) como de hooks (`use-location.ts`); el export principal (el componente o el hook en sí) sigue en PascalCase (`Button`) / camelCase (`useLocation`) respectivamente. Esto documenta el estándar ya adoptado de forma consistente en todo `src/components/` y `src/hooks/`.
  - camelCase para funciones y variables
  - Las rutas dentro de `src/app/` siguen kebab-case o las convenciones de Expo Router (`[id].tsx`, `_layout.tsx`)
- **Ubicación de los tests:** todos los tests viven en **`src/__tests__/`** espejando el árbol de código fuente (`src/__tests__/components/button.test.tsx`, `src/__tests__/hooks/use-auth.test.ts`), con nombres descriptivos `<module>.test.ts(x)`. NUNCA coloques tests dentro de `src/app/` — Expo Router empaqueta todos los archivos de ese directorio.
- **Manejo de errores:** los fallos a nivel de ruta se gestionan exportando `ErrorBoundary` desde el archivo de ruta o layout (en Expo Router no existe `+error.tsx`); está implementado en `src/app/_layout.tsx` con el componente `RouteErrorFallback`. Los errores de la API se capturan y transforman en `src/services/`, exponiendo feedback amigable al usuario mediante estado de UI o notificaciones toast.
- **Patrones y buenas prácticas:** valida las entradas de formularios y la forma de los payloads (p. ej. con Zod) antes de despachar a la API; impón props tipadas con TypeScript; muestra estados de carga explícitos durante acciones asíncronas para evitar envíos duplicados.
- **Nombres intuitivos y autodescriptivos:** usa nombres claros que revelen la intención sin necesidad de comentarios. Evita abreviaturas genéricas o crípticas (p. ej. usa `incidentList` en vez de `data`/`arr`, `isSubmittingReport` en vez de `flag`, `fetchIncidentsByStatus` en vez de `getData`).
- **Expo Go solo incluye sus módulos nativos empaquetados.** Tras añadir una librería con código nativo, la app necesita un development build: `pnpm expo run:ios|android` en local, o `eas build --profile development`.
- **Prefiere los módulos recomendados de Expo** sobre librerías de terceros, y revisa tus skills disponibles antes de añadir dependencias. Docs: `https://docs.expo.dev/versions/latest/index.md`
- **Investigación autónoma de errores:** ante errores poco familiares de build, Metro o runtime nativo durante la ejecución de una tarea, consulta Fetcher (o Context7) con los logs exactos del error y las issues recientes de GitHub antes de adivinar o intentar arreglos a ciegas.
- **Idioma de nombres y comentarios:** todos los identificadores (variables, funciones, tipos y nombres de componentes) deben escribirse en inglés. Sin embargo, todos los comentarios en el código que expliquen lógica y detalles de implementación deben escribirse en español.

---

## Qué NO hacer

- **Nada de dependencias sin aprobar ni sin revisar:** no instales paquetes de terceros ni librerías nativas nuevas sin aprobación previa explícita; prioriza siempre los módulos integrados del SDK de Expo. Además, revisa siempre que el paquete no sea peligroso antes de instalarlo (ver *Gestión de paquetes* en *Comandos*) e instala siempre con `pnpm` (nunca `npm`/`yarn`/`bun`).
- **No subas archivos secretos:** nunca subas al control de versiones `.env` ni archivos con credenciales/tokens privados.
- **Nada de código sin tipar:** evita `any` en TypeScript; define interfaces explícitas o usa `unknown` con estrechamiento de tipos en runtime.
- **No mezcles lógica de negocio con el enrutado:** nunca pongas componentes de UI, hooks personalizados o peticiones a la API dentro de `src/app/` salvo que sean pantallas o navegadores `_layout.tsx`.
- **No edites las carpetas nativas a mano:** nunca toques ni modifiques los directorios generados `ios/` o `android/` directamente; gestiona toda la configuración nativa estrictamente a través de `app.json` y config plugins.
- **Nada de listas sin optimizar:** no renderices colecciones dinámicas o sin límite con `.map()` dentro de un `<ScrollView>` estándar; usa siempre `<FlatList>` o virtualización para el rendimiento de listas.
- **Nada de estilos inline sin control:** evita objetos `style={{ ... }}` inline y voluminosos; da estilo a los componentes con clases de utilidad de NativeWind (`className="..."`) o tokens de tema.
- **No modifiques archivos fuera de frontend-mobile:** todas las ediciones deben confinarse estrictamente a `frontend-mobile/`. Otros directorios (como `backend/` o `database/`) son de solo lectura, para inspeccionar endpoints de la API, contratos DTO o ejecutar comandos docker a nivel raíz.
- **Política de backend y datos mock:** ver la sección [Integración con backend y datos mock](#integración-con-backend-y-datos-mock) (qué consultar, cuándo depurar backend y cuándo conservar el mock).

---

## Flujo de trabajo

- **Planifica antes de tareas no triviales:** propón un plan paso a paso y espera mi aprobación explícita antes de hacer cambios.
- **Una tarea a la vez:** céntrate en una sola tarea; al terminarla, resume los archivos y líneas exactos modificados para revisión.
- **Pregunta ante la duda:** si no tienes al menos un 80 % de confianza en un detalle de implementación, pide aclaración en lugar de adivinar o alucinar.
- **Cambios mínimos y específicos:** toca solo el código estrictamente relacionado con la tarea actual. No reformatees ni refactorices archivos no relacionados.
- **Verificación de calidad obligatoria:** ejecuta siempre `pnpm expo lint` y `pnpm tsc --noEmit` para asegurar que no hay errores de lint ni de tipos antes de dar por terminada cualquier tarea.
- **Nada de commits de git autónomos:** no crees commits ni hagas push a ramas remotas salvo que se pida explícitamente.
- **Backend y datos mock:** ver [Integración con backend y datos mock](#integración-con-backend-y-datos-mock) para la política de real-first/fallback, el flujo de datos en `db.json` y la estrategia de medios locales.
- **Specs y trazabilidad (`docs/spec/`):** la estructura de carpetas, las plantillas y la diferencia entre `spec.md` y `plan.md` están documentadas en `docs/spec/README.md` — es la única fuente de verdad, no se duplica aquí. El agente `organizador` es responsable de mantenerlo.
- **Documentación de sesión y seguimiento de tareas (`docs/`):**
  - Mantén el progreso de la sesión dentro del directorio `docs/`.
  - Documenta notas de sesión y mantén una lista de tareas estructurada que detalle todas las tareas completadas y sus subtareas (p. ej. usando checkboxes `- [x]` / `- [ ]`).
  - Actualiza este registro al completar cada tarea para que el trabajo en curso y el pasado quede transparente y trazable entre sesiones.

---

## Github

Si yo solicito que subas una feature a github, crees una rama, commit, etc. Debes leer el `README.md` de la raíz y seguir la convención que se indica.
