# 24-10-26 — Bug: la lista "Mis incidencias" no se actualiza tras crear una incidencia nueva

- Feature afectada: mis-incidencias (`docs/spec/features/24-10-26-mis-incidencias/`).
- Rama: feature/ver-mis-incidencias-frontend-mobile.
- Última actualización: 2026-10-24.
- Estado: Corregido con verificación pendiente.
- Origen: reporte de la usuaria ("cuando subo una incidencia, automáticamente no se me ve en la lista de mis incidencias").

## Síntoma observado

Tras registrar una incidencia nueva desde `src/app/incidents/new.tsx` y volver atrás, la pantalla "Mis incidencias" (`src/app/(tabs)/my-incidents.tsx`) no muestra la incidencia recién creada. El listado queda desactualizado (stale) hasta reiniciar la app o pulsar manualmente "Reintentar".

## Diagnóstico

- Archivo y línea donde está la causa real:
  - `src/hooks/use-my-incidents.ts`, líneas 32-75: el `useEffect` que dispara `fetchMyIncidents` solo depende de `[civicId, reloadToken]` (línea 75). Solo se reejecuta al montar el componente, si cambia `civicId`, o cuando se llama manualmente a `reload()` (líneas 79-83, que incrementa `reloadToken`).
  - `src/app/(tabs)/my-incidents.tsx`, líneas 13-19: la pantalla consume `useMyIncidents` directamente, sin ningún `useFocusEffect` ni lógica de refresco al reenfocar la pantalla.
- Causa: las tabs de Expo Router (`NativeTabs`, dentro del grupo `(tabs)`) no desmontan las pantallas al cambiar de tab. `incidents/new.tsx` se abre con `router.push('/incidents/new')` desde encima de las tabs — no reemplaza "Mis incidencias", que sigue montada en segundo plano. Al crear la incidencia y pulsar "Volver" (`router.back()`), "Mis incidencias" vuelve a quedar visible pero sigue siendo la misma instancia montada desde antes; su `useMyIncidents` nunca se reejecuta porque ni `civicId` ni `reloadToken` cambiaron.
- Alcance del fallo: aislado a la pantalla "Mis incidencias" al volver desde `incidents/new.tsx` (o desde cualquier otra pantalla empujada sobre las tabs que pueda alterar el listado). No afecta a `incidents/new.tsx` ni a `incidents/[id].tsx` en sí mismos.
- No es un fallo de backend: es puramente de ciclo de vida de componentes/navegación en el cliente.

## Corrección aplicada

En `src/app/(tabs)/my-incidents.tsx` se añade `useFocusEffect` (importado de `expo-router`) que llama a `reload()` (ya expuesto por `useMyIncidents`) cada vez que la pantalla recupera el foco. Como las tabs no desmontan "Mis incidencias" al navegar a `incidents/new.tsx` y volver, este efecto fuerza la recarga sin depender de un remount.

Para evitar una petición duplicada en el montaje inicial (la pantalla nace ya enfocada y el `useEffect` interno de `useMyIncidents` ya dispara su propia carga al montar), se usa un `useRef` (`hasFocusedOnceRef`) que ignora el primer disparo de `useFocusEffect` y solo llama a `reload()` en los reenfoques posteriores. No se tocó `src/hooks/use-my-incidents.ts`.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/app/(tabs)/my-incidents.tsx` | Añade `useFocusEffect` con guarda de primer foco (`hasFocusedOnceRef`) para forzar `reload()` al reenfocar la pantalla, sin duplicar la petición inicial. |

## Verificación

- [x] Reproducir el fallo antes del cambio y registrar el resultado: no se dispuso de dispositivo/emulador para ejecutar la app, por lo que la reproducción se razona por el flujo de montaje de las tabs descrito en "Diagnóstico": como `(tabs)` no desmonta "Mis incidencias" al empujar `incidents/new.tsx` encima, y antes del cambio la pantalla no tenía ningún `useFocusEffect` ni mecanismo de refresco al reenfocar, el `useEffect` de `useMyIncidents` (dependiente solo de `[civicId, reloadToken]`) nunca se reejecutaba al volver con "Volver"; por tanto, crear una incidencia desde `/incidents/new` y volver atrás dejaba el listado desactualizado hasta reintentar o reiniciar, consistente con el síntoma reportado.
- [x] Aplicar la corrección.
- [ ] Confirmar que el síntoma ya no ocurre: mismos pasos, la incidencia nueva aparece en el listado al volver, sin pasos manuales adicionales.
- [x] Confirmar que la carga inicial de la pantalla (primer montaje, con sesión ya resuelta) sigue disparando una sola petición, no dos. Cubierto por `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` (hook real, servicio mockeado: tras montaje + primer foco, `fetchMyIncidents` se llama 1 vez).
- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos. Veredicto del compiler: `npx tsc --noEmit` 0 errores; `npx expo lint` 0 errores (solo 2 warnings preexistentes no relacionados en `login-session-restore.test.tsx`); suite completa 34/34 suites, 455/455 tests, sin regresiones.
- [x] Tests del refresco por foco (cubrible sin fricción excesiva):
  - `src/__tests__/app/tabs/my-incidents-screen.test.tsx` (ampliado): el primer foco no llama a `reload`; un reenfoque posterior llama a `reload` una vez; varios reenfoques generan una llamada cada uno. `useFocusEffect` se mockea en el `expo-router` mock y el callback se invoca a mano. El caso de `Reintentar` ya existía y no se duplicó.
  - `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` (nuevo): hook `useMyIncidents` real con `fetchMyIncidents` mockeado. Cubre 1 petición en el montaje + primer foco, y una petición nueva por cada reenfoque posterior.
  - No cubierto: el flujo end-to-end real (crear incidencia en `incidents/new`, pulsar "Volver" y ver la incidencia en la lista). Requiere navegación real de Expo Router y dispositivo/emulador; sigue pendiente de verificación manual.

## Confirmación

- Estado final: Corregido con verificación pendiente (falta la confirmación end-to-end real de la usuaria en dispositivo).
- Fecha de revisión: 2026-10-24.
- Evidencia de que no reaparece: veredicto final del compiler ✅ PASA — `npx tsc --noEmit` con 0 errores; `npx expo lint` con 0 errores (solo 2 warnings preexistentes no relacionados en `login-session-restore.test.tsx`); suite completa 34/34 suites y 455/455 tests, sin regresiones. Específicamente, el comportamiento de la guarda anti-duplicado y la recarga en reenfoques sucesivos queda probado por `src/__tests__/app/tabs/my-incidents-screen.test.tsx` (ampliado: el primer foco no llama a `reload`, un reenfoque posterior llama a `reload` una vez, varios reenfoques generan una llamada cada uno) y por `src/__tests__/app/tabs/my-incidents-focus-reload.test.tsx` (nuevo: hook `useMyIncidents` real con `fetchMyIncidents` mockeado, confirma 1 petición en el montaje + primer foco y una petición nueva por cada reenfoque posterior).
- Limitaciones y pendientes: falta la confirmación end-to-end de la usuaria en dispositivo real (crear incidencia en `/incidents/new`, pulsar "Volver" y ver la incidencia en "Mis incidencias" sin pasos adicionales); no se ha podido probar en este entorno por falta de simulador/dispositivo.
