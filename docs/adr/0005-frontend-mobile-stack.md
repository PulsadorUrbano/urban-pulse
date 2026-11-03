# ADR 0005: Stack del frontend móvil (React Native con Expo)

- Estado: Aceptado.
- Fecha de registro: 2026-10-27.
- Relacionados: [ADR 0002 - Dos frontends separados](0002-two-frontend.md).

## Contexto

Según el ADR 0002, Urban Pulse dispone de dos frontends separados.
`frontend-mobile/` contiene la aplicación orientada a la ciudadanía,
desde la que se prevé comunicar incidencias urbanas, aportar localización
y evidencias y consultar su evolución.

Condiciones de partida:

- Se busca desarrollar para Android e iOS compartiendo una base de código.
- El frontend web utiliza React, por lo que interesa compartir conocimientos
  sobre componentes y hooks entre los equipos.
- Se necesita probar la interfaz durante el desarrollo y permitir
  incorporar capacidades del dispositivo conforme avance el proyecto.
- El proyecto incluye ejecución en navegador como apoyo al desarrollo;
  esta no sustituye al panel municipal de `frontend-web/`.

## Decisión

Construir el frontend móvil con este stack, reflejado en
`frontend-mobile/package.json` y en la estructura del proyecto:

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Framework móvil | React Native 0.86 con React 19 | Desarrollo para Android e iOS con código compartido y un modelo de componentes conocido por el equipo web. |
| Entorno de desarrollo | Expo SDK 57 | Herramientas de desarrollo y módulos para integrar capacidades del dispositivo, manteniendo versiones compatibles con el SDK. |
| Lenguaje | TypeScript 6 con modo estricto | Tipado de componentes, hooks y estructuras de datos para detectar errores durante el desarrollo. |
| Navegación | Expo Router | Rutas basadas en archivos dentro de `src/app/`, con layouts y componentes de pestañas específicos para móvil y web. |
| Ejecución web | React Native Web | Permite comprobar parte de la aplicación desde el navegador sin mantener otra implementación de la interfaz móvil. |
| Apariencia | Componentes temáticos, hooks de tema y estilos de React Native | El proyecto organiza colores y estilos mediante `src/constants/theme.ts`, hooks y componentes reutilizables como `ThemedText` y `ThemedView`. |
| Recursos visuales | Expo Image, Expo Font y Expo Symbols | Integración de imágenes, tipografías y símbolos mediante módulos del ecosistema Expo. |
| Interacción y animaciones | React Native Gesture Handler, Reanimated y Worklets | Soporte para gestos y animaciones en la interfaz móvil. |

La configuración de la aplicación se mantiene en `app.json`, incluidos
iconos, pantalla de inicio, esquema de enlaces y plugins de Expo.

Las pantallas y layouts se ubican en `src/app/`. Los componentes
reutilizables, hooks y constantes se mantienen en directorios separados
dentro de `src/`.

Comandos de referencia, desde `frontend-mobile/`:
`npm ci`, `npm run start`, `npm run web`, `npm run android`,
`npm run ios`, `npm run lint` y `npx tsc --noEmit`.

## Alternativas consideradas

Las siguientes alternativas deben confirmarse con el equipo antes
de aceptar este ADR:

- **Desarrollo nativo con Kotlin y Swift.** Ofrece control directo sobre
  cada plataforma, pero exige mantener dos implementaciones y herramientas
  diferentes.
- **Flutter.** Permite compartir código entre plataformas, pero introduce
  Dart y un ecosistema distinto al de React utilizado en el frontend web.
- **React Native sin Expo.** Ofrece mayor control directo de la configuración
  nativa, a cambio de más trabajo inicial de configuración y mantenimiento.
- **Una única aplicación web adaptable.** Simplifica la distribución,
  pero su adecuación depende de las capacidades del dispositivo y de
  la experiencia móvil requerida. La separación de frontends se recoge
  en el ADR 0002.

## Consecuencias

Positivas:

- Se comparte gran parte del código entre Android e iOS.
- Los equipos móvil y web comparten conocimientos de React.
- Expo facilita el desarrollo y la integración de módulos compatibles.
- La estructura de rutas permite localizar pantallas y layouts fácilmente.
- La ejecución web facilita revisar parte de la interfaz durante el desarrollo.

Negativas y riesgos:

- Las versiones de Expo, React Native y sus módulos deben mantenerse
  compatibles; las actualizaciones requieren revisión conjunta.
- Expo Go solo permite probar los módulos incluidos en su aplicación
  y compatibles con su versión. Otros módulos nativos requieren
  una compilación de desarrollo.
- El navegador no reproduce todas las capacidades ni el comportamiento
  de Android e iOS; deben realizarse pruebas en dispositivos o emuladores.
- Algunas piezas necesitan implementaciones específicas por plataforma,
  como reflejan los archivos `.web.tsx` existentes.
- El simulador iOS requiere macOS y Xcode.
- El manifiesto revisado no define un script ni un framework de pruebas
  automatizadas. Lint y TypeScript aportan comprobaciones estáticas;
  la estrategia de pruebas queda pendiente.
- La selección del stack no implica que la geolocalización, la captura
  de evidencias o la integración completa con el backend estén implementadas.