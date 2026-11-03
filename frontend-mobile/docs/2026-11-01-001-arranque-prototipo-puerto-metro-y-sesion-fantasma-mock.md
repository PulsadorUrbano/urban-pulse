# Sesión — 2026-11-01 · Arranque del prototipo: puerto del backend, Metro/pnpm y sesión fantasma del mock

## Contexto

Preparación del prototipo para la demo del martes: se sincronizaron todas las ramas remotas a local,
se verificó y corrigió el arranque conjunto de `frontend-mobile` + backend vía `docker compose`, y se
investigó/corrigió un bug real de sesión al probar el flujo de login contra el backend real. Rama de
trabajo: `fix/puerto-backend-movil` (PR [#116](https://github.com/PulsadorUrbano/urban-pulse/pull/116)
hacia `dev`).

## Alcance

1. **Git**: traídas a local todas las ramas remotas actualizadas (`dev`, `main`, `feature/token`,
   `docs/creacion-adr`, `docs/modularizar-documentacion`, `feature/asignar-tecnico-flow`,
   `feature/incident-cycle-backend`, `fix-resolve-backend-conflicts`, `fix/unificar-login`).
2. **Puerto del backend desalineado**: `frontend-mobile/src/constants/config.ts` tenía
   `BACKEND_SERVER_PORT = 4000` hardcodeado, pero `docker-compose.yml` fija siempre `PORT: 3000` /
   `"3000:3000"`. Corregido a `3000` para que coincida con el puerto real del backend en Docker,
   dejando `EXPO_PUBLIC_BACKEND_URL` vacío en `.env` (la IP LAN se sigue autodetectando vía el host
   de Metro, solo cambia el puerto fijo).
3. **Metro no resolvía `react-native-css-interop/jsx-runtime`**: pnpm con linker `isolated` (el
   symlinked store por defecto) no sigue bien la cadena de `node_modules` anidados que necesita
   Metro para esa dependencia transitiva de `nativewind`. Corregido añadiendo `nodeLinker: hoisted`
   en `frontend-mobile/pnpm-workspace.yaml` y reinstalando `node_modules` (layout plano tipo
   npm/yarn clásico, recomendado por Expo para proyectos con pnpm).
4. **Expo Go: "Cannot find native module 'ExpoAsset'"**: diagnosticado como estado cacheado del
   cliente (Expo Go no se había cerrado del todo tras el cambio de node_modules), no un problema de
   código ni de dependencias. Resuelto cerrando la app del todo y reabriéndola.
5. **Bug real encontrado y corregido — "sesión fantasma" del mock**: al restaurar la sesión al abrir
   la app, si la sesión persistida era del **mock**, nunca se comprobaba si el backend real estaba
   disponible — se restauraba a ciegas una identidad simulada que el backend real nunca ha visto.
   Corregido en `frontend-mobile/src/hooks/use-session.ts`: si el token restaurado es de origen
   mock, se consulta `/auth/me`; si el backend real responde (válido o 401, dado que el token del
   mock no es un JWT real), la sesión mock se descarta y se pide login de nuevo; si el backend sigue
   sin alcanzarse, se restaura igual que antes.
6. **Issue de GitHub abierta** (no implementado, solo reportado):
   [#117](https://github.com/PulsadorUrbano/urban-pulse/issues/117) — el `409` de registro
   duplicado no indica qué campo colisionó (username/email/teléfono); la validación de duplicados en
   sí ya está implementada y testeada de punta a punta. Etiquetada `enhancement`, asignada a
   `@CodeJose21` y `@AdriUMA`.
7. **Spec + plan en borrador** (documentado, no implementado): persistencia de sesión condicionada
   al origen de la conexión, en
   `frontend-mobile/docs/spec/features/01-11-26-persistencia-sesion-segun-origen-conexion/`. Se
   confirmó que la base de datos de usuarios ya es persistente (volumen `pgdata` de Postgres en
   `docker-compose.yml`), así que el valor por defecto de la bandera nueva no cambia el
   comportamiento actual. Queda explícitamente como mejora de baja prioridad, no urgente.

## Decisiones clave

- El puerto del backend se corrige en código (`config.ts`), no en `.env`: una IP fija en `.env` se
  rompe al cambiar de red; la constante corregida combinada con la autodetección de host ya
  existente funciona en cualquier red sin tocar nada.
- Se prefirió `nodeLinker: hoisted` (cambio de configuración de pnpm) sobre `public-hoist-pattern`
  (que no surtió efecto en pruebas) o sobre no tocar pnpm en absoluto: es la solución documentada
  oficialmente por Expo para este tipo de fallo de resolución con pnpm.
- La detección de "sesión mock fantasma" reutiliza `validateBackendSession()` ya existente (mismo
  endpoint `/auth/me`), sin crear ningún endpoint ni servicio nuevo: se interpreta cualquier
  respuesta del backend (incluido un 401 por token inválido) como "el backend está disponible".
- La mejora de persistencia condicionada (ítem 7) se documenta pero no se implementa: se considera
  de baja prioridad mientras la base de datos de usuarios siga siendo persistente en el entorno real.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `src/constants/config.ts` | Modificado: `BACKEND_SERVER_PORT` de `4000` a `3000`. |
| `src/__tests__/constants/config.test.ts` | Modificado: 10 literales de test actualizados de `4000` a `3000`. |
| `pnpm-workspace.yaml` | Modificado: añadido `nodeLinker: hoisted`. |
| `src/hooks/use-session.ts` | Modificado: nueva rama de restauración para sesiones de origen mock, que las descarta si el backend real responde. |
| `src/__tests__/hooks/use-session.test.ts` | Modificado/ampliado: 1 test ajustado + 3 tests nuevos para el descarte de sesión mock. |
| `src/__tests__/app/login-session-restore.test.tsx` | Modificado: mock de `validateBackendSession` ajustado a `'unknown'` para no activar el nuevo descarte en estos tests de integración de pantalla. |
| `docs/spec/features/01-11-26-persistencia-sesion-segun-origen-conexion/spec.md` | Nuevo: borrador de especificación, sin implementar. |
| `docs/spec/features/01-11-26-persistencia-sesion-segun-origen-conexion/plan.md` | Nuevo: borrador de plan, sin implementar. |
| `.env` (no versionado) | Modificado localmente: `EXPO_PUBLIC_BACKEND_URL` vacío (autodetección de host). |

## Checklist de la sesión

- [x] Sincronizar todas las ramas remotas a local.
- [x] Diagnosticar y corregir el desajuste de puerto del backend en el móvil.
- [x] Diagnosticar y corregir la resolución de `react-native-css-interop` con pnpm.
- [x] Diagnosticar el error de Expo Go (sin cambio de código; causa ambiental).
- [x] Diagnosticar, corregir y testear el bug de sesión fantasma del mock.
- [x] Abrir issue de GitHub para la granularidad del 409 de duplicados.
- [x] Documentar borrador de persistencia de sesión condicionada.
- [x] Comprobaciones finales (`pnpm test`, `pnpm tsc --noEmit`, `pnpm expo lint`).
- [x] Commits atómicos y push a `fix/puerto-backend-movil` (PR #116).

## Estado / Verificación

- `pnpm test` (suite completa) — 615/615 tests verdes, 43/43 suites, sin regresiones.
- `pnpm tsc --noEmit` — 0 errores.
- `pnpm expo lint` — 0 errores, solo los 2 warnings preexistentes y ajenos ya conocidos en
  `src/__tests__/app/login-session-restore.test.tsx`.
- 4 commits en `fix/puerto-backend-movil`, todos empujados: corrección de puerto, `nodeLinker`
  hoisted, fix de sesión fantasma del mock, y documentación del borrador de persistencia.

## Pendiente / diferido

- [ ] Confirmación end-to-end manual en dispositivo físico de los tres arreglos combinados
  (puerto, Metro/pnpm, sesión fantasma) contra `docker compose up` real antes de la demo del martes.
- [ ] Decidir si se implementa el gap de granularidad del 409 de duplicados (issue #117) — pendiente
  de respuesta de `@CodeJose21`/`@AdriUMA`.
- [ ] Persistencia de sesión condicionada al origen (spec en borrador): sin implementar a propósito;
  baja prioridad mientras la base de datos de usuarios siga siendo persistente en el entorno real.
- Fuera de alcance de esta sesión: cualquier cambio en el backend real o en `frontend-web`.
