# 2026-11-07 — Especificación: migrar frontend-web a TypeScript estricto y conectarlo al backend

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: feature/web-typescript-migration.
- Última actualización: 2026-11-07.
- Estado: implementado con verificación pendiente de una decisión (ver [Confirmación de implementación](./plan.md#confirmación-de-implementación)).
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: issue #128; ADR 0002 (dos frontends) y ADR 0004 (stack web); `frontend-mobile/src` como referencia de estructura y contratos; bug [28-10-26 login](../../bugs/login/28-10-26-login-web-no-conecta-con-el-backend.md).

## Objetivo y decisiones vigentes

El panel web mezclaba JavaScript y TypeScript, mostraba una incidencia inventada (`incidentService.js`) y un usuario fijo en la cabecera. El personal municipal debe poder iniciar sesión con su cuenta real, abrir una incidencia del backend, ver sus imágenes y validarla con prioridad o descartarla con motivo, y que la resolución quede registrada en el backend.

- Alcance confirmado: TypeScript estricto en todo `src`; capa de API tipada; login, sesión e incidencias contra el backend real; comprobar que no queda nada de Cloudinary.
- Decisiones confirmadas:
  - Estructura, nombres y tipos alineados con `frontend-mobile/src` (`constants/config.ts`, `types/*.ts`, `services/*.service.ts`, `hooks/use-*.ts`, `mocks/`, `utils/`).
  - Real-first como el móvil: en desarrollo, el login cae a los datos simulados solo sin conexión y lo avisa; en producción muestra un error y los usuarios simulados no se incluyen en el build. Las incidencias no tienen datos simulados.
  - Una sesión simulada se descarta en cuanto el backend responde y no puede resolver incidencias.
  - Se retira el interruptor `VITE_AUTH_SOURCE` del bug del 28-10, que nunca llegó a `dev`.
  - Las respuestas del backend se validan con type guards (`readJson`); un cambio de contrato produce `BackendContractError` en lugar de datos erróneos.
  - El motivo de descarte elegido y la justificación se envían juntos en `cause` (`"Duplicado: <justificación>"`).
  - El actor de la resolución (`civicId` del PATCH) es el `id` del usuario de la sesión.
  - Se retira el bloque "Análisis Automático" (prioridad sugerida y confianza): era texto inventado y el backend no lo ofrece.
- Suposiciones por validar: la incidencia a validar se elige con `?incidencia=<id>` en la URL, porque el backend no tiene un listado de incidencias pendientes para el personal. Pendiente de decisión del equipo.
- Fuera de alcance: backend, frontend-mobile, rediseño de la interfaz, enrutador, asignaciones (PR #124, solo en la rama de la #119).

## Contexto verificado

- Implementación previa: `App.jsx`, `main.jsx`, `IncidentValidationView.jsx`, `useIncidentValidation.js` e `incidentService.js` en JavaScript; incidencia simulada con imagen de Unsplash; `authService.ts` con usuarios fijos.
- Contratos: `backend/src/auth/auth.controller.ts`, `backend/src/incidents/incidents.controller.ts`, `backend/src/incidents/incident.ts`, `backend/prisma/schema.prisma`.
- Dependencias: React 19, Vite 8, TypeScript 5.9, Tailwind 3, Vitest 5, ESLint 10; se añaden `typescript-eslint` y `@types/node`.
- Cloudinary: el backend de `dev` guarda las imágenes en disco y las publica en `/uploads/`; solo la PR #119 (sin mergear) usa Cloudinary. La web no tenía código, paquetes ni variables de Cloudinary.

## Contrato de datos (backend real + mock)

### Backend real (consumo)

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| `POST /auth/login` | JSON `{ usernameOrEmail, password }` | `200 { accessToken }` | `backend/docs/spec/endpoint/post-auth-login/README.md` |
| `GET /auth/me` | `Authorization: Bearer` | `200 { userId, username, email, role, phone }` | `backend/docs/spec/endpoint/get-auth-me/README.md` |
| `GET /incidents/:id` | UUID en la ruta | `200 IncidentDetail` | `backend/docs/spec/endpoint/get-incidents-id/README.md` |
| `PATCH /incidents/:id/status` | JSON `{ status: validated \| rejected, cause, civicId }` | `200 IncidentDetail`; `409` si no está `reported` | `backend/docs/spec/endpoint/patch-incidents-id-status/README.md` |
| `PATCH /incidents/:id/priority` | JSON `{ priority: low \| medium \| high, cause, civicId }` | `200 IncidentDetail`; `409` si no está `validated` | `backend/docs/spec/endpoint/patch-incidents-id-priority/README.md` |
| `GET /uploads/incidents/<id>/<archivo>` | estático | imagen | `backend/src/main.ts` (`useStaticAssets`) |

- Identidad y permisos: rol `civic` rechazado en la web; los endpoints de incidencias no exigen token en `dev`.
- Si el backend no responde (red, timeout o `502`/`503`/`504` del proxy): en desarrollo, el login usa los datos simulados con aviso; en producción muestra un error. Las incidencias muestran el error con opción de reintentar.

### Mock (`src/mocks/`)

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `username` / `email` | string | sí | comparación sin distinguir mayúsculas | — |
| `password` | string | sí | igualdad exacta; nunca se guarda en la sesión | — |
| `role` | `UserRole` | sí | enum `profile_role` | — |
| `fullName`, `departmentName`, `badgeNumber` | string | solo `fullName` | solo presentación | se omiten en el usuario del backend |

- Recurso simulado: `MOCK_USERS` (admin y ciudadano replican `dev-seed.service.ts`).
- Errores simulados: `InvalidCredentialsError` si no coinciden.

## Contrato de UI y navegación

- Vistas: `login-view.tsx` y `incident-validation-view.tsx`, seleccionadas en `App.tsx`; sin sesión solo se muestra el login y, con sesión restaurada, se entra directamente al panel.
- Componentes: reutilizados; se añaden miniaturas cuando hay varias imágenes y la tarjeta "Estado del expediente" con datos reales.
- Estados: carga, error con reintento, incidencia ya resuelta, aviso de datos simulados, envío deshabilitado mientras se procesa.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `IncidentDetail`, `CreatedIncidentImage`, `IncidentSummary` | como en el móvil | `status` y `priority` limitados a los valores del backend |
| `UserRole`, `BackendUser`, `MockUser`, `SessionUser` | como en el móvil | `MockUser` añade campos de presentación |
| `AuthToken`, `TokenPayload`, `TokenSource` | como en el móvil | — |
| `ChangeIncidentStatusInput`, `ChangeIncidentPriorityInput` | cuerpos de los PATCH | `civicId` = actor |

Diferencia con el móvil: el móvil declara estados (`assigned`, `in_progress`, `resolved`, `reopened`, `closed`) y la prioridad `urgent` que el backend no emite; la web se limita a los del backend para detectar desajustes.

- Almacenamiento: sesión en `localStorage` («Mantener sesión iniciada») o `sessionStorage`.
- Ciclo de vida: las incidencias viven en memoria del backend y se pierden al reiniciarlo.

## Diseño mínimo

`services/http.ts` (timeout, errores de NestJS, `readJson` con type guards) → `auth.service.ts`, `token.service.ts`, `session-storage.service.ts`, `incident.service.ts` → `hooks/use-auth.ts` (sesión única en `App`) y `hooks/use-incident-validation.ts` (estado → prioridad, con reintento de la prioridad si falla tras validar) → vistas.

## Criterios de aceptación

1. Ningún `.js`/`.jsx` de código fuente; `strict: true`; `typecheck`, `lint`, `test` y `build` sin errores ni reglas desactivadas.
2. Login real con `admin`/`admin`; `401` muestra error y no cae al mock; `civic` se rechaza; sin conexión entra con datos simulados y aviso en desarrollo, y muestra un error en producción, cuyo build no contiene los usuarios simulados.
3. La incidencia se carga de `GET /incidents/:id` con título, categoría, coordenadas, descripción, estado e imágenes de `/uploads`.
4. Validar guarda `validated` y la prioridad elegida; descartar guarda `rejected` con motivo; una incidencia ya resuelta no ofrece el formulario.
5. `404`, `400`, `409`, backend apagado y token caducado muestran un mensaje claro.
6. No queda ninguna referencia a Cloudinary.

## Estrategia de verificación

Tests de servicios con Vitest (contratos, errores y validación de respuestas) y prueba manual en el navegador contra el backend de `dev` levantado con Docker Compose, con incidencias creadas mediante `POST /incidents` como lo hace el móvil.

Los resultados reales se registran en [el mismo plan](./plan.md#confirmación-de-implementación).
