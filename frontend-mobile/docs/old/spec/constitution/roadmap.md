# Roadmap

Orden y estado de las features de UrbanPulse (`frontend-mobile`). Cada entrada apunta a su carpeta en `spec/features/`

---

## Hecho

1. **000 · Configuración base y entorno de agentes** — Estructura inicial del proyecto Expo con NativeWind, contratos tipados y flujo de orquestación autónoma en `AGENTS.md`
2. **001 · Registro de incidencia** — Formulario (título obligatorio, descripción opcional y **categoría opcional**) que registra una incidencia con estado `reported`, fecha automática y relaciones en `null`, persistida en el mock (`db.json`). La categoría se elige desde un control en la **esquina inferior del campo Descripción** ("Añadir categoría +") que abre una hoja inferior con la colección `categories` (`Transporte`, `Alumbrado público`, `Objetos urbanos`) o permite escribir texto libre vía **"Otros"**; una vez seleccionada muestra el nombre + "×" y es deseleccionable. Nunca bloquea el registro. **Ampliación implementada y verificada (ubicación):** toggle flotante activado por defecto (círculo negro con icono blanco + `location_on` con línea diagonal en off) que, al enviar, captura la posición (`Accuracy.Balanced`), crea la `Location` en la colección `locations` y persiste `locationId`; pide permiso en primer plano (con "Abrir Ajustes"/"Enviar sin ubicación"/"Cancelar") y degrada a `locationId: null` si el GPS está apagado o falla la captura. **Ampliación implementada y verificada (fotos):** sección bajo la Descripción; el título "Imágenes subidas (n):" (contador dinámico) **solo se muestra con n≥1**; **en vacío (0 imágenes)**, sin cabecera ni botón: un "+" grande centrado (`MaterialIcons add`, 48) con "¿Desea añadir imágenes?" debajo (todo táctil, abre la hoja Cámara/Galería); **con ≥1 foto**, fila horizontal de miniaturas con "×" que termina en un tile de añadir "+" (sin borde); ambos abren una hoja inferior Cámara/Galería (`expo-image-picker`); **límite de 8** (`MAX_SELECTED_PHOTOS`, guard en el hook): con 8 fotos desaparece el "+" y se muestra en rojo "El número máximo de imágenes son 8" bajo los previews; footer con Enviar (fondo blanco `#ffffff`, texto negro `#000000`) y el FAB de ubicación (fondo negro `#000000`, icono blanco `#ffffff`) fijos en capa superior; al enviar se persiste una `IncidentImage { id, url, incidentId }` (no anulables) por foto en la colección `images` (URI local `file://...`, sin nube), con envío degradado y aviso no bloqueante si fallan las imágenes. **Ampliación (conexión al backend):** `POST /incidents` multipart/form-data real-first con fallback al mock y aviso en pantalla; contrato alineado (issues #61 y #91 pendientes). Ver `features/001-registro-incidencia/` y `refactor/001-registro-incidencia/`.
3. **Infra · NativeWind configurado** — `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css` con directivas `@tailwind` y `nativewind-env.d.ts`. El estilado con `className` ya está operativo.
4. **002 · Gestión de sesión (login)** — Pantalla `/login` inicial (hero "UrbanPulse", usuario/correo + contraseña con ojo, enlace "¿Has olvidado tu contraseña?" sin acción, botón blanco `#ffffff`/texto negro `#000000`, errores en rojo `#d92d20`) que valida contra el mock `users` (`auth.service.ts`, `InvalidCredentialsError`). **Bloqueo escalado persistido** en `expo-secure-store` (`lockout.service.ts`): 5 fallos/min -> 1 min -> 5 min -> 24 h; los errores de red no cuentan como fallo y el formulario se desbloquea al expirar. Sesión solo en memoria (`SessionProvider`/`useSession`); arranque en `/login` y `Redirect` desde `(tabs)/index.tsx` sin sesión. El menú principal muestra un saludo aleatorio con animación typewriter ("¡Estás de vuelta, <username>!", "¿Alguna incidencia que reportar, <username>?", "Hola, <username>") y mantiene el botón Registrar incidencia. Nueva dependencia: `expo-secure-store`. Verificado: tsc, lint y jest (18 suites / 167 tests). Ver `features/002-gestion-sesion/`.

5. **003 · Integración de token** — El login valida credenciales en el mock (`users`) y, tras validar, obtiene un token con diseño **real-first** (`POST /auth/token` del backend, puerto 4000, `BACKEND_API_URL`) con **fallback a simulación** (`source: 'mock'`, formato `mock.<base64>.<sig>`, retardo simulado) ante 404, respuesta no OK, timeout o error de red; si todo falla se entra con `token = null` (nunca bloquea el login ni cuenta para `registerFailure`/bloqueo). Token persistido en `expo-secure-store` (`urbanpulse.auth.token`), expuesto en `useSession` (`signIn(user, token)`, `signOut()` lo limpia) y aviso suave no bloqueante en `login.tsx` si es simulado/ausente. Nuevos: `src/types/token.ts`, `src/services/token.service.ts`, `src/services/token-storage.service.ts`, `BACKEND_API_URL` en `src/constants/config.ts`, y la convención "Backend real + simulación mock" en `CLAUDE.md`. **Limitación/diferido:** el backend aún no expone registro de ciudadanos (solo el admin sembrado obtiene token real), así que hoy la app usa la simulación; el camino real de ciudadanía queda pendiente. Verificado: tsc y lint limpios; jest 223 passed / 1 failed (fallo preexistente ajeno en `typewriter-text.test.tsx`). Ver `features/003-integracion-token/`.

---

## Siguiente

_Sin feature en curso._

---

## Backlog / ideas

- **Detalle y seguimiento del reporte** — Pantalla para consultar la evolución y estado de una incidencia (pendiente, en revisión, resuelta...)
- **Gestión de imágenes de incidencias pasadas** — Ver, añadir o borrar fotos de reportes ya registrados (la captura al registrar ya está cubierta por la ampliación de fotos de la 001).
- **Migrar componentes a NativeWind** — Los componentes existentes siguen usando `StyleSheet`; migrarlos a `className` ahora que NativeWind está configurado. Seguimiento en [`spec/refactor/infra/nativewind-migracion-pendiente.md`](../refactor/infra/nativewind-migracion-pendiente.md). **Ya migrados (2026-10-14):** footer de `src/app/incidents/new.tsx`, `src/components/photo-picker.tsx` y `src/components/location-toggle.tsx`. **Pendientes:** `themed-text.tsx`, `category-picker.tsx`, `app-tabs.web.tsx` y `src/app/(tabs)/index.tsx`.
- **Categorías de solo lectura** — La gestión (alta/edición/borrado) de categorías queda fuera del alcance ciudadano; hoy se consumen del mock.

---

> Cada feature nueva se crea como `features/NNN-nombre-feature/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
