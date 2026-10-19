# Auditoría — 2026-10-12 · Feature 001 · Bugs del registro de incidencia

**Objetivo:** registrar los fallos detectados y corregidos en la feature 001 "Registro de
incidencia" (`frontend-mobile`), con su causa, el fix aplicado y los archivos implicados. Registro
de auditoría (no se toca `spec/`).

## Fallos y correcciones

### 1. No se podía registrar; el botón "Enviar" no respondía

- **Fallo:** el usuario no conseguía registrar una incidencia. El botón "Enviar" no respondía:
  parecía deshabilitado aunque el resto del formulario estuviera relleno.
- **Causa:** `src/app/incidents/new.tsx` deshabilitaba el botón si el título **o** la descripción
  estaban vacíos. Con la descripción ahora opcional (ver fallo 3), esa condición dejaba el botón
  bloqueado sin dar ninguna pista al usuario.
- **Fix:** el botón solo se deshabilita mientras se envía (`isSubmitting`). Con el título vacío, al
  pulsar "Enviar" aparece el error en rojo correspondiente en lugar de un botón muerto.
- **Archivo(s):** `src/app/incidents/new.tsx`.

### 2. `localhost` no funcionaba en iPhone

- **Fallo:** la app funcionaba en el simulador, pero en un iPhone físico no alcanzaba el mock
  server.
- **Causa:** `src/constants/config.ts` usaba `http://localhost:3001`. En un dispositivo físico,
  `localhost` apunta al propio teléfono, no al Mac donde corre `json-server`, por lo que las
  peticiones nunca llegaban.
- **Fix:** se deriva el host del dev server a partir de `Constants.expoConfig.hostUri`
  (`http://<host>:3001`), de modo que el dispositivo usa la misma IP del Mac. Se mantiene
  `EXPO_PUBLIC_API_URL` como override explícito y `localhost` como último fallback.
- **Archivo(s):** `src/constants/config.ts`.

### 3. Reglas del formulario (título obligatorio, descripción opcional)

- **Fallo:** no había reglas claras sobre qué campos eran obligatorios y se podía enviar con
  campos vacíos sin ninguna validación ni aviso.
- **Causa:** el validador y la pantalla no distinguían entre campos obligatorios y opcionales, ni
  advertían sobre la calidad de la descripción.
- **Fix:** el **título** pasa a ser obligatorio (error rojo "El título es obligatorio.") y la
  **descripción** pasa a ser opcional. Si la descripción está vacía o tiene menos de 10
  caracteres, se muestra un `Alert` de confirmación antes de enviar:
  - **Vacía:** "¿Estás seguro de que no quieres añadir una descripción? Es recomendable añadir una
    para que el sistema de incidencias mejore."
  - **Demasiado corta:** aviso equivalente indicando que la descripción es muy corta.
  - `src/utils/incident-validator.ts` valida solo el título y expone `getDescriptionQuality()` que
    devuelve `empty | too_short | ok`.
- **Archivo(s):** `src/utils/incident-validator.ts`, `src/app/incidents/new.tsx`.

### 4. Carga infinita al registrar

- **Fallo:** al pulsar "Enviar", el spinner se quedaba girando indefinidamente y la interfaz nunca
  se recuperaba (`isSubmitting` no se reseteaba).
- **Causa raíz (confirmada):** el dev server se estaba ejecutando con `expo start --tunnel` (modo
  túnel con ngrok). En modo túnel, `Constants.expoConfig.hostUri` devuelve el host público del
  túnel (p. ej. `*.exp.direct`) y **solo el puerto 8081 del dev server está tunelado**; el mock
  (`:3001`) no. Así, `resolveApiBaseUrl()` en `src/constants/config.ts` componía
  `API_BASE_URL = http://<host-del-túnel>:3001`, un host sin nada escuchando. El `fetch` nunca
  encontraba respuesta y la promesa no resolvía ni rechazaba, dejando el spinner infinito.
  - **Verificación:** el mock escucha dual-stack en todas las interfaces (`tcp46 *.3001`) y
    respondía `200` desde el Mac por `http://192.168.0.14:3001`. Es decir, el servidor no era el
    problema; el problema era el host derivado en modo túnel.
- **Fix operativo:** ejecutar sin túnel (`npm run start` / `npx expo start`) para que `hostUri` sea
  la IP LAN (`192.168.0.14`) y `API_BASE_URL = http://192.168.0.14:3001`. Si se necesita túnel,
  definir `EXPO_PUBLIC_API_URL` apuntando a un mock alcanzable.
- **Fix defensivo en código:**
  - `AbortController` con timeout de 10 s (`REQUEST_TIMEOUT_MS`) y un mensaje de error específico
    para el caso de timeout, de forma que `isSubmitting` siempre se resetea y el usuario recibe
    feedback (ya documentado).
  - `console.warn` en desarrollo que avisa cuando se detecta modo túnel (`exp.direct` / `ngrok`) e
    indica que el mock no será accesible.
- **Archivo(s):** `src/services/incident.service.ts`, `src/constants/config.ts`.

## Cómo verificar en el dispositivo

1. **Recargar la app** tras cambios de configuración (`src/constants/config.ts`): el host se
   resuelve al arrancar, así que un simple fast refresh no basta.
2. **Ejecutar el mock server:** `npm run mock` (debe quedar escuchando en el puerto `3001`).
3. **Mismo Wi-Fi y sin VPN:** el Mac y el iPhone deben estar en la misma red; una VPN en cualquiera
   de los dos rompe el acceso por IP local.
4. **Revisar el log en la terminal de Metro:** al arrancar debe aparecer `[config] API_BASE_URL =
   ...` con el host correcto del Mac.
5. **Si hiciera falta, forzar la URL** con la variable de entorno `EXPO_PUBLIC_API_URL` (override).

## Verificación

- `npx tsc --noEmit` → OK.
- `npx expo lint` → OK.
- `npx jest` → OK.
