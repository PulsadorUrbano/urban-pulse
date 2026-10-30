# Bugs que se deben arreglar

---
**PLANTILLA**
**No se debe eliminar este párrafo. Debe servir como guía permanente para no alucinar y plantear otra estructura**

## Nombre Feature

> La fecha a la derecha del asunto será la fecha en la que se registró el bug a arreglar

- [] ASUNTO (DD-MM-YY): DESCRIPCIÓN *(No debe ser excesivamente larga, suficiente para que se entienda qué falla)*
---

## Registro incidencia

- [x] ~~Pantalla desplazada hacia arriba al crear incidencia (23-10-26)~~: sustituido por la entrada genérica en "## General" (24-10-26), porque el mismo síntoma se confirmó también en otras pantallas (no es exclusivo de `incidents/new.tsx`). `incidents/new.tsx` queda listado ahí como una de las pantallas afectadas; en esta sección se retira para no duplicar.
- [] Límite de imágenes desalineado entre UI, envío y backend — issue #91 (12-10-26): el picker deja seleccionar hasta 8 fotos (`MAX_SELECTED_PHOTOS` en `src/hooks/use-photo-attachment.ts`) y el backend acepta hasta 8 (`FilesInterceptor('images', 8, ...)` en `backend/src/incidents/incidents.controller.ts`), pero `createIncident` solo envía las 5 primeras (`MAX_INCIDENT_IMAGES` en `src/services/incident.service.ts`): si el usuario selecciona más de 5, el resto se descarta sin ningún aviso. Migrado desde `docs/old/spec/features/001-registro-incidencia/plan.md`; sigue así en el código actual.
- [] Padding desequilibrado y poco espacio en el control de categoría seleccionada (12-10-26): en `src/components/category-picker.tsx` (estilo `trigger`), el lado derecho junto al "×" tiene menos padding que el izquierdo (`paddingRight` vs `paddingLeft` distintos), y el nombre de la categoría queda muy junto al símbolo "×". Migrado desde `docs/old/docs/2026-10-12-001-categoria-ui.md` y `docs/old/spec/features/001-registro-incidencia/tasks.md`/`spec.md`; confirmado que el padding asimétrico sigue igual en el código actual.
- [] Categoría personalizada sin límite de caracteres (12-10-26): al escribir una categoría propia vía "Otros" en `src/components/category-picker.tsx`, el `TextInput` no tiene `maxLength`, pese a que estaba previsto limitarla a 15 caracteres. Migrado desde `docs/old/spec/features/001-registro-incidencia/tasks.md`; confirmado que no hay `maxLength` en el componente actual.

## General

> Bugs no atados a una feature concreta porque afectan a varias pantallas a la vez (análogo a `refactor/independent/`).

- [x] ~~UI desplazada hacia arriba, contenido superior oculto salvo scroll manual (24-10-26)~~: corregido con `enableLegacyHeaderAppearance()` en `src/app/_layout.tsx` (causa raíz: header nativo translúcido/absoluto por defecto en iOS 26+ con Liquid Glass en `incidents/new.tsx` e `incidents/[id].tsx`). Verificado por código/tests/lint/typecheck, ver `bugs/general/24-10-26-ui-desplazada-hacia-arriba.md`. Pendiente: confirmación visual de la usuaria en dispositivo iOS real, y `src/app/(tabs)/my-incidents.tsx` sigue sin diagnosticar (no tiene header nativo, no se encontró causa de código ahí; a reproducir si el síntoma persiste tras este fix).

## Login

- [] Salto de scroll al cambiar de campo con el teclado abierto (15-10-26): con el teclado activo, al pasar de introducir usuario a contraseña, o al mostrar/ocultar la contraseña, la pantalla hace un desplazamiento brusco e involuntario hacia arriba de unos 0.2s. Migrado desde `docs/old/spec/bugs/002-inicioSesion.md` (sesión antigua); quedó registrado pero nunca se llegó a arreglar.
- [] Salto de línea brusco en el saludo con efecto typewriter (15-10-26): `TypewriterText` (`src/components/typewriter-text.tsx`) revela el texto carácter a carácter sin saltos de línea predefinidos; si la frase es demasiado larga para caber en horizontal, el salto de línea ocurre en vivo de forma brusca en vez de estar ya definido de antemano. Migrado desde `docs/old/spec/features/002-gestion-sesion/tasks.md` ("Notas de futuro"); sigue sin implementarse en el componente actual.