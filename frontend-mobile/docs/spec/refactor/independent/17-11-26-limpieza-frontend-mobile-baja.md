# 17-11-26 — Refactor: limpieza frontend-mobile · severidad baja

- Feature afectada: independiente (auditoría transversal de todo `frontend-mobile/`).
- Rama: `refactor/182-limpieza-frontend-mobile`.
- Última actualización: 2026-11-17.
- Estado: Implementado y verificado (verificación manual en dispositivo/Expo Go confirmada por la usuaria el 2026-11-17, tras el repaso final).
- Ver repaso final: [17-11-26-limpieza-frontend-mobile-repaso-final.md](./17-11-26-limpieza-frontend-mobile-repaso-final.md).

## Motivo

Última fase del refactor de limpieza transversal (ver también `17-11-26-limpieza-frontend-mobile-alta.md` y `17-11-26-limpieza-frontend-mobile-media.md`). Cubre hallazgos de bajo impacto: restos de plantilla, detalles de higiene de código, huecos de cobertura de tests y un detalle de formato en la documentación. No bloquean nada, pero conviene cerrarlos para dejar el árbol limpio.

## Alcance

- Alcance confirmado:
  1. **`.map()` sin `FlatList` en lista estática pequeña**: `src/components/country-code-picker.tsx:63-74` itera los 3 países de `src/constants/countries.ts`; riesgo real bajo pero incumple la regla formalmente.
  2. **Comentarios de plantilla de Expo sin traducir**: `src/hooks/use-theme.ts:1-4`, `src/hooks/use-color-scheme.web.ts:7-9`, `src/constants/theme.ts:1-4,31-37`.
  3. **`console.log` de debug fuera de convención**: `src/constants/config.ts:71` no sigue el prefijo `[servicio]` que usa el resto de logs del proyecto (`console.warn('[auth] ...')`, etc.).
  4. **Componente de lista sin soporte de tema claro/oscuro**: `src/components/incident-list-item.tsx:29-34` usa clases Tailwind fijas (`bg-white`, `text-gray-900`, `text-gray-500`) en vez de `ThemedView`/`ThemedText`.
  5. **TODO/no-op dejado en producción**: `src/app/login.tsx:156`, botón "¿Has olvidado tu contraseña?" con `onPress={() => {}}` y comentario `TODO futuro` sin issue asociada.
  6. **Huecos de cobertura de tests** en módulos centrales: `src/services/http.ts`, `src/components/app-tabs.tsx`/`app-tabs.web.tsx`, `src/components/password-input.tsx`, `src/components/themed-text.tsx`/`themed-view.tsx`, `src/hooks/use-color-scheme.ts`/`.web.ts`, `use-location-preference.ts`, `use-theme.ts`, `src/utils/uuid.ts`, `src/app/(tabs)/_layout.tsx`.
  7. **Formato de checkbox incorrecto** en `docs/spec/bugs/todo.md`: 5 líneas usan `- []` en vez de `- [ ]`.
  8. **Falta validador de teléfono** en `src/utils/`, pese a que `phone` se envía tal cual a la API en `auth.service.ts`/`civic.service.ts`.
  9. **Función utilitaria viviendo en una pantalla**: `buildGreetings` en `src/app/(tabs)/index.tsx:14-18` debería estar en `src/utils/`.
  10. **Formateo manual de teléfono en un handler de pantalla**: `src/app/register.tsx:81` concatena el prefijo de país directamente, en vez de usar un helper en `src/utils/`.
  11. **Tipo con template literals innecesarios**: `src/types/user.ts:4` (`UserRole`) mezcla literales simples con template literal types sin necesidad.
- Fuera de alcance: severidad alta y media (documentos aparte). Los dos puntos que la auditoría marcó como "nota, no regla violada" (datos de usuario mock con pinta real en `db.json`; posible desfase entre notas de sesión y archivos modificados recientes) quedan fuera de este refactor — son observaciones a tener en cuenta, no código a tocar en esta fase.
- Comportamiento preservado: ninguno de estos cambios altera el comportamiento visible salvo el punto 5, donde se decide explícitamente con el usuario qué hacer con el botón de "recuperar contraseña" antes de tocarlo (deshabilitarlo visualmente de forma clara vs. abrir issue de seguimiento y dejar el TODO referenciado), en vez de dejarlo como no-op silencioso.

## Archivos tocados (plan)

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificar | `src/components/country-code-picker.tsx` | Sustituir `.map()` por `FlatList`. |
| Modificar | `src/hooks/use-theme.ts`, `use-color-scheme.web.ts`, `src/constants/theme.ts` | Traducir comentarios de plantilla al español. |
| Modificar | `src/constants/config.ts` | Ajustar el `console.log` de depuración al formato `[config] ...` usado en el resto de logs. |
| Modificar | `src/components/incident-list-item.tsx` | Sustituir clases Tailwind fijas por `ThemedView`/`ThemedText`. |
| Modificar | `src/app/login.tsx` | Resolver el TODO de "recuperar contraseña" según lo que se decida con el usuario. |
| Crear | Tests nuevos en `src/__tests__/services/`, `src/__tests__/components/`, `src/__tests__/hooks/` | Cubrir los módulos listados en el punto 6. |
| Modificar | `docs/spec/bugs/todo.md` | Corregir `- []` a `- [ ]` en las 5 líneas señaladas. |
| Crear | `src/utils/phone.ts` | `isPhoneNumberValid` (validador de formato, estilo Zod como `password-strength.ts`) y `buildPhoneWithDialCode` (helper de formateo), reutilizados en registro. |
| Modificar | `src/app/(tabs)/index.tsx` | Mover `buildGreetings` a `src/utils/greetings.ts`. |
| Crear | `src/utils/greetings.ts` | Alojar `buildGreetings`, extraída de `index.tsx`. |
| Modificar | `src/app/register.tsx` | Usar `buildPhoneWithDialCode` de `src/utils/phone.ts` para construir el teléfono con prefijo, en vez de concatenar inline. |
| Modificar | `src/types/user.ts` | Simplificar `UserRole` a literales simples. |

## Verificación / pasos a seguir

Nota de alcance (punto 8): `isPhoneNumberValid` se crea como función pura exportada y con tests propios, pero **no** se conecta a la lógica de bloqueo de envío (`isSubmitDisabled`/mensaje de error) de `register.tsx` en esta fase — hacerlo cambiaría comportamiento observable (hoy cualquier formato de teléfono pasa sin bloquear el envío), lo que excede la definición de "refactor" de `docs/spec/templates/refactor-template.md` ("una refactorización no cambia comportamiento observable; si el motivo real es corregir un comportamiento, esto es un bug, no un refactor"). Solo se conecta `buildPhoneWithDialCode` (puro cambio de implementación, mismo resultado). Si en el futuro se quiere bloquear el envío con teléfono inválido, se abre como bug/feature aparte.

Nota de estado (puntos 1, 9, 10): `country-code-picker.tsx`, `index.tsx` (`buildGreetings`) y `register.tsx` ya fueron tocados en la fase de severidad MEDIA (cerrada) por otros motivos (estilos NativeWind, colores). Quien ejecute T01, T06 o T09 debe leer el estado ACTUAL de esos archivos antes de tocarlos, no asumir el contenido descrito originalmente en la auditoría (los números de línea de la sección "Alcance" de este documento pueden haber cambiado ligeramente).

### Subtareas

Todas las subtareas listadas (T01–T18) tocan conjuntos de archivos disjuntos entre sí (o solo crean ficheros nuevos de test): no hay dependencias duras de archivo entre ellas y pueden ejecutarse en paralelo. Se agrupan en lotes por tamaño manejable de revisión, no por necesidad de orden.

- [x] **T01** — `FlatList` en `src/components/country-code-picker.tsx` (sustituye el `.map()` sobre `COUNTRIES` dentro de la hoja inferior). Verificar que `src/__tests__/components/country-code-picker.test.tsx` sigue en verde (usa `getByText`/`getByRole`, no depende de `.map()`; con solo 3 países no debería haber problema de virtualización, pero confirmarlo).
- [x] **T02** — Traducir al español los comentarios de plantilla de Expo en `src/hooks/use-theme.ts` (líneas 1-4), `src/hooks/use-color-scheme.web.ts` (líneas 7-9) y `src/constants/theme.ts` (líneas 1-4 y el bloque JSDoc de `Fonts`/`Spacing` si aplica). Solo comentarios, cero cambio de lógica.
- [x] **T03** — Ajustar el `console.log` de `src/constants/config.ts:71` (ya usa `[config]`, verificar que es exactamente el único log sin convención señalado por la auditoría; si ya cumple el formato `[config] ...`, documentar que este punto estaba ya resuelto y no requiere cambio). Revisar `src/__tests__/constants/config.test.ts` (usa `jest.spyOn(console, 'log').mockImplementation()` sin aserciones sobre el string, no debería romperse). Cerrado sin cambio de código: el log ya cumplía el formato `[config] ...`.
- [x] **T04** — `src/components/incident-list-item.tsx`: sustituir `bg-white`, `text-gray-900`, `text-gray-500` fijos por `ThemedView`/`ThemedText` con `themeColor` apropiado. Verificar visualmente claro/oscuro. `src/__tests__/components/incident-list-item.test.tsx` no depende de clases, debería seguir en verde sin cambios.
- [x] **T05** — `src/app/login.tsx`: resolver el botón "¿Has olvidado tu contraseña?" (línea ~141-147) según la decisión ya tomada: deshabilitarlo visualmente de forma clara (`disabled`, `accessibilityState={{ disabled: true }}`, estilo atenuado y/o texto que indique "próximamente") en vez de `onPress={() => {}}` silencioso con el comentario `TODO futuro`. Revisar si algún test en `src/__tests__/app/login-screen-submit.test.tsx` referencia este botón.
- [x] **T06** — Crear `src/utils/phone.ts` (`isPhoneNumberValid`, `buildPhoneWithDialCode`) + test nuevo `src/__tests__/utils/phone.test.ts`; usar `buildPhoneWithDialCode` en `src/app/register.tsx` (handler `handleSubmit`, construcción de `phone` a partir de `selectedCountry.dialCode` y `phoneNumber`) en vez de la concatenación inline. Ver nota de alcance arriba sobre qué NO conectar.
- [x] **T07** — `docs/spec/bugs/todo.md`: corregir `- []` a `- [ ]` en las 5 líneas confirmadas (líneas 11, 18, 19, 36 y 37 en el estado actual del archivo).
- [x] **T08** — `src/types/user.ts:4`: simplificar `UserRole` a `'administrative' | 'department' | 'team' | 'technician' | 'civic' | 'admin' | 'analyst'` (sin template literal types). Único uso externo es `src/types/token.ts` (`role: UserRole`); no requiere cambios ahí.
- [x] **T09** — Crear `src/utils/greetings.ts` con `buildGreetings` (extraída de `src/app/(tabs)/index.tsx:14-18`); actualizar `index.tsx` para importarla. Opcional pero recomendado: test nuevo `src/__tests__/utils/greetings.test.ts` (consistente con que el resto de `src/utils/` tiene test propio).
- [x] **T10** — Tests nuevos para `src/services/http.ts` en `src/__tests__/services/http.test.ts`: cubrir `fetchWithTimeout` (éxito, timeout → `RequestTimeoutError`, fallo de red genérico), `extractBackendErrorMessage` (string, array, cuerpo no-JSON), `toConnectionErrorMessage` (rama timeout vs. conexión) y `buildBackendRejectionMessage` (con/sin cuerpo parseable). **Prioridad alta dentro del punto 6**: es el módulo más central, lo usan todos los servicios.
- [x] **T11** — Tests nuevos para `src/components/app-tabs.tsx` y `app-tabs.web.tsx` en `src/__tests__/components/app-tabs.test.tsx` y `app-tabs.web.test.tsx`.
- [x] **T12** — Tests nuevos para `src/components/password-input.tsx` en `src/__tests__/components/password-input.test.tsx` (mostrar/ocultar contraseña, estado `editable`/`disabled`).
- [x] **T13** — Tests nuevos para `src/components/themed-text.tsx` y `themed-view.tsx` en `src/__tests__/components/themed-text.test.tsx` y `themed-view.test.tsx`.
- [x] **T14** — Tests nuevos para `src/hooks/use-color-scheme.ts` y `use-color-scheme.web.ts` en `src/__tests__/hooks/use-color-scheme.test.ts` y `use-color-scheme.web.test.ts`.
- [x] **T15** — Tests nuevos para `src/hooks/use-theme.ts` en `src/__tests__/hooks/use-theme.test.ts` (mapeo a `Colors.light`/`Colors.dark` según el esquema).
- [x] **T16** — Tests nuevos para `src/hooks/use-location-preference.ts` en `src/__tests__/hooks/use-location-preference.test.ts` (valor inicial, `toggleLocation`).
- [x] **T17** — Tests nuevos para `src/utils/uuid.ts` en `src/__tests__/utils/uuid.test.ts` (formato UUID v4, variante/versión correctas, unicidad básica).
- [x] **T18** — Tests nuevos para `src/app/(tabs)/_layout.tsx` en `src/__tests__/app/tabs/layout.test.tsx` (mirror de ruta: `src/app/(tabs)/_layout.tsx` → `src/__tests__/app/tabs/`).

### Lotes de ejecución en paralelo sugeridos

Los 18 archivos de test/subtareas no comparten ningún archivo modificado entre sí, por lo que en teoría todo T01–T18 es paralelizable. Para que la revisión sea manejable, se sugiere agrupar en lotes de ~4-6:

- **Lote 1** (quick wins, cero riesgo): T07, T08, T03.
- **Lote 2** (componentes/pantallas con decisión UX): T01, T04, T05.
- **Lote 3** (utils nuevas + consumidores): T06, T09, T02.
- **Lote 4** (tests — mitad 1): T10, T11, T12, T13.
- **Lote 5** (tests — mitad 2): T14, T15, T16, T17, T18.

- [x] `npx expo lint` y `npx tsc --noEmit` sin errores nuevos tras cada lote.
- [x] `pnpm test` en verde tras cada lote, incluyendo los tests nuevos de T06, T09 (opcional) y T10-T18.
- [x] Verificación manual en dispositivo/Expo Go: botón "¿Has olvidado tu contraseña?" deshabilitado y modo oscuro de `incident-list-item.tsx`. Confirmada por la usuaria (2026-11-17).

## Confirmación

- Estado final: Hecho — las 18 subtareas (T01-T18) implementadas y verificadas. Con este documento se cierra también todo el refactor transversal de limpieza de `frontend-mobile` (las 3 fases: alta, media y baja).
- Fecha de revisión: 2026-11-17.
- Resultado entregado: veredicto final del `compiler` PASA — `pnpm tsc --noEmit` 0 errores; `pnpm expo lint` 0 errores (solo 2 warnings preexistentes y ajenos en `src/__tests__/app/login-session-restore.test.tsx`, no son regresión de esta fase); `pnpm test` 58 suites / 739 tests, todos en verde, sin regresiones. Resumen por subtarea: T01 `FlatList` en `country-code-picker.tsx` (lista estática de 3 países); T02 comentarios de plantilla traducidos en `use-theme.ts`, `use-color-scheme.web.ts`, `theme.ts`; T03 confirmado que el log de `config.ts` ya tenía el prefijo `[config]` correcto, sin cambio necesario; T04 `incident-list-item.tsx` migrado a `ThemedView`/`ThemedText` (soporta modo oscuro); T05 botón "¿Has olvidado tu contraseña?" deshabilitado visualmente con indicación "(Próximamente)" en vez de no-op silencioso; T06 `src/utils/phone.ts` nuevo (`buildPhoneWithDialCode`, `isPhoneNumberValid` con Zod); `register.tsx` usa el helper de formateo; T07 5 checkboxes `- []` corregidos a `- [ ]` en `docs/spec/bugs/todo.md`; T08 `UserRole` simplificado (sin template literal types innecesarios); T09 `buildGreetings` movido a `src/utils/greetings.ts`; T10-T18 tests nuevos para `http.ts`, `app-tabs.tsx`/`app-tabs.web.tsx`, `password-input.tsx`, `themed-text.tsx`/`themed-view.tsx`, `use-color-scheme.ts`/`.web.ts`, `use-theme.ts`, `use-location-preference.ts`, `uuid.ts`, `(tabs)/_layout.tsx`.
- Decisiones y desviaciones:
  - Confirmado, como ya preveía la nota de alcance, que `isPhoneNumberValid` se crea como función pura exportada con tests propios pero **no** se conecta a la lógica de bloqueo de envío (`isSubmitDisabled`/mensaje de error) de `register.tsx`, para no cambiar comportamiento observable y mantenerse dentro de la definición de "refactor" (si se quiere bloquear el envío con teléfono inválido, es un bug/feature aparte). Solo se conectó `buildPhoneWithDialCode` (puro cambio de implementación, mismo resultado).
  - Follow-up no previsto en el plan original: se detectó y corrigió un bug real de configuración de Jest — `moduleNameMapper` en `package.json` no tenía la entrada específica `@/assets/...` antes de la entrada genérica `@/...`, lo que bloqueaba cualquier test que cargara una imagen vía ese alias (afectaba a `app-tabs.tsx` nativo, bloqueando T11). Corregido añadiendo esa entrada específica antes de la genérica.
  - Follow-up no previsto en el plan original: se corrigieron 2 warnings `import/first` de `expo lint` detectados en los tests nuevos de T13 (`themed-text.test.tsx`/`themed-view.test.tsx`), reordenando los imports tras los `jest.mock(...)` de ese archivo.
- Limitaciones y pendientes: T13 detectó, al escribir los tests, que `ThemedView` declara las props `lightColor`/`darkColor` en su interfaz pero no las usa en la implementación (no afectan al color resuelto). No se tocó código de producción para esto porque excedía el alcance de la auditoría original de severidad baja; queda anotado como hallazgo nuevo en `docs/spec/bugs/todo.md` (sección "General") para una futura sesión.
