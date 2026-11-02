# Frontend móvil de Urban Pulse

Aplicación ciudadana para registrar y consultar incidencias urbanas en Android, iOS y navegador. Utiliza React Native, Expo SDK 58, TypeScript, Expo Router y NativeWind. Incluye acceso y registro, persistencia de sesión, cierre de sesión, creación de incidencias con ubicación e imágenes, listado propio y detalle.

## Instalación y arranque

El componente usa pnpm y `pnpm-lock.yaml`. Expo SDK 58 establece Node.js 22.13.x como versión mínima, según su [referencia oficial](https://docs.expo.dev/versions/v58.0.0/). Desde la raíz:

```bash
cd frontend-mobile
pnpm install --frozen-lockfile
pnpm run start
```

Para abrir directamente el navegador:

```bash
pnpm run web
```

También puedes pulsar `w` desde el servidor de Expo. Consulta los requisitos comunes en [desarrollo](../docs/development.md).

## API y servidor simulado

La configuración está en `src/constants/config.ts`:

| Variable | Destino | Valor predeterminado |
| --- | --- | --- |
| `EXPO_PUBLIC_BACKEND_URL` | Backend NestJS. | Host del servidor de Metro y puerto 4000; `localhost` si no hay host de Metro. |
| `EXPO_PUBLIC_API_URL` | Servidor mock. | Host del servidor de Metro y puerto 3001; `localhost` si no hay host de Metro. |

Las variables permiten indicar la URL completa del servicio, incluido su puerto. En un dispositivo físico, usa una dirección del ordenador accesible desde el teléfono. Puedes definirlas en el entorno de la terminal antes de iniciar Expo; no hay archivo de ejemplo de entorno propio del componente.

Los servicios de autenticación, categorías e incidencias intentan utilizar el backend y disponen de rutas alternativas hacia datos simulados. El mock usa `db.json` y json-server. Para iniciarlo, abre otra terminal en `frontend-mobile/`:

```bash
pnpm run mock
```

El script escucha en `0.0.0.0:3001`. El arranque del backend se explica en su [README](../backend/README.md) y la ejecución con contenedores, en [despliegue](../docs/deployment.md).

## Dispositivo físico, emuladores y Expo Go

1. Instala Expo Go compatible con el SDK del proyecto.
2. Conecta ordenador y teléfono a la misma Wi-Fi para usar el modo LAN.
3. Ejecuta `pnpm run start` y abre el proyecto con el QR de Expo. El nombre y slug configurados son `frontend`.
4. Para los flujos que usen API o mock, configura direcciones accesibles desde el dispositivo y arranca los servicios correspondientes.

Expo Go ejecuta los módulos nativos incluidos en su aplicación. Si necesitas módulos o configuración nativa que no incluya, utiliza una compilación de desarrollo. El repositorio no incluye `expo-dev-client`, `eas.json` ni proyectos `android/` o `ios/`. El procedimiento de referencia es la [guía de compilaciones de desarrollo de Expo](https://docs.expo.dev/develop/development-builds/introduction/).

Para Android, configura Android Studio, SDK y un emulador iniciado. Para el simulador iOS se necesita macOS y Xcode. Los scripts `android` e `ios` inician Expo y abren la plataforma; no compilan una aplicación nativa propia.

## Scripts y comprobaciones

Desde `frontend-mobile/`:

| Comando | Función |
| --- | --- |
| `pnpm run start` | Servidor de desarrollo de Expo. |
| `pnpm run web` | Abrir en navegador. |
| `pnpm run android` | Abrir Android con el entorno preparado. |
| `pnpm run ios` | Abrir el simulador iOS con el entorno preparado. |
| `pnpm run mock` | Iniciar json-server con `db.json`. |
| `pnpm run lint` | Analizar el código con Expo y la configuración ESLint del componente. |
| `pnpm exec tsc --noEmit` | Comprobar tipos sin emitir archivos. |
| `pnpm run test --watch=false` | Ejecutar Jest sin modo observación. |
| `pnpm run test:watch` | Ejecutar Jest en modo observación. |

Las pruebas usan el preset `jest-expo` y se encuentran en `src/__tests__/`. No hay script de build. Los procedimientos se han contrastado por lectura; no se han ejecutado instalación, lint, comprobación de tipos, pruebas ni servicios durante esta revisión documental.

## Navegación y estructura

`package.json` utiliza `expo-router/entry`. `src/app/_layout.tsx` configura el proveedor de sesión, el tema y el navegador raíz.

| Ruta de código | Pantalla |
| --- | --- |
| `src/app/login.tsx` | Acceso. |
| `src/app/register.tsx` | Registro ciudadano. |
| `src/app/(tabs)/index.tsx` | Inicio. |
| `src/app/(tabs)/my-incidents.tsx` | Incidencias propias. |
| `src/app/incidents/new.tsx` | Nueva incidencia. |
| `src/app/incidents/[id].tsx` | Detalle de una incidencia. |

`src/services/` contiene acceso HTTP, sesión, almacenamiento y capacidades del dispositivo; `src/hooks/` conecta esa lógica con las pantallas. Componentes, tipos y constantes se mantienen fuera de la carpeta de rutas. `app.json` configura iconos, splash y plugins, incluidos ubicación, selección de imágenes y almacenamiento seguro.

Referencias: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [preparación del entorno](https://docs.expo.dev/get-started/set-up-your-environment/) y [Expo Router](https://docs.expo.dev/router/introduction/).

Guías: [arquitectura](../docs/architecture.md), [desarrollo](../docs/development.md), [despliegue](../docs/deployment.md), [contribución](../CONTRIBUTING.md) y [ADRs](../backend/docs/adr/).
