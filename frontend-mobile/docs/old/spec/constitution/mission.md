# Misión

UrbanPulse es una plataforma móvil orientada a la ciudadanía para registrar, geolocalizar y seguir el estado de incidencias urbanas en tiempo real, facilitando una comunicación directa y transparente con la administración municipal.

---

## Qué construimos

Una aplicación móvil nativa (desarrollada con Expo y React Native) ágil y accesible que permite a los ciudadanos notificar desperfectos o problemas en la vía pública en menos de un minuto.

1. **Módulo de Reporte y Captura** — Permite adjuntar fotografías del desperfecto (usando la cámara o galería del dispositivo) y geolocalizar la incidencia automáticamente mediante GPS.
2. **Inicio de sesión** - Inicio de sesión para que el ciudadano publique la incidencia
3. **Seguimiento de Estado** — Consulta y trazabilidad del ciclo de vida de cada reporte (pendiente, en revisión, resuelto).

---

## Para quién

- **Ciudadanos y vecinos:** Buscan un canal inmediato, sin fricción burocrática, para notificar un problema en su calle y saber si el ayuntamiento lo está gestionando.
- **Servicios operativos / Gestión municipal:** Necesitan reportes estructurados con evidencia fotográfica clara y coordenadas precisas para priorizar reparaciones.
- **Analistas:** Pueden ver métricas sobre las incidencias

> [!important]
> Nosotros solo nos centraremos en los ciudadanos y vecinos, utilizando una app móvil. No implementaremos funcionalidades del resto

---

## Principios

- **Mobile-First & Cero Fricción** — El flujo de creación de una incidencia debe requerir la mínima interacción posible: foto, ubicación automática, más datos y enviar.
- **Resiliencia y Funcionamiento Desacoplado** — La aplicación debe ser completamente funcional en local mediante contratos de datos estrictos (`src/types/` y mocks), garantizando estabilidad antes de interactuar con servicios externos.
- **Rendimiento e Integridad Visual** — Uso estricto de componentes nativos optimizados y utilidades de NativeWind, evitando sobrecargas de re-renderizado o bloqueos de hilo principal en listas y multimedia.
- **Transparencia en el Estado** — Todo reporte debe tener un estado comprensible y visible para el usuario en todo momento.

---

## Qué NO es

- **NO es una red social urbana:** No incluye muros de opinión, comentarios abiertos entre vecinos ni sistemas de mensajería social.
- **NO es un panel de gestión administrativa (Backoffice):** Esta aplicación no implementa herramientas de despacho de cuadrillas ni paneles de analítica municipal; su alcance está delimitado a la experiencia del ciudadano en el dispositivo móvil.
- **NO es una aplicación web de escritorio:** No implementa layouts adaptados a navegadores convencionales ni depende de APIs exclusivas del DOM.
