# 2026-11-12 — Especificación: asignar incidencias desde el panel web

- Desarrollador responsable: jBlanco21 (identidad de Git; pendiente de confirmación).
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: GPT-6; identificador de compilación exacto no disponible.

- Rama: `asignaciones-frontend`, creada desde `origin/dev` en `feb78f1`.
- Última actualización: 2026-11-12.
- Estado: implementado y verificado localmente; pendiente de prueba con backend activo.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: [especificación backend](../../../../../backend/docs/spec/features/specs/2026-11-03-asignar-departamento-equipo-y-tecnico-spec.md) y [contrato de asignación](../../../../../backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md).

## Objetivo y decisiones vigentes

Permitir al personal municipal con rol `admin` o `administrative` consultar una incidencia y asignarle departamento, equipo y técnico desde el navegador. La interfaz debe mostrar la asignación actual, impedir combinaciones incompatibles y distinguir con claridad los cambios guardados en el backend de los cambios de demostración.

- Alcance propuesto: acceso desde el panel web a una vista de asignación, búsqueda por UUID, consulta del detalle y del catálogo, selección jerárquica, guardado y desasignación, con modo mock cuando no haya conexión.
- Decisiones propuestas: usar búsqueda por UUID porque el backend no ofrece un listado municipal de incidencias; mantener la vista de validación existente; admitir asignaciones intermedias, incluido solo departamento; usar un único PATCH para guardar la selección completa o los campos modificados.
- Suposiciones por validar: la búsqueda manual por UUID es suficiente para esta primera entrega; la identidad de Git identifica al desarrollador responsable. Son decisiones de producto, no requisitos confirmados por el usuario.
- Fuera de alcance: modificar `backend/`, `frontend-mobile/` o `database/`; CRUD del catálogo; listado municipal, filtros, paginación, cambios de estado o prioridad; auditoría y resolución técnica.

## Contexto verificado

- Implementación actual: [App.tsx](../../../../src/App.tsx) ofrece acceso, validación y asignaciones con sesión restaurable y lee `?incidencia=<uuid>`. [incident-validation-view.tsx](../../../../src/components/incident-validation-view.tsx) mantiene la validación existente. [incident-assignment-view.tsx](../../../../src/components/incident-assignment-view.tsx) presenta la asignación y [use-incident-assignment.ts](../../../../src/hooks/use-incident-assignment.ts) gestiona el formulario. [incident.service.ts](../../../../src/services/incident.service.ts) valida `assigned` y los tres IDs de [IncidentDetail](../../../../src/types/incident.ts). [auth.service.ts](../../../../src/services/auth.service.ts) distingue sesión real y simulada.
- Contratos y referencias: [GET de detalle](../../../../../backend/docs/spec/endpoint/get-incidents-id/README.md), [GET de opciones](../../../../../backend/docs/spec/endpoint/get-incidents-assignment-options/README.md), [PATCH de asignación](../../../../../backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md). El backend ya implementa esas rutas en esta base de `dev`.
- Configuración y dependencias: React 19, Vite 8, TypeScript 5.7, Tailwind CSS 3, Vitest 5 y lucide-react, según [package.json](../../../../package.json). [config.ts](../../../../src/constants/config.ts) resuelve `VITE_BACKEND_URL` o `/api`; ya existen `.env.example`, `src/mocks/` y utilidades HTTP compartidas.
- Resultado: se añadieron la vista y el servicio de asignación, se amplió el contrato de incidencia y se prepararon datos demo compatibles con el backend.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `GET /incidents/:id` | UUID en ruta; sin cuerpo | 200: incidencia completa con `departmentId`, `teamId` y `technicianId` presentes y anulables; fechas ISO | [Detalle](../../../../../backend/docs/spec/endpoint/get-incidents-id/README.md) |
| `GET /incidents/assignment-options` | Bearer; sin cuerpo | 200: `{departments, teams, technicians}`; las tres listas pueden estar vacías | [Opciones](../../../../../backend/docs/spec/endpoint/get-incidents-assignment-options/README.md) |
| `PATCH /incidents/:id/assignment` | Bearer; JSON no vacío con uno o varios de `departmentId`, `teamId`, `technicianId`, UUID o `null` | 200: incidencia completa con los tres IDs actualizados; estado y prioridad intactos | [Asignación](../../../../../backend/docs/spec/endpoint/patch-incidents-id-assignment/README.md) |

- Identidad y permisos: el GET de detalle no exige token. Opciones y PATCH requieren token Bearer válido y rol actual `admin` o `administrative` verificado por el servidor. La UI puede ocultar la edición a otros roles, pero el backend decide el permiso. Un token de origen `mock` no acredita permisos reales.
- Errores: 400 UUID/cuerpo/catálogo inválido; 401 sesión no vigente; 403 rol insuficiente; 404 incidencia ausente; 409 estado no editable, jerarquía incompatible o cambio concurrente; 503 persistencia no disponible. La UI no debe presentar estos rechazos como guardados.
- Sin conexión, timeout o 502/503/504 del proxy: en desarrollo, mostrar un aviso visible y permitir abrir el modo de demostración con datos mock. En producción, mostrar el error sin cargar datos demo. Si un PATCH real falla, conservar el formulario y permitir reintentar; no convertir automáticamente ese intento en un guardado mock.

### Mock (`src/mocks/`)

Los datos de demostración tendrán la misma forma pública que el backend y usarán UUID válidos para incidencia, departamentos, equipos y técnicos. Reutilizar `src/constants/config.ts` y `.env.example` existentes. El mock solo estará disponible tras `import.meta.env.DEV`, de acuerdo con la regla del proyecto; no entrará en el build de producción.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `:id` | UUID | Sí | Aceptar formato UUID; normalizar a minúsculas para la petición | Vacío o formato inválido: no consultar |
| `departmentId` | UUID o `null` | No en PATCH | Debe existir en catálogo | Omitido: conservar; `null`: quitar departamento, equipo y técnico |
| `teamId` | UUID o `null` | No en PATCH | Debe pertenecer al departamento resultante | Omitido: conservar salvo cambio de departamento; `null`: quitar equipo y técnico |
| `technicianId` | UUID o `null` | No en PATCH | Debe pertenecer al equipo resultante | Omitido: conservar salvo cambio superior; `null`: quitar solo técnico |

- Recurso simulado: incidencia con los campos del GET de detalle (`id`, `title`, `description`, `civicId`, categoría, ubicación, imágenes, estado, prioridad, fecha y tres IDs anulables); opciones con arrays de `{id,name}`, `{id,name,departmentId}` y `{id,name,teamId}`. Los nombres de técnicos corresponden a `username` en el backend.
- Errores simulados: UUID inválido 400, incidencia ausente 404, estado diferente de `validated` o `assigned` y jerarquía incompatible 409. El modo mock solo conserva cambios durante la sesión en memoria; al recargar vuelve a los datos iniciales.
- El mock no simula una respuesta 401/403 como sustituto de autorización real. El guardado mock se rotula como demostración y nunca se presenta como persistido en PostgreSQL.

## Contrato de UI y navegación

- Vistas: añadir «Asignaciones» a la navegación de [App.tsx](../../../../src/App.tsx), junto a acceso y validación. La vista recibe un UUID introducido por el operador; puede precargar `?incidencia=<uuid>`, igual que validación. El selector de módulos actual no es una garantía de acceso: la vista debe comprobar la sesión y el rol antes de habilitar edición.
- Mostrar título, UUID, estado, prioridad y asignación actual de la incidencia; no atribuir nombres si un ID ya no aparece en el catálogo. Mostrar estados de carga, vacío, UUID inválido, incidencia ausente, catálogo vacío y error recuperable.
- Tres selectores en orden departamento, equipo y técnico. Elegir o quitar departamento limpia los selectores inferiores; elegir o quitar equipo limpia técnico. Equipos y técnicos se filtran por el nivel superior. Los niveles inferiores quedan deshabilitados hasta disponer del superior.
- Se puede guardar solo departamento, departamento y equipo, o los tres. El botón «Guardar asignación» se habilita solo si la terna difiere de la recibida, la jerarquía es válida y el estado es `validated` o `assigned`. Se deshabilita durante el envío para evitar duplicados.
- Tras 200, actualizar la asignación mostrada desde la respuesta del servidor y confirmar el guardado. En 409, informar del conflicto y ofrecer recarga antes de reintentar; nunca sobrescribir silenciosamente una asignación más reciente. En 401, solicitar nuevo acceso; en 403, mostrar falta de permiso; en 400/404/503, mostrar el motivo sin perder el formulario.
- Navegación por teclado, etiquetas visibles y mensajes anunciables para carga, errores y éxito. Los controles deben funcionar en anchos habituales de escritorio y móvil.

## Tipos y datos mock

| Tipo nuevo o reutilizado (`src/types/`) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentDetail` ampliado | Campos públicos existentes más `departmentId`, `teamId`, `technicianId: string \| null`; `IncidentStatus` añade `assigned` | Los tres IDs se inicializan desde GET, nunca se infieren del catálogo; el type guard valida la nueva forma |
| `AssignmentOptions` | `departments`, `teams`, `technicians` con IDs y nombres; equipos con `departmentId`, técnicos con `teamId` | Arrays vacíos válidos; filtrado en UI por las relaciones |
| `AssignmentPatch` | Subconjunto no vacío de los tres IDs, cada valor `string \| null` | Ausencia y `null` tienen semánticas distintas; no incluir estado, prioridad ni actor |

La UI puede derivar etiquetas y opciones filtradas, pero el recurso público conserva los nombres y la nulabilidad del backend. No se inventan campos de asignación como fecha o motivo. La respuesta del PATCH es la fuente de verdad tras un guardado real.

- Almacenamiento: backend PostgreSQL para el flujo real; datos en memoria para la demostración.
- Ciclo de vida: no guardar asignaciones mock en `localStorage` ni `sessionStorage`; la sesión de autenticación existente se reutiliza sin añadir credenciales al mock.

## Diseño mínimo

Una vista nueva en `src/components/`, un hook para carga y formulario en `src/hooks/`, un servicio de asignaciones en `src/services/` y datos demo en `src/mocks/`. Ampliar `src/types/incident.ts` y su type guard en `src/services/incident.service.ts`; reutilizar `use-auth`, `constants/config.ts` y `services/http.ts`. El servicio enviará un solo PATCH con `Authorization: Bearer` para la sesión real y validará las respuestas con `readJson`, sin conversiones `as` sobre datos externos. Estilos con Tailwind CSS e iconos existentes de lucide-react. No añadir dependencias ni estado global.

## Criterios de aceptación

1. Un usuario `admin` o `administrative` con sesión real carga por UUID una incidencia `validated` o `assigned` y el catálogo, ve la terna actual y guarda una asignación completa o intermedia mediante un PATCH correcto.
2. Cambiar o quitar departamento limpia equipo y técnico; cambiar o quitar equipo limpia técnico; cambiar técnico conserva los superiores. Nunca se ofrece un equipo o técnico fuera de la jerarquía seleccionada.
3. UUID inválido, incidencia 404, catálogo vacío, estado no editable y ausencia de cambios impiden un envío inválido y muestran un estado comprensible.
4. El PATCH usa campos permitidos, distingue omisión de `null`, envía Bearer y no duplica peticiones. Un 409 no sobrescribe la asignación; 401, 403, 400 y 503 dejan claro que no hubo guardado.
5. Sin backend se muestra un aviso de desconexión y se puede entrar al modo demo; ningún guardado demo ni fallo de PATCH real se anuncia como persistencia real.
6. La vista de validación y el acceso existentes siguen disponibles; no se modifican contratos de backend ni móvil.

## Estrategia de verificación

Pruebas Vitest bajo `src/__tests__/` comprueban el type guard de incidencia, la limpieza jerárquica, la construcción del PATCH con `null` frente a omisión, el tratamiento de 409 y fallo de red, y la separación entre modo real y demo. Los endpoints, roles y campos se cotejaron con el código backend. Se ejecutaron `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y `git diff --check`; los resultados reales constan en el plan.

No crear ni ejecutar e2e o integración salvo petición explícita. La verificación del frontend prueba la forma de sus peticiones y el manejo de respuestas; no certifica la lógica interna ni la disponibilidad del backend.

Los resultados, decisiones y pendientes de implementación se registrarán únicamente en [el plan](./plan.md#confirmación-de-implementación).
