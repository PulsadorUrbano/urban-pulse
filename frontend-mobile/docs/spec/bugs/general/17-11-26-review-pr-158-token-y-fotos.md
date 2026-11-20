# 17-11-26 — Bug: respuesta antigua tras retirar el token y fotos descartadas sin aviso (PR #158)

- Feature afectada: general (detalle de incidencia, mis-incidencias y registro-incidencia).
- Rama: fix/token (PR #158).
- Última actualización: 2026-11-17.
- Estado: Cerrado (superado por #184 y #193).
- Origen: review de CodeJose21 en la PR #158 sobre `8e04475` (2026-11-17, "changes requested").
  Los puntos de Alewuito (lockfile de la web, nota de fotos en la descripción, issue asociada) ya
  están resueltos en la PR.

## Síntoma observado

1. **[P2] Datos restaurados sin sesión.** En "Mis incidencias" y en el detalle de una incidencia:
   petición en curso con token → el token pasa a `null` → se muestra "No se pudo identificar tu
   sesión" → llega la respuesta antigua → vuelven a aparecer los datos y desaparece el error,
   aunque sigue sin haber token.
2. **[P2] Fotos perdidas.** En `incidents/new`, con backend real disponible, la usuaria adjunta
   fotos, envía y ve la confirmación de éxito, pero las fotos no se han enviado y nadie se lo dice.

## Diagnóstico

1. - Archivos: `src/hooks/use-incident-detail.ts:59` y `src/hooks/use-my-incidents.ts:69` (en
     `fix/token`).
   - Causa: todas las ejecuciones del efecto comparten el mismo `isMountedRef`. Al cambiar
     `accessToken`, el cleanup lo pone a `false`, pero el nuevo efecto lo vuelve a poner a `true`
     inmediatamente, así que el `.then` de la petición anterior pasa el guard y sobrescribe el
     estado.
   - La PR #184 ya sustituye `isMountedRef` por una bandera local `isActive` por ejecución en
     ambos hooks, pero sin el parámetro `accessToken`. Al integrar las dos PRs hay que conservar
     ambas cosas: bandera local **y** guard de `accessToken`.
2. - Archivo: `src/services/incident.service.ts:214` (en `fix/token`).
   - Causa: el contrato actual del backend (`POST /incidents` en JSON, 2026-11-09) no acepta
     imágenes, así que el camino real omite `imageUris`; solo el fallback al mock las guarda.
   - No es un fallo de backend que haya que arreglar aquí: es una limitación conocida del
     contrato. El front debe avisar.

## Corrección propuesta

1. **Bandera local por ejecución** (mismo patrón que la PR #184, para que el conflicto de merge
   sea trivial):
   - En ambos hooks, eliminar `isMountedRef` y declarar `let isActive = true;` dentro del efecto;
     el cleanup hace `isActive = false`. Todos los callbacks (`then`, `catch`, `finally` y los
     microtasks de los guards de `civicId` / `accessToken`) comprueban `isActive`.
   - Mantener el guard `accessToken == null` y la dependencia `[..., accessToken, reloadToken]`.
2. **Confirmación antes de enviar sin fotos:**
   - Como el front no sabe de antemano si acabará en backend o en mock (real-first con fallback),
     la confirmación se muestra siempre que haya fotos seleccionadas: "Las fotos todavía no se
     pueden enviar al servidor y se descartarán. ¿Enviar la incidencia sin fotos?" con
     "Cancelar" / "Enviar sin fotos".
   - Ubicación: en `src/app/incidents/new.tsx`, en el mismo punto donde ya se pide
     "¿Enviar de todas formas?" (antes de lanzar el envío), sin tocar `incident.service.ts`.
   - Extra (barato): si el resultado es `source === 'backend'` y había fotos, mostrar en la
     confirmación de éxito un aviso "La incidencia se registró sin fotos".
   - El mock sigue guardando las fotos: no se borra esa lógica (política de CLAUDE.md).

**Dependencia con la PR #184:** el diálogo debe funcionar también en web, y `Alert.alert` no hace
nada en `react-native-web` (ver `bugs/registro-incidencia/17-11-26-envio-bloqueado-en-web-sin-ubicacion.md`).
Orden acordado (2026-11-17): arreglar y mergear primero #184 (que crea `confirm-action`), luego
rebasar `fix/token` sobre `dev`, resolver los conflictos de los dos hooks quedándose con
`isActive` + `accessToken`, y por último añadir la confirmación de fotos reutilizando el helper.

## Archivos tocados (previstos)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| modificar | `src/hooks/use-incident-detail.ts` | Bandera `isActive` por ejecución |
| modificar | `src/hooks/use-my-incidents.ts` | Bandera `isActive` por ejecución |
| modificar | `src/app/incidents/new.tsx` | Confirmación antes de enviar con fotos; aviso en el éxito si fue al backend |
| modificar | `src/__tests__/hooks/use-incident-detail.test.ts` | Secuencia token → null → respuesta antigua no restaura datos |
| modificar | `src/__tests__/hooks/use-my-incidents.test.ts` | Ídem |
| modificar | `src/__tests__/app/` (test de `incidents/new`) | Con fotos pide confirmación; cancelar no envía |
| modificar | `docs/spec/bugs/todo.md` | Entrada de ambos bugs |

## Verificación

- [x] Reproducir antes del cambio (punto 1): test con `fetchMyIncidents` / `fetchIncidentById`
  pendiente → `rerender` con `accessToken = null` → resolver la promesa antigua → hoy se
  restauran los datos y se borra el error.
- [x] Aplicar la corrección del punto 1.
- [x] Confirmar: tras resolver la promesa antigua se mantiene el error de sesión y la lista o el
  detalle siguen vacíos.
- [x] Aplicar la corrección del punto 2 y comprobar: con fotos, al pulsar enviar aparece la
  confirmación; con "Cancelar" no se llama a `submitIncident`; sin fotos no aparece.
- [x] `pnpm expo lint` y `pnpm tsc --noEmit` sin errores nuevos.
- [x] `pnpm test` en verde.
- [ ] Responder a la review en la PR #158 y pedir re-review a CodeJose21 y Alewuito.

## Confirmación

- Estado final: cerrado.
- Fecha de revisión: 2026-11-20.
- Punto 1 (respuesta antigua tras retirar el token): `isActive` por ejecución lo resolvió la PR #184; el token se integró en la #193 según `bugs/mis-incidencias/20-11-26-token-listado-y-detalle-en-pr-193.md`.
- Punto 2 (fotos descartadas sin aviso): lo resolvió la #193 subiendo las fotos por separado a `POST /incidents/:id/images` con reintento; la confirmación «enviar sin fotos» ya no se implementa.
- La PR #158 se cerrará indicando dónde quedó el arreglo, cuando la usuaria lo pida.
- Limitaciones y pendientes: fotos duplicadas al reintentar (issue #200).
