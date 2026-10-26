# 002 · Gestión de sesión (login) — Plan

_Cómo se implementa lo descrito en `spec.md`. Debe respetar la `constitution/`._

## Enfoque

Login contra el mock de json-server con sesión solo en memoria (contexto React) y un servicio de bloqueo
escalado persistido con `expo-secure-store`. Se separa la lógica en servicios (`auth`, `lockout`), hooks
(`use-session`, `use-login`) y componentes presentacionales, dejando `src/app/login.tsx` como pantalla fina.

## Implementación

1. Instalar `expo-secure-store` con `npx expo install` — `package.json`. Crear `src/types/auth.ts` (tipos de sesión/bloqueo).
2. `src/services/lockout.service.ts` — `FAILURE_THRESHOLD=5`, `FAILURE_WINDOW_MS=60000`, `LOCK_DURATIONS_MS=[60000,300000,86400000]`, clave `urbanpulse.auth.lockout`.
3. `src/services/auth.service.ts` — consulta `${API_BASE_URL}/users`, match por username O email, compara password; lanza `InvalidCredentialsError`.
4. `src/hooks/use-session.ts` — `SessionProvider` + `useSession` (usuario en memoria).
5. `src/hooks/use-login.ts` — orquesta auth + lockout, estados de carga/error/bloqueo, temporizador de desbloqueo.
6. `src/components/password-input.tsx` y `src/components/typewriter-text.tsx`.
7. `src/app/login.tsx` — pantalla de login.
8. `src/app/_layout.tsx` (SessionProvider, `initialRouteName="login"`, `Stack.Screen login` con `headerShown:false`) y `src/app/(tabs)/index.tsx` (saludo typewriter).
9. Tests en `src/__tests__/`: `services/lockout.service.test.ts`, `services/auth.service.test.ts`, `components/typewriter-text.test.tsx`.

## Decisiones

- **Sesión en memoria** — suficiente para el alcance; persistente/gate se difiere. Se descarta guardar el usuario en SecureStore.
- **Bloqueo en SecureStore** — sobrevive al reinicio y evita saltarse el límite relanzando la app; se descarta AsyncStorage (no es seguro, y añadiría otra dependencia).
- **Errores de red no cuentan como fallo** — no castiga a la usuaria por problemas de conexión.
- **Match por username O email** — `LoginUserInput.username_email` único.
- **Comparación de password en cliente** — solo válido porque es un mock; el backend real lo sustituirá.

## Riesgos

- **`expo-secure-store` es módulo nativo** — se incluye en Expo Go; verificar versión compatible con el SDK (`expo install`).
- **Timers/animación en tests** — usar fake timers en `typewriter-text` y `lockout`.
- **Reloj del dispositivo manipulable** — aceptable en mock; se documenta.
- **Contraseñas en claro en `db.json`** — solo datos de prueba; no tocar `db.json`.
