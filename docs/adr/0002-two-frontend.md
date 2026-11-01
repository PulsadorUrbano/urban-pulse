# ADR 0002: Dos frontends separados, móvil para la ciudadanía y web para el personal municipal

- Estado: Aceptado.
- Fecha de registro: 2026-10-27.
- Relacionados: [ADR 0004 - Stack del frontend web](0004-frontend-web-stack.md), [ADR 0005 - Stack del frontend móvil](0005-frontend-mobile-stack.md).

## Contexto

UrbanPulse da servicio a perfiles con necesidades y entornos de uso muy distintos (ver la visión del producto en el [README](../../README.md)):

- **Ciudadanía:** comunica una incidencia, aporta localización y evidencias y sigue su evolución. Lo hace en la calle, en el momento en que ve el problema, con el móvil: necesita cámara, galería, GPS y un flujo de pocos segundos.
- **Personal municipal y analistas:** validan, rechazan, asignan, priorizan, colaboran y consultan contexto e indicadores. Es trabajo de oficina o puesto de trabajo, en sesiones largas, con listados, filtros, detalle de incidencias y mapas que aprovechan una pantalla grande.

El modelo de datos refleja esa separación. El enum `profile_role` (`backend/prisma/schema.prisma`, `database/diagram.dbml`) distingue un único rol ciudadano (`civic`) de seis roles profesionales: `administrative`, `department`, `team`, `technician`, `admin` y `analyst`. El backend asigna `civic` en `POST /auth/register` y no acepta el rol en la petición, así que el autorregistro desde la app solo puede crear ciudadanos.

Los requisitos del proyecto también se reparten por perfil:

- Ciudadanía: registrar incidencia con foto y ubicación (#41), registrarse (#35) y consultar sus incidencias.
- Personal municipal: validar o rechazar con motivo (RF09, #47), pedir información al ciudadano (#48), colaborar con comentarios y evidencias entre operadores y técnicos (RF13) y ver el contexto urbano de la incidencia (RF24).

## Decisión

Mantener dos aplicaciones cliente independientes que consumen el mismo backend NestJS:

- **`frontend-mobile/`** (React Native con Expo): exclusiva para la ciudadanía (rol `civic`). Su alcance está fijado en `frontend-mobile/CLAUDE.md`, que deja fuera los paneles de gestión, el triaje y los flujos administrativos.
- **`frontend-web/`** (React con Vite): panel para el personal municipal y los analistas (resto de roles). Ya implementa el inicio de sesión con JWT y la vista de validación de incidencias (`src/components/IncidentValidationView.jsx`).

El backend es la única fuente de verdad: identidad, roles y permisos se validan en el servidor, no en los clientes.

## Alternativas consideradas

- **Una única aplicación web responsive (o PWA) para todos los perfiles.** Se descarta porque la ciudadanía necesita acceso nativo y fluido a la cámara, la galería y el GPS, y el uso desde el móvil en la calle es el caso principal. Una PWA lo ofrece de forma más limitada y desigual entre plataformas.
- **Una única aplicación Expo para todos los perfiles, exportada también a web.** Expo permite publicar en web (`npm run web`), pero el panel de gestión se basa en tablas densas, filtros y vistas de escritorio que encajan mal con los componentes de React Native. Además, mezclar las funciones internas del ayuntamiento con la app pública aumentaría su tamaño y la superficie expuesta a la ciudadanía.
- **Una sola aplicación con navegación según el rol.** Se descarta por los mismos motivos: dos experiencias muy distintas en el mismo código, y la app pública acabaría incluyendo funciones administrativas.

## Consecuencias

Positivas:

- Cada cliente se diseña para su dispositivo y su usuario: flujo rápido y nativo en el móvil y panel de trabajo completo en el ordenador.
- La app de la ciudadanía no incluye código ni pantallas administrativas.
- Los equipos trabajan en paralelo con subramas `feature/<issue>-frontend-mobile` y `feature/<issue>-frontend-web` (ver el flujo de ramas del README).

Negativas y riesgos:

- Hay dos bases de código que mantener. Algunas piezas se implementan dos veces, como la integración de autenticación con JWT y el fallback a datos simulados, que existen en ambos clientes.
- Los dos clientes deben consumir el mismo contrato HTTP. La referencia común es el catálogo `backend/docs/spec/endpoint/`; un cambio de contrato afecta a ambos.
- Los técnicos (`technician`) quedan en el panel web. Si más adelante necesitan registrar la resolución desde la calle, habrá que revisar esta decisión o añadirles un flujo móvil específico.
