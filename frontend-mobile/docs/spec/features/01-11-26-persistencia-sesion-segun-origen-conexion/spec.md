# 2026-11-01 — Especificación: persistencia de sesión condicionada al origen de la conexión

- Desarrollador responsable: pendiente de indicar.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Sonnet 5 (claude-sonnet-5).

- Rama: pendiente de asignar.
- Última actualización: 2026-11-01.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: idea propuesta por la usuaria al probar el prototipo contra el backend real. Amplía directamente [la persistencia de sesión ya implementada](../23-10-26-persistencia-sesion-frontend-mobile/spec.md) y reutiliza el discriminante `source` introducido en [el refactor real-first/fallback a mock](../../refactor/independent/26-10-26-auth-real-first-fallback-mock.md).

## Objetivo y decisiones vigentes

Hoy `signIn()` (`src/hooks/use-session.ts`) persiste siempre el usuario y el token en `expo-secure-store`, sin mirar si la autenticación vino del backend real o del mock. La idea: cuando el usuario se autenticó contra el **mock**, persistir siempre (es local y estable, como hoy). Cuando se autenticó contra el **backend real**, persistir solo si el entorno activo considera duradera la base de datos de usuarios; si la trata como efímera, no persistir, para no dejar en disco una sesión de un usuario que podría haber desaparecido tras un reinicio del backend.

- Alcance confirmado:
  - `signIn()` sigue guardando siempre en memoria (`setUser`/`setToken`), como hoy.
  - La escritura a `expo-secure-store` (`saveToken`/`saveSessionUser`) se condiciona a `source === 'mock' || !BACKEND_USERS_DB_IS_EPHEMERAL`.
  - Se introduce una constante de configuración nueva en `src/constants/config.ts`, resuelta desde una variable de entorno, para poder cambiar ese comportamiento sin tocar código.
- Decisiones confirmadas:
  - **Valor por defecto de la bandera: `false` (base de datos no efímera)**, porque se verificó que `docker-compose.yml` (raíz del repo) define un volumen nombrado `pgdata:/var/lib/postgresql/data` para el servicio `database` — los datos de usuarios sobreviven a un reinicio normal del contenedor. Solo el dominio de incidencias es in-memory/efímero por diseño (`backend/AGENTS.md`); usuarios/auth usa Postgres real. Con el valor por defecto en `false`, el comportamiento actual (siempre persiste) **no cambia** hoy.
  - El frontend no puede comprobar en runtime si el volumen de Postgres sigue vivo; por eso la condición es una **bandera de configuración local**, no una deducción automática a partir de una respuesta del backend.
  - Cuando la condición es falsa (bandera en `true`, sesión de backend real tratada como efímera), no se llama a `saveToken`/`saveSessionUser`, y además se limpia explícitamente cualquier sesión de backend persistida previamente (con `clearToken`/`clearSessionUser`), para no dejar en disco una sesión persistida con una configuración anterior.
  - El mock siempre persiste, sin excepción: `source === 'mock'` nunca depende de la bandera.
- Suposiciones por validar: ninguna; el valor por defecto de la bandera (`false`) fue confirmado explícitamente por la usuaria tras verificar que la base de datos de usuarios es persistente hoy.
- Fuera de alcance:
  - Tocar el backend o el camino mock.
  - Crear cualquier endpoint o mecanismo para que el frontend "pregunte" al backend si su base de datos es efímera.
  - Expiración o caducidad de sesión/token (sigue fuera de alcance, igual que en la feature original de persistencia).
  - Cambiar el comportamiento de restauración al arrancar la app (`useEffect` de `SessionProvider`): si nunca se persistió, nunca habrá nada que restaurar; no se añade lógica nueva ahí.

## Contexto verificado

- Implementación actual:
  - `src/hooks/use-session.ts`, función `signIn` (líneas 84-102): hace `setUser(sessionUser)`/`setToken(authToken)` (líneas 86-87) y luego, sin condición, `saveToken(authToken)` si `authToken != null` (líneas 89-95) y `saveSessionUser(sessionUser)` siempre (líneas 97-101).
  - `src/types/user.ts`: `MockUser` (líneas 21-25) y `BackendUser` (líneas 30-33) son una unión discriminada por `source: 'mock' | 'backend'` (`User`, línea 35); `SessionUser` (línea 41) conserva ese discriminante. El dato llega intacto hasta el punto exacto donde se persiste.
  - `src/services/session-user-storage.service.ts` y `src/services/token-storage.service.ts`: ya usan `expo-secure-store` (claves `urbanpulse.auth.user` y `urbanpulse.auth.token`) y ya reconstruyen el objeto campo a campo al leer (nunca spread); no necesitan cambios de forma, solo dejar de llamarse condicionalmente desde `signIn`.
  - `src/constants/config.ts`: hoy solo resuelve `API_BASE_URL` y `BACKEND_API_URL` a partir de `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_BACKEND_URL` y el host de Metro; no existe ninguna bandera de persistencia.
- Contratos y referencias del dominio: no aplica contrato de backend/mock nuevo (ver "Contrato de datos"); se reutiliza el `source` que ya devuelven `POST /auth/login` y `POST /auth/register` vía `src/services/auth.service.ts`.
- Configuración y dependencias disponibles: `expo-secure-store` (ya instalado y en uso); no se añade ninguna dependencia nueva.
- Diferencia entre estado actual y propuesto: hoy toda sesión exitosa se persiste igual, sin mirar su origen. Tras esta feature, la persistencia en disco de una sesión de backend real queda condicionada a una bandera de configuración (por defecto `false`, sin cambio de comportamiento observable hoy); la sesión de mock sigue persistiendo siempre.

## Contrato de datos (backend real + mock)

Esta feature no consume ni simula ningún endpoint nuevo. Reutiliza el discriminante `source: 'mock' | 'backend'` que ya devuelven `POST /auth/login` y `POST /auth/register` (vía `src/services/auth.service.ts`), sin añadir ninguna llamada de red. No aplica, por tanto, ninguna de las subsecciones de "Backend real" ni "Mock".

## Contrato de UI y navegación

- Pantallas/rutas afectadas en `src/app/`: ninguna directamente. El cambio vive en `src/hooks/use-session.ts` (fuera de `src/app/`); ninguna pantalla cambia su comportamiento observable salvo el propio efecto de no-persistencia (que solo se nota al cerrar y reabrir la app del todo).
- Componentes nuevos vs. reutilizados: no se crea ningún componente ni pantalla nueva.
- Estados explícitos de carga/error: no aplica; no hay ninguna interacción de usuario nueva que pueda duplicarse o fallar visiblemente.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `User` / `SessionUser` (reutilizados, `src/types/user.ts`) | sin cambios; se sigue usando `source: 'mock' \| 'backend'` ya existente | No se añade ningún campo nuevo a ningún tipo. |

No se introduce ninguna entidad ni campo nuevo en `db.json`: esta feature no toca el servidor mock.

- Estrategia de medios: no aplica.
- Almacenamiento de esta fase: se sigue usando exclusivamente `expo-secure-store` ya existente (`session-user-storage.service.ts`, `token-storage.service.ts`); no se añade ningún almacenamiento nuevo, solo se condiciona cuándo se llama a los servicios ya existentes.
- Ciclo de vida: sin cambios respecto a la feature original de persistencia, salvo que una sesión de backend real con la bandera activa nunca llega a escribirse en `expo-secure-store` (vive solo en memoria durante esa apertura de la app).

## Diseño mínimo

- **`src/constants/config.ts`**: añadir una constante nueva, p. ej. `BACKEND_USERS_DB_IS_EPHEMERAL`, resuelta desde `process.env.EXPO_PUBLIC_BACKEND_DB_EPHEMERAL` (análogo al patrón ya usado para `EXPO_PUBLIC_BACKEND_URL`/`EXPO_PUBLIC_API_URL` en el mismo archivo), con **valor por defecto `false`** si la variable no está definida o no vale exactamente `'true'`. Comentario explicando el motivo (volumen `pgdata` persistente hoy en `docker-compose.yml`; revisar este valor si el entorno de despliegue cambia).
- **`src/hooks/use-session.ts`**, dentro de `signIn()`: envolver las llamadas a `saveToken`/`saveSessionUser` (líneas 89-101 actuales) en la condición `sessionUser.source === 'mock' || !BACKEND_USERS_DB_IS_EPHEMERAL`. Cuando la condición es falsa, no se llama a ninguno de los dos `save*`, y se llama en su lugar a `clearToken()`/`clearSessionUser()` (mismo patrón defensivo `try/catch` ya usado en `signOut`) para no dejar restos de una sesión persistida con una configuración anterior de la bandera. El estado en memoria (`setUser`/`setToken`, líneas 86-87) no cambia: la sesión sigue activa mientras la app esté abierta.
- No se añaden capas especulativas: no hay validación de formulario nueva ni listas dinámicas implicadas.

## Criterios de aceptación

1. `source === 'mock'` → `saveToken`/`saveSessionUser` se llaman igual que hoy, sin importar el valor de la bandera.
2. `source === 'backend'` y `BACKEND_USERS_DB_IS_EPHEMERAL === false` (valor por defecto actual) → `saveToken`/`saveSessionUser` se llaman igual que hoy; sin regresión observable.
3. `source === 'backend'` y `BACKEND_USERS_DB_IS_EPHEMERAL === true` (forzado en test) → no se llama a `saveToken` ni `saveSessionUser`; se llama a `clearToken`/`clearSessionUser`; el usuario sigue autenticado en memoria (`setUser`/`setToken` sí se ejecutan) durante esa apertura de la app.
4. La bandera se resuelve desde una variable de entorno (`EXPO_PUBLIC_BACKEND_DB_EPHEMERAL`) sin tocar código para cambiar su valor.
5. La restauración de sesión al abrir la app (`useEffect` de `SessionProvider`) no cambia: si nunca se persistió (caso 3), no hay nada que restaurar y la app muestra el login con normalidad, sin error.

## Estrategia de verificación

- `src/__tests__/constants/config.test.ts` (existente, se amplía): casos para `BACKEND_USERS_DB_IS_EPHEMERAL` con la variable de entorno ausente, `'true'` y cualquier otro valor, igual que ya se testea `BACKEND_API_URL`.
- `src/__tests__/hooks/use-session.test.ts` (existente, se amplía): las tres combinaciones de `source` × bandera de los criterios 1-3, con dobles de `saveToken`/`saveSessionUser`/`clearToken`/`clearSessionUser` para comprobar qué se llama y qué no en cada caso.

Tests bajo `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No se crean ni ejecutan e2e/integración. Esta feature no implica ninguna llamada de red real ni simulada.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
