# 2026-11-01 — Plan de implementación: persistencia de sesión condicionada al origen de la conexión

> Crear únicamente este plan y su especificación. Copiar a frontend-mobile/docs/spec/features/DD-MM-YY-nombre-feature/plan.md.

- Objetivo: persistir en `expo-secure-store` la sesión de mock siempre, y la sesión de backend real solo cuando la bandera `BACKEND_USERS_DB_IS_EPHEMERAL` sea `false` (valor por defecto, sin regresión hoy).
- Arquitectura: una constante nueva en `src/constants/config.ts`, consumida dentro de `signIn()` (`src/hooks/use-session.ts`) para condicionar las llamadas ya existentes a `saveToken`/`saveSessionUser`/`clearToken`/`clearSessionUser`. No se crean servicios ni componentes nuevos.
- Herramientas: `expo-secure-store` (ya instalado); sin dependencias nuevas.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: pendiente de asignar.
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios); conservar contratos públicos y nombres exigidos por las dependencias.
- Mantener TypeScript estricto (cero `any`), estilos solo con NativeWind (`className`) y nunca lógica de negocio dentro de `src/app/` (solo pantallas y `_layout.tsx`).
- Cualquier dependencia nueva se instala con `pnpm expo install` (nunca npm/yarn/bun add) y requiere aprobación explícita previa. Esta feature no añade ninguna.
- Backend y mock: real-first con fallback a mock, mostrando un aviso claro en pantalla si no hay conexión. Nunca borrar lógica o simulación mock que el backend aún no cubra de forma estable. No depurar ni arreglar el backend.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`, nunca dentro de `src/app/`. No crear ni ejecutar e2e/integración salvo solicitud explícita.
- Preservar cambios ajenos y la rama acordada. No crear commits ni hacer push salvo petición explícita.
- Restricciones particulares: el valor por defecto de `BACKEND_USERS_DB_IS_EPHEMERAL` debe ser `false` (no cambia el comportamiento actual); solo debe activarse explícitamente vía `EXPO_PUBLIC_BACKEND_DB_EPHEMERAL=true` en `.env`.

## Focos de revisión

- Tipos incorrectos: la bandera debe resolverse a `boolean` estricto, nunca `string` residual de `process.env`.
- Límites: ausencia total de la variable de entorno debe comportarse igual que `'false'` (default seguro).
- Aislamiento: un fallo al limpiar (`clearToken`/`clearSessionUser`) cuando la bandera está activa no debe romper el flujo de `signIn` (mismo patrón `try/catch` no relanzante ya usado en `signOut`).
- Fallos parciales: el estado en memoria (`setUser`/`setToken`) debe quedar poblado en todos los casos, incluso cuando no se persiste nada en disco.

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | frontend-mobile/src/constants/config.ts | Añadir `BACKEND_USERS_DB_IS_EPHEMERAL`, resuelta desde `EXPO_PUBLIC_BACKEND_DB_EPHEMERAL`, default `false`. |
| Modificar | frontend-mobile/src/hooks/use-session.ts | Condicionar `saveToken`/`saveSessionUser` a `source === 'mock' || !BACKEND_USERS_DB_IS_EPHEMERAL`; llamar a `clearToken`/`clearSessionUser` en el caso contrario. |
| Modificar | frontend-mobile/.env.example | Documentar la variable nueva (vacía/comentada, igual que `EXPO_PUBLIC_BACKEND_URL`). |
| Actualizar | frontend-mobile/src/__tests__/constants/config.test.ts | Casos para `BACKEND_USERS_DB_IS_EPHEMERAL` (ausente, `'true'`, otro valor). |
| Actualizar | frontend-mobile/src/__tests__/hooks/use-session.test.ts | Casos de los 3 criterios de aceptación de la especificación. |
| Actualizar | frontend-mobile/docs/spec/features/01-11-26-persistencia-sesion-segun-origen-conexion/spec.md y este plan.md | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

## Preparación

- [ ] Leer CLAUDE.md, la especificación, los archivos afectados y el estado de Git.
- [ ] Confirmar que no existe ya ninguna variable `EXPO_PUBLIC_BACKEND_DB_EPHEMERAL` en uso antes de añadirla.
- [ ] Registrar el estado inicial de `pnpm test -- src/__tests__/hooks/use-session.test.ts` y `src/__tests__/constants/config.test.ts` antes de tocar nada.

## Tarea 1: condicionar la persistencia de sesión por origen y bandera de entorno

**Archivos:** `src/constants/config.ts`, `src/hooks/use-session.ts`, `src/__tests__/constants/config.test.ts`, `src/__tests__/hooks/use-session.test.ts`, `.env.example`.

**Interfaces:** `BACKEND_USERS_DB_IS_EPHEMERAL: boolean` (nueva constante exportada de `config.ts`); `signIn(user: User, token: AuthToken | null): Promise<void>` conserva su firma.

**Criterios cubiertos:** 1, 2, 3, 4, 5 de la especificación.

- [ ] Definir los casos unitarios de `config.test.ts`: variable ausente → `false`; `'true'` → `true`; cualquier otro string → `false`.
- [ ] Definir los casos unitarios de `use-session.test.ts`: mock siempre persiste; backend + bandera `false` persiste (sin regresión); backend + bandera `true` no persiste y limpia lo anterior.
- [ ] Ejecutar esos tests antes del cambio y registrar que fallan por ausencia de la constante/condición (TDD).
- [ ] Implementar el cambio mínimo en `config.ts` y `use-session.ts` descrito en el "Diseño mínimo" de la especificación.
- [ ] Documentar la variable nueva en `.env.example` (sin valor, como las demás `EXPO_PUBLIC_*`).
- [ ] Ejecutar `pnpm test -- src/__tests__/constants/config.test.ts src/__tests__/hooks/use-session.test.ts` y registrar el resultado real.
- [ ] Revisar el diff y actualizar la especificación y este plan si algo se desvió.

## Comprobaciones finales

Ejecutar desde frontend-mobile/.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | `pnpm test` | Pendiente |
| Typecheck | `pnpm tsc --noEmit` | Pendiente |
| Lint | `pnpm expo lint` | Pendiente |
| Diff, desde la raíz | `git diff --check` | Pendiente |

- [ ] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [ ] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan.
- [ ] Confirmar que no se tocaron archivos ajenos al alcance.

## Confirmación de implementación

- Estado final: Pendiente.
- Fecha de revisión: pendiente.
- Resultado entregado: pendiente (esta tarea solo documenta el spec+plan en borrador; la implementación queda para quien retome esta feature).

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1-5 | pendiente de implementación | Pendiente |

- Comprobaciones: no aplicable todavía; esta tarea es puramente documental.
- Decisiones y desviaciones: ninguna respecto a la especificación.
- Limitaciones y pendientes: queda pendiente decidir quién y cuándo implementa esta feature; el valor por defecto de la bandera (`false`) fue confirmado por la usuaria el 2026-11-01 a partir de la verificación del volumen persistente de Postgres en `docker-compose.yml`.
