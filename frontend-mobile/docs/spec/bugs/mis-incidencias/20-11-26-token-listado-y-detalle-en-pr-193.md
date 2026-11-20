# 20-11-26 — Bug: el listado y el detalle de incidencias no envían el JWT (integración de la PR #158 en la PR #193)

> Plan en implementación. Se ejecuta en la rama de la PR #193 siguiendo la opción 2 propuesta por artina09 en esa PR: copiar a la #193 los cambios del token de la #158 y sus pruebas, y cerrar después la #158 indicando dónde quedó el arreglo.

- Feature afectada: mis-incidencias (listado «Mis incidencias» y detalle de una incidencia).
- Rama: `refactor/191-adaptar-frontend-mobile-contrato-incidencias` (PR #193).
- Última actualización: 2026-11-20.
- Estado: Resuelto.
- Origen: PR #158 (`fix/token`) y comentario de artina09 en la PR #193 (2026-11-20). Aviso previo de CodeJose21 en la #193: el detalle necesita el JWT en `GET /incidents/:id` y «Mis incidencias» lo necesitará en `GET /incidents` al integrar la #170.

## Síntoma observado

Con una sesión del backend real, «Mis incidencias» (`GET /incidents?civicId=...`) y el detalle (`GET /incidents/:id`) se piden sin cabecera `Authorization`. En el backend de la PR #185 los dos endpoints exigen JWT (`JwtAuthGuard` + `AccesoIncidenciasGuard`), así que responden 401 y la app muestra un error genérico en lugar de las incidencias.

## Diagnóstico

- `src/services/incident.service.ts`: `fetchMyIncidents(civicId)` y `fetchIncidentById(id)` no reciben token y hacen el GET al backend sin cabeceras.
- `src/hooks/use-my-incidents.ts` y `src/hooks/use-incident-detail.ts`: no reciben token ni lo usan como dependencia del efecto.
- `src/app/(tabs)/my-incidents.tsx` e `src/app/incidents/[id].tsx`: no leen el token de `useSession()`.

### Qué ya está resuelto en la #193 y no hay que traer de la #158

- **Respuestas antiguas que pisan el estado.** Los dos hooks ya usan una bandera `isActive` propia de cada ejecución del efecto (vino con la PR #184). Se conserva tal cual.
- **Fotos descartadas sin aviso.** La #193 ya sube las fotos por separado a `POST /incidents/:id/images` y permite reintentar. El punto 2 del plan `bugs/general/17-11-26-review-pr-158-token-y-fotos.md` (confirmación «enviar sin fotos») queda superado y no se implementa.

### Diferencia de diseño con la #158 (decisión confirmada por la usuaria)

La #158 pasa el token como texto (`accessToken: string | null`). La #193 usa `AuthToken` (`{ accessToken, source }`) y, si la sesión es del mock, no llama al backend (igual que `createIncident`). Si se copiase la #158 tal cual, una sesión mock enviaría su token falso al backend y recibiría 401. **Se usa `AuthToken | null`** en el servicio y en los hooks.

## Corrección propuesta

### 1. Servicio (`src/services/incident.service.ts`)

`fetchMyIncidents(civicId, token)` y `fetchIncidentById(id, token)` con `token: AuthToken | null`, siguiendo el mismo patrón que `createIncident`:

- `token.source === 'mock'`: directo al mock (`fetchMyIncidentsFromMock` / `fetchIncidentDetailFromMock`), sin llamar al backend.
- `token == null`: lanzar el error de sesión sin hacer la petición (reutilizar `MISSING_BACKEND_TOKEN_MESSAGE` o un mensaje equivalente para consulta).
- Token del backend: GET con `Authorization: Bearer <accessToken>`.
- Respuesta 401: error de sesión caducada (mensaje propio para consulta, no el de «registrar la incidencia»).
- Sin conexión (timeout o red): fallback al mock como ahora, sin cabecera `Authorization`.
- 404 del detalle: sigue siendo `IncidentNotFoundError` y nunca cae al mock.

### 2. Hooks

- `useMyIncidents(civicId, token)` y `useIncidentDetail(id, token)`.
- Si `token` es `null` (y en el listado ya hay `civicId`): no llamar al servicio y mostrar «No se pudo identificar tu sesión. Vuelve a iniciar sesión.». En el detalle, `incident` a `null` e `isNotFound` a `false`.
- El token entra en las dependencias del efecto. Para no recargar por un objeto nuevo con el mismo contenido, usar como dependencia `token?.accessToken` y `token?.source`, no el objeto.
- En `useMyIncidents` se mantiene el `isLoading` derivado de `requestKey`; la clave debe incluir el token para que un cambio de token cuente como petición nueva y el estado sin token no se quede cargando.
- Se conserva la bandera `isActive` por ejecución en todos los callbacks, incluidos los del caso sin token.

### 3. Pantallas

- `src/app/(tabs)/my-incidents.tsx`: `const { user, token, isRestoringSession } = useSession();` y pasar `token` a `useMyIncidents`.
- `src/app/incidents/[id].tsx`: leer `token` de `useSession()` y pasarlo a `useIncidentDetail`.

### 4. Tests (`src/__tests__/`), adaptando los de la #158

- Servicio (`services/incident.service.test.ts`):
  - GET del listado y del detalle con `Authorization: Bearer` y el `accessToken` recibido.
  - El GET de respaldo al mock no lleva `Authorization`.
  - Sesión mock: va directa al mock y no llama al backend.
  - Sin token: no hace ninguna petición y lanza el error de sesión.
  - 401: error de sesión caducada, sin mock.
  - 404 del detalle sigue sin caer al mock.
- Hooks (`hooks/use-my-incidents.test.ts`, `hooks/use-incident-detail.test.ts`):
  - Reenvía el token al servicio.
  - Sin token no llama al servicio, termina sin cargar y muestra el mensaje de sesión; `reload` sin token tampoco llama.
  - Al pasar de token `null` a válido en un rerender, carga sin llamar a `reload`.
  - Regresión de cierre de sesión con petición pendiente: petición en curso con token, rerender con token `null`, resolver o rechazar la promesa antigua; se mantiene el error de sesión y no vuelven los datos.
- Pantallas (`app/tabs/my-incidents-screen.test.tsx`, `app/tabs/my-incidents-focus-reload.test.tsx`, `app/incidents/incident-detail-screen.test.tsx`): el token de `useSession()` llega al hook.

### 5. Documentación

- Completar este documento (corrección aplicada, verificación y confirmación).
- `docs/spec/bugs/todo.md`: marcar como resuelta la entrada «Respuesta antigua restaura datos tras retirar el token — PR #158» y añadir la del token ausente en listado y detalle, enlazando este documento.
- `docs/spec/bugs/general/17-11-26-review-pr-158-token-y-fotos.md`: cerrar indicando que el punto 1 lo resolvió la #184 y el punto 2 la #193, y que el token se integró según este documento.
- Mencionar la issue #200 (fotos duplicadas al reintentar) como fallo conocido que se mergea con la #193.

## Subtareas de implementación

- [x] ST1 — Servicio con token (`src/services/incident.service.ts`) + `src/__tests__/services/incident.service.test.ts`. Los hooks se adaptan mínimamente en este paso solo si hace falta para que `tsc` compile.
- [x] ST2 — Hooks y pantallas (`use-my-incidents.ts`, `use-incident-detail.ts`, `(tabs)/my-incidents.tsx`, `incidents/[id].tsx`) + tests de hooks y de pantallas.
- [x] ST3 — Verificación: `pnpm expo lint`, `pnpm tsc --noEmit`, `pnpm test`.
- [x] ST4 — Documentación de cierre (sección 5), a cargo del organizador.

## Archivos tocados (previstos)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/services/incident.service.ts` | `AuthToken` en `fetchMyIncidents` y `fetchIncidentById`; Bearer, mock directo, sin token y 401 |
| modificar | `src/hooks/use-my-incidents.ts` | Recibir token, caso sin token, dependencias y `requestKey` |
| modificar | `src/hooks/use-incident-detail.ts` | Recibir token, caso sin token y dependencias |
| modificar | `src/app/(tabs)/my-incidents.tsx` | Pasar el token de la sesión |
| modificar | `src/app/incidents/[id].tsx` | Pasar el token de la sesión |
| modificar | `src/__tests__/services/incident.service.test.ts` | Casos del token en los dos GET |
| modificar | `src/__tests__/hooks/use-my-incidents.test.ts` | Casos del token y regresión de cierre de sesión |
| modificar | `src/__tests__/hooks/use-incident-detail.test.ts` | Casos del token y regresión de cierre de sesión |
| modificar | `src/__tests__/app/tabs/my-incidents-screen.test.tsx` | Token desde la sesión |
| modificar | `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` | Nueva firma del hook |
| modificar | `src/__tests__/app/incidents/incident-detail-screen.test.tsx` | Token desde la sesión |
| modificar | `docs/spec/bugs/todo.md` | Entradas del token |
| modificar | `docs/spec/bugs/general/17-11-26-review-pr-158-token-y-fotos.md` | Cierre del plan anterior |

## Fuera de alcance

- Fotos duplicadas al reintentar la subida: issue #200.
- Lógica interna del backend (política de CLAUDE.md).
- `db.json`: tiene una incidencia de prueba sin confirmar de la usuaria; no se toca ni se incluye en commits.
- Commits, push, editar la descripción de la #193 y cerrar la #158: solo cuando la usuaria lo pida.

## Verificación

- [x] Reproducir antes del cambio: test de servicio que espera `Authorization` en los dos GET falla con el código actual.
- [x] Aplicar la corrección.
- [x] Confirmar con los tests nuevos de servicio, hooks y pantallas.
- [x] `pnpm expo lint` y `pnpm tsc --noEmit` sin errores nuevos.
- [x] `pnpm test` en verde.
- [x] Prueba manual contra el backend de la PR #185 (2026-11-20): login, `POST /incidents` 201, `GET /incidents` 200 y `GET /incidents/:id` 200 sin ningún 401. Las fotos no se pudieron subir (503) porque el entorno local no tiene S3 configurado; se comentó en la PR #185 junto con `DB_SYNC` en Docker y `API_PORT=3001`.

## Corrección aplicada

- `src/services/incident.service.ts`: `fetchMyIncidents(civicId, token)` y `fetchIncidentById(id, token)` reciben `AuthToken | null`. Sesión mock va directa al mock; sin token lanza error de sesión sin petición (`QUERY_MISSING_TOKEN_MESSAGE`); token del backend envía `Authorization: Bearer`; 401 da sesión caducada (`QUERY_SESSION_EXPIRED_MESSAGE`) sin mock; sin conexión cae al mock sin cabecera; 404 del detalle sigue siendo `IncidentNotFoundError`.
- `src/hooks/use-my-incidents.ts` y `src/hooks/use-incident-detail.ts`: reciben el token, dependen de `token?.accessToken` y `token?.source`, `requestKey` incluye el token, sin token no llaman al servicio y muestran el mensaje de sesión; en el detalle `isLoading` pasa a derivarse de `settledRequestKey`. Se conserva `isActive` por ejecución.
- `src/app/(tabs)/my-incidents.tsx` e `src/app/incidents/[id].tsx`: leen `token` de `useSession()` y lo pasan al hook.
- Tests actualizados en servicio, hooks y pantallas (6 archivos).

## Confirmación

- Estado final: resuelto y verificado manualmente contra el backend de la PR #185.
- Fecha de revisión: 2026-11-20.
- Evidencia de que no reaparece: 8 tests nuevos del servicio fallaban antes del cambio (Bearer, mock directo, sin token y 401 en los dos GET); tras él, `pnpm expo lint` y `pnpm tsc --noEmit` exit 0 y `pnpm test` 62/62 suites, 797/797 tests. Los tests de regresión de cierre de sesión cubren la respuesta antigua.
- Limitaciones y pendientes: fotos duplicadas al reintentar (issue #200), fallo conocido que se mergea con la #193; la subida de fotos queda sin probar de punta a punta hasta tener S3 en local.
