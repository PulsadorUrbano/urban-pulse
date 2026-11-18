# 17-11-26 — Refactor: limpieza frontend-mobile · severidad media

- Feature afectada: independiente (auditoría transversal de todo `frontend-mobile/`).
- Rama: `refactor/182-limpieza-frontend-mobile`.
- Última actualización: 2026-11-17.
- Estado: Implementado y verificado (verificación manual en dispositivo/Expo Go confirmada por la usuaria el 2026-11-17, tras el repaso final).
- Ver repaso final: [17-11-26-limpieza-frontend-mobile-repaso-final.md](./17-11-26-limpieza-frontend-mobile-repaso-final.md).

## Motivo

Continuación del refactor de limpieza transversal iniciado en `17-11-26-limpieza-frontend-mobile-alta.md`. Este documento cubre los hallazgos de severidad **media**: inconsistencias de patrón (estilos, manejo de errores, validación, duplicación de UI) que no rompen nada hoy pero generan deuda técnica y divergencia entre archivos del mismo tipo. Se abordan después de los de severidad alta, una vez resuelta (o descartada) la decisión de convención de nombres de archivo.

## Alcance

- Alcance confirmado:
  1. **Estilos con `StyleSheet.create` en vez de NativeWind**: `src/app/(tabs)/index.tsx`, `src/app/login.tsx`, `src/app/register.tsx`, `src/components/category-picker.tsx`, `src/components/country-code-picker.tsx`, `src/components/app-tabs.web.tsx` usan hojas de estilo completas en vez de `className`, rompiendo la consistencia con el resto del proyecto.
  2. **Duplicación de traducción de errores de red/backend**: `src/services/http.ts` ya exporta `extractBackendErrorMessage`/`buildBackendRejectionMessage`, pero `incident.service.ts` y `category.service.ts` reimplementan copias propias casi idénticas; el patrón "timeout vs. error de conexión genérico" también está copiado con variaciones en `auth.service.ts`, `civic.service.ts`, `image.service.ts` (5-6 copias de la misma lógica).
  3. **Ausencia de Zod**: no hay dependencia `zod` ni se usa en ningún validador (`src/utils/incident-validator.ts`, `password-strength.ts`), pese a que `CLAUDE.md` lo recomienda explícitamente para validar inputs/payloads antes de llamar a la API.
  4. **Bloques JSX duplicados de aviso "fallback a mock"**: `login.tsx:88-113`, `register.tsx:117-142` y `register.tsx:144-169` repiten casi literalmente el mismo bloque.
  5. **Colores hardcoded sin token de tema**: `#d92d20` (error) y `#ffffff`/`#000000` (botón primario) se repiten de formas distintas (constante local vs. clase arbitraria Tailwind) en `login.tsx`, `register.tsx`, `(tabs)/my-incidents.tsx`, `incidents/[id].tsx`, `incidents/new.tsx`, sin vivir en `src/constants/theme.ts`.
  6. **`.map()` sin virtualizar para una lista dinámica real**: `src/components/category-picker.tsx:153` itera `categories` (proviene de backend/mock, no acotado) dentro de un `Modal` sin `FlatList`.
- Fuera de alcance: severidad alta (documento aparte, debe resolverse primero si toca los mismos archivos) y severidad baja (documento aparte); no se añade ninguna dependencia nueva sin pasar antes la revisión de seguridad de paquetes que exige `CLAUDE.md` (aplica a la incorporación de `zod`).
- Comportamiento preservado: ningún punto de este documento cambia el comportamiento visible de la UI; son cambios de implementación interna (estilos equivalentes, misma lógica de error con un único punto de verdad, mismo flujo de validación pero con Zod, mismo aviso visual pero componentizado, mismos colores pero centralizados, misma lista pero virtualizada).

## Archivos tocados (plan)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `(tabs)/index.tsx`, `login.tsx`, `register.tsx`, `category-picker.tsx`, `country-code-picker.tsx`, `app-tabs.web.tsx` | Sustituir `StyleSheet.create` por `className` de NativeWind. |
| Modificar | `src/services/incident.service.ts`, `category.service.ts` | Eliminar las copias propias de `extractBackendErrorMessage`/`buildBackendRejectionMessage`; importar de `http.ts`. |
| Modificar | `src/services/auth.service.ts`, `civic.service.ts`, `image.service.ts` | Sustituir el patrón inline "timeout vs. conexión" por un helper centralizado en `http.ts`. |
| Modificar | `package.json` | Añadir `zod` (tras revisión de seguridad del paquete, según exige `CLAUDE.md`). |
| Modificar | `src/utils/incident-validator.ts`, `src/utils/password-strength.ts` | Reescribir validaciones con esquemas Zod, conservando los mismos mensajes de error. |
| Crear | Componente nuevo en `src/components/` para el aviso de fallback a mock (nombre sujeto a la convención que se fije en el refactor de severidad alta) | Componente único reutilizable, sustituye los 3 bloques duplicados. |
| Modificar | `login.tsx`, `register.tsx` | Usar el componente nuevo en vez de los bloques duplicados. |
| Modificar | `src/constants/theme.ts` | Añadir tokens para el color de error y los colores del botón primario. |
| Modificar | `login.tsx`, `register.tsx`, `(tabs)/my-incidents.tsx`, `incidents/[id].tsx`, `incidents/new.tsx` | Sustituir los literales de color por los tokens nuevos. |
| Modificar | `src/components/category-picker.tsx` | Sustituir el `.map()` del listado de categorías por `FlatList`. |

## Verificación / pasos a seguir

Subtareas descompuestas por el `organizador`, agrupadas por archivo cuando varios puntos del alcance tocan el mismo archivo (para minimizar conflictos entre subtareas paralelas de `dev`). Notación: `(sin deps)` = puede empezar en paralelo con cualquier otra subtarea sin deps; `(depende de ST-XX)` = debe esperar a que esa subtarea esté verificada.

**Prerrequisitos de archivo compartido**

- [x] **ST-01 — tokens de color en `theme.ts`** *(sin deps)*: añadir a `src/constants/theme.ts` los tokens de error (`#d92d20`) y de botón primario (`#ffffff` fondo / `#000000` texto), como entradas nuevas en `Colors` (o constantes dedicadas si no dependen de light/dark, ya que estos 3 colores son fijos en ambos temas — documentarlo con un comentario en español). Prerrequisito de ST-03, ST-04, ST-05, ST-06, ST-07.
- [x] **ST-02 — componente `FallbackNoticeCard`** *(sin deps)*: crear `src/components/fallback-notice-card.tsx` (kebab-case, export `FallbackNoticeCard`) a partir del bloque ya existente en `login.tsx:88-113`. Props sugeridas: `message: string`, `buttonLabel: string`, `onPress: () => void`, manteniendo exactamente el mismo árbol de componentes (`ThemedView` contenedor + `ThemedView type="backgroundElement"` con el texto + `Pressable`/`View` del botón) y el mismo color de error (usar el token de ST-01, no un literal nuevo). Prerrequisito de ST-03 y ST-04.

**Pantallas (agrupan estilos + colores + componente de aviso del mismo archivo)**

- [x] **ST-03 — `login.tsx`** *(depende de ST-01, ST-02)*: convertir el `StyleSheet.create` final a `className` de NativeWind; sustituir los literales `#d92d20`/`#ffffff`/`#000000` por los tokens de ST-01; sustituir el bloque de aviso de fallback (líneas ~88-113) por `<FallbackNoticeCard />` de ST-02.
- [x] **ST-04 — `register.tsx`** *(depende de ST-01, ST-02)*: igual que ST-03, pero con **dos** bloques a sustituir por `FallbackNoticeCard` (el de `autoLoginFailedNotice` ~117-142 y el de `pendingFallbackRegister` ~144-169), cada uno con su `message`/`buttonLabel`/`onPress` propios.
- [x] **ST-05 — `(tabs)/my-incidents.tsx`** *(depende de ST-01)*: sustituir los 2 literales `#d92d20` por el token de error de ST-01. Ruta real: `src/app/(tabs)/my-incidents.tsx` (corregido respecto a la tabla "Archivos tocados", que no reflejaba el grupo `(tabs)`).
- [x] **ST-06 — `incidents/[id].tsx`** *(depende de ST-01)*: sustituir los 2 literales `#d92d20` por el token de error de ST-01.
- [x] **ST-07 — `incidents/new.tsx`** *(depende de ST-01)*: sustituir los 4 literales `#d92d20` y el par `#ffffff`/`#000000` del botón por los tokens de ST-01.

**Estilos sueltos (sin colores ni aviso de fallback involucrados)**

- [x] **ST-08 — `(tabs)/index.tsx`** *(sin deps)*: convertir su `StyleSheet.create` a `className`.
- [x] **ST-09 — `country-code-picker.tsx`** *(sin deps)*: convertir su `StyleSheet.create` a `className`.
- [x] **ST-10 — `app-tabs.web.tsx`** *(sin deps)*: convertir su `StyleSheet.create` a `className`.
- [x] **ST-11 — `category-picker.tsx`** *(sin deps)*: convertir su `StyleSheet.create` a `className` **y** sustituir el `.map()` de `categories` dentro del `Modal` (~línea 153) por `FlatList`, verificando que el modal sigue funcionando igual (scroll, selección, cierre). Nota aparte para `dev`: este archivo también tiene un `#d92d20` propio (línea ~293) fuera del alcance formal del punto 5 (no estaba en la lista de archivos de ese punto); si al tocar el archivo resulta trivial, se puede sustituir por el token de ST-01 también, pero no es bloqueante para dar esta subtarea por cerrada.

**Servicios — errores de red (independiente de lo anterior)**

- [x] **ST-12 — helper centralizado en `http.ts`** *(sin deps)*: añadir un helper parametrizado por mensajes de dominio (p. ej. `toDomainConnectionError(error, { timeoutMessage, genericMessage })`) que capture el patrón repetido "timeout (`RequestTimeoutError`) vs. conexión genérica" ya presente de forma inline en `auth.service.ts` (función local `toConnectionError`), `civic.service.ts` e `image.service.ts`. Prerrequisito de ST-14.
- [x] **ST-13 — `incident.service.ts` + `category.service.ts`** *(sin deps)*: eliminar las reimplementaciones locales de `extractBackendErrorMessage`/`buildBackendRejectionMessage`/`describeConnectionError`/`toConnectionError` y usar las que ya exporta `http.ts`.
- [x] **ST-14 — `auth.service.ts`, `civic.service.ts`, `image.service.ts`** *(depende de ST-12)*: sustituir el patrón inline "timeout vs. conexión" de cada archivo por el helper nuevo de ST-12, pasando el mensaje de dominio correspondiente (login/registro, ciudadano, imagen).

**Zod (independiente del resto, bloque propio)**

- [x] **ST-15 — revisión de seguridad + instalación de `zod`** *(sin deps)*: documentar brevemente la revisión exigida por `CLAUDE.md` (mantenedor, descargas/semana, fecha de última publicación, ausencia de script `postinstall` sospechoso) en la sección "Confirmación" de este documento; instalar con `pnpm expo install zod`. Prerrequisito de ST-16 y ST-17.
- [x] **ST-16 — `incident-validator.ts` a Zod** *(depende de ST-15)*: reescribir `validateIncidentInput` con un esquema Zod, conservando exactamente los mismos mensajes de error ya mostrados (título obligatorio/longitud mín-máx, categoría personalizada vacía); `getDescriptionQuality`/`getIncidentWarnings`/`hasValidationErrors` pueden quedar igual si no validan forma de payload, o adaptarse si aporta claridad sin cambiar el texto de los avisos.
- [x] **ST-17 — `password-strength.ts` a Zod** *(depende de ST-15)*: reescribir `getPasswordStrengthLevel` con Zod conservando la misma lógica (mínimo 8 caracteres + mayúscula + número = aceptable; + carácter especial = robusta). Para `isEmailFormatValid`, **no usar `z.string().email()`** (su validación difiere del regex actual `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) — usar `z.string().regex(...)` con el mismo regex para no cambiar qué correos se aceptan/rechazan hoy.

**Verificación transversal**

- [x] `pnpm expo lint` y `pnpm tsc --noEmit` sin errores nuevos tras cada subtarea.
- [x] `pnpm test` en verde tras cada subtarea; prestar especial atención a los tests de `login`/`register`/validación de incidencia tras ST-03, ST-04, ST-16 y ST-17 (mismos mensajes de error, mismo comportamiento del aviso de fallback).
- [x] Verificación visual/manual de que el modal de categorías (ST-11) y los 3 avisos de fallback (ST-03/ST-04) se ven y comportan igual que antes. Confirmada por la usuaria en dispositivo/Expo Go (2026-11-17).

### Orden recomendado para el coordinador (lotes paralelos)

- **Lote 1** (totalmente paralelo, sin dependencias entre sí): ST-01, ST-02, ST-08, ST-09, ST-10, ST-11, ST-12, ST-13, ST-15.
- **Lote 2** (tras cerrar sus dependencias del lote 1; paralelo entre sí porque no comparten archivo): ST-03, ST-04, ST-05, ST-06, ST-07, ST-14, ST-16, ST-17.

## Confirmación

- Estado final: Implementada y verificada. Las 17 subtareas (ST-01 a ST-17) y los 3 puntos de verificación transversal (lint/tsc, test, revisión de seguridad de zod) están cerrados.
- Fecha de revisión: 2026-11-17.
- Resultado entregado:
  - Veredicto final del `compiler`: PASA. `pnpm tsc --noEmit` con 0 errores; `pnpm expo lint` con 0 errores y 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx` (no son regresión de esta fase); `pnpm test` con 44 suites / 637 tests en verde, sin regresiones.
  - ST-01: tokens `Colors.light.error`/`Colors.dark.error` añadidos a `theme.ts`; el botón primario de `incidents/new.tsx` se mantuvo con `Colors.light.background`/`Colors.light.text` fijos (no se creó un token nuevo para él).
  - ST-02: componente `src/components/fallback-notice-card.tsx` creado, luego ajustado en un follow-up para usar los tokens reales de tema en vez de constantes locales.
  - ST-03/ST-04: `login.tsx` y `register.tsx` migrados a NativeWind, usando el token de error y `FallbackNoticeCard` (2 bloques en `register.tsx`).
  - ST-05/ST-06: `(tabs)/my-incidents.tsx` e `incidents/[id].tsx` con el color de error vía `ThemedText themeColor="error"`.
  - ST-07: `incidents/new.tsx` con el color de error vía `style={{ color: theme.error }}` (se respetó el patrón ya existente en ese archivo) y el botón primario fijo a `Colors.light`.
  - ST-08/ST-09/ST-10/ST-11: `(tabs)/index.tsx`, `country-code-picker.tsx`, `app-tabs.web.tsx` y `category-picker.tsx` migrados de `StyleSheet.create` a NativeWind; `category-picker.tsx` además con `FlatList` en vez de `.map()` en el modal de categorías, y con un follow-up pequeño para migrar también su token de color de error.
  - ST-12/ST-13/ST-14: helper `toConnectionErrorMessage` añadido a `http.ts` y enchufado en `incident.service.ts`, `category.service.ts`, `auth.service.ts`, `civic.service.ts`, `image.service.ts`; eliminadas las reimplementaciones locales de `extractBackendErrorMessage`/`buildBackendRejectionMessage` de `incident.service.ts`/`category.service.ts` (ahora importadas de `http.ts`); ST-13 se completó en un follow-up aprovechando el helper de ST-12.
  - ST-15: `zod` instalado con `pnpm expo install zod` tras revisión de seguridad: paquete mantenido por `colinhacks`, ~466M de descargas/semana en npm, sin scripts `postinstall` sospechosos ni reportes de vulnerabilidad/malware recientes conocidos.
  - ST-16/ST-17: `incident-validator.ts` y `password-strength.ts` migrados a esquemas Zod, conservando los mismos mensajes de error y el mismo comportamiento observable.
- Decisiones y desviaciones:
  - Se decidió **no tocar** `describeBackendRejection` de `category.service.ts`: no es equivalente byte a byte a `buildBackendRejectionMessage` de `http.ts`, y unificarla habría cambiado el formato del mensaje visible al usuario — fuera del alcance de "comportamiento preservado" de este documento.
  - `isEmailFormatValid` (ST-17) usa `z.string().regex(...)` con el regex original (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), explícitamente **no** `z.string().email()`, para no cambiar qué correos se aceptan/rechazan respecto al comportamiento previo.
  - Firma final del helper de errores de red: `toConnectionErrorMessage(error, timeoutMessage, connectionMessage)`, con parámetros posicionales (no un objeto de opciones como se sugería en ST-12). Los envoltorios de dominio (`toConnectionError`, `describeConnectionError`) se mantienen a propósito en los servicios, delegando en el helper.
  - Se añadieron 3 follow-ups pequeños no listados originalmente como subtareas propias, derivados de la revisión del `compiler`: colores reales de tema en `fallback-notice-card.tsx`, token de error en `category-picker.tsx`, y cierre de ST-13 apoyándose en el helper de ST-12.
- Limitaciones y pendientes:
  - Queda pendiente la verificación visual/manual en dispositivo/Expo Go real del modal de categorías (ST-11) y de los 3 avisos de fallback (ST-03/ST-04), no cubierta por el `compiler`.
  - Siguiente fase a implementar: severidad baja (`docs/spec/refactor/independent/17-11-26-limpieza-frontend-mobile-baja.md`).
