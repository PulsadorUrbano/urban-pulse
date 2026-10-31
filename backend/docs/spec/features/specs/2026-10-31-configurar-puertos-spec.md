# 2026-10-31 — Especificación: asignación automática de puertos libres

Estado: aprobado e implementado; verificación web pendiente por dependencias locales ausentes.
Responsable: José González (solicitante). Asistente: Codex; versión exacta del modelo no disponible.
Plan: [Plan 2](../plans/2026-10-31-configurar-puertos-plan.md).

## Objetivo

Al arrancar el entorno de desarrollo, elegir automáticamente puertos libres y comunicar las direcciones efectivas a los consumidores. No exigir al usuario editar puertos en .env.

## Diseño propuesto

Un lanzador Node coordina backend, web y Expo por defecto; una opción explícita propuesta --mock añade el servidor simulado, usando herramientas ya instaladas y el entorno de los procesos hijos. Backend obtiene un puerto del sistema operativo; los CLI restantes usan selección con comprobación de escucha y reintentos limitados ante colisiones. Consultar sus capacidades actuales antes de concretar implementación. No se escriben archivos de descubrimiento ni se añaden dependencias.

## Criterios de aceptación

1. Un puerto ocupado no exige edición manual ni provoca terminar procesos ajenos.
2. Web y móvil reciben la dirección efectiva del backend antes de arrancar; con --mock, el móvil recibe también la URL efectiva del mock; /auth/login permanece intacto.
3. Los puertos no se repiten entre procesos de la misma sesión y no se anuncian como listos antes de confirmar escucha.
4. Fallos no relacionados con colisiones no se ocultan; arranque y reintentos tienen límites.
5. Ctrl+C o un fallo parcial cierra los procesos propios, incluidas descendencias en Windows.
6. El móvil físico recibe un host LAN accesible; múltiples interfaces permiten indicar host. No prometer acceso del backend mediante el túnel de Expo.
7. Un cambio de puerto al reiniciar exige reiniciar la sesión coordinada, manteniendo coherentes las URLs.
8. Sin cambios de base de datos, Docker, producción ni mecanismos de autenticación. Sin instalación automática de dependencias.

## Decisiones pendientes

Alcance confirmado: backend, web y Metro/Expo por defecto; mock opcional. Diseño aprobado al solicitar implementación con subagentes. La configuración individual existente se conserva. Sin mock, no iniciar ni reservar puertos para json-server; conservar el fallback existente del móvil, que puede fallar si intenta acceder a un mock ausente.

No se añaden endpoints, entidades ni modelos Prisma. Resultados y verificación se registrarán únicamente en el plan.
