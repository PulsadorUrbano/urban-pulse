# 002 · Gestión de sesión (login)

**Estado:** implementado ✅

## Qué hace

La app arranca en una pantalla **`/login`** (ruta inicial, sin gate de autenticación). Muestra el hero
original de inicio (título **"UrbanPulse"** y subtítulo **"Reporta incidencias en tu ciudad y colabora en
mantenerla en buen estado."**), un campo **usuario o correo** (`LoginUserInput.username_email`), un campo
**contraseña** con botón de ojo para mostrar/ocultar (`MaterialIcons` `visibility` / `visibility-off`), el
texto pequeño **"¿Has olvidado tu contraseña?"** (sin acción) y un botón blanco `#ffffff` con texto negro
`#000000` **"Iniciar sesión"**. Los errores se muestran en rojo `#d92d20`.

El login consulta el mock (`${API_BASE_URL}/users`) y acepta usuario **o** correo más contraseña. Con
credenciales incorrectas muestra **"El usuario o contraseña no son correctos, inténtelo de nuevo."**.

Tras **5 fallos en menos de 1 minuto** se bloquea el formulario (inputs y botón anulados) con un bloqueo
**escalado y persistido** en `expo-secure-store`: 1 minuto, luego 5 minutos, luego 24 horas.

Al iniciar sesión se navega al menú principal (`src/app/(tabs)/index.tsx`), que muestra un **saludo aleatorio
con animación typewriter** (tamaño título) entre "¡Estás de vuelta, <username>!", "¿Alguna incidencia que
reportar, <username>?" y "Hola, <username>"; debajo, "UrbanPulse" en pequeño, y se mantiene el botón
**Registrar incidencia**. La sesión vive solo en memoria (`SessionProvider` / `useSession`).

## Por qué

La app es para la ciudadanía y necesita identificar a la persona que reporta. El login es el primer paso de
la gestión de sesión (Login, Sign in y Logout del backlog) y protege el acceso frente a intentos repetidos de
adivinar contraseñas. Se hace ahora porque el registro de incidencias (001) ya está cerrado.

**Contexto de datos:** LA USUARIA ya creó los mocks necesarios: `src/types/user.ts` (`User`, `UserRole`,
`LoginUserInput`), `src/types/civic.ts` y las colecciones `users` y `civics` en `db.json` (usuarios de prueba
`sofia13`/`sofia13` y `mayte`/`mayte`). Esta feature NO modifica `db.json`.

## Criterios de aceptación

- [x] La app abre en `/login` (`initialRouteName="login"`, cabecera oculta); si no hay sesión, `(tabs)/index.tsx` redirige (`Redirect`) a `/login`.
- [x] `/login` muestra título "UrbanPulse" y el subtítulo indicado, input usuario/correo, input contraseña, texto "¿Has olvidado tu contraseña?" (pulsarlo no hace nada) y botón "Iniciar sesión" (fondo `#ffffff`, texto `#000000`).
- [x] El ojo alterna entre contraseña oculta y visible, con iconos `visibility-off` / `visibility`.
- [x] `sofia13`/`sofia13` y `mayte`/`mayte` inician sesión; también funciona con el correo del usuario en lugar del username.
- [x] Con credenciales incorrectas aparece, en rojo `#d92d20`, "El usuario o contraseña no son correctos, inténtelo de nuevo."
- [x] Mientras se envía, el botón muestra estado de carga y no permite envíos duplicados.
- [x] Un error de red o timeout muestra un mensaje amigable y NO cuenta como fallo de login.
- [x] 5 fallos en menos de 1 minuto anulan inputs y botón y muestran en rojo "Has realizado demasiados intentos de sesión, por favor, inténtelo en 1 minuto."
- [x] Reincidir tras el primer bloqueo escala a "...5 minutos." y después a "...bloqueado temporalmente durante 24 horas."
- [x] El bloqueo persiste en `expo-secure-store` (clave `urbanpulse.auth.lockout`) y sobrevive a reiniciar la app; al expirar se desbloquea el formulario.
- [x] Un login correcto navega a `(tabs)` y el menú muestra uno de los 3 saludos con el username y animación typewriter, "UrbanPulse" pequeño debajo y el botón Registrar incidencia operativo.
- [x] Tests unitarios de `lockout.service`, `auth.service` y `typewriter-text` pasan; `npx expo lint` y `npx tsc --noEmit` sin errores; cero `any`.

## Fuera de alcance

- Sesión persistente entre reinicios (la sesión vive solo en memoria).
- Enlace "¿Has olvidado tu contraseña?" funcional.
- Resetear el bloqueo al cambiar la contraseña (futuro).
- Registro (sign in) y logout (siguientes iteraciones de "Gestión de sesión").
- Cambios en `db.json`.
