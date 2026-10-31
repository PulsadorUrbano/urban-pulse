# 2026-10-31 — Especificación propuesta: unificar inicio de sesión en /auth/login

- Responsable: José González (solicitante).
- Asistente: Codex; versión exacta del modelo no disponible.
- Rama: fix/unificar-login, hija de docs/modularizar-documentacion.
- Estado: aprobado e implementado; verificación web pendiente.
- Plan: [Plan 1](../plans/2026-10-31-unificar-login-plan.md).

## Objetivo y contexto

Usar POST /auth/login en los consumidores del backend. Backend y móvil ya usan esa ruta; la web todavía solicita POST /auth/token con userId. El cambio mínimo afecta a esa petición web y a sus pruebas y documentación.

## Contrato vigente

Entrada: usernameOrEmail y password. Respuesta 200 con accessToken; errores 400 por entrada inválida y 401 por credenciales incorrectas. Conservar las validaciones existentes de LoginPipe, POST /auth/register y GET /auth/me.

No se cambia el backend, el móvil, los modelos ni la persistencia. La validación local y el fallback mock de la web permanecen: su migración completa a autenticación real queda fuera de este cambio. Los puertos dinámicos se abordarán posteriormente.

## Criterios de aceptación

1. La petición web usa POST /auth/login y envía usernameOrEmail y password en lugar de userId.
2. Se conserva el manejo de accessToken y la consulta existente a /auth/me.
3. Pruebas y documentación afectadas reflejan el contrato vigente.
4. Se ejecutan pruebas de autenticación y compilación web, registrando cualquier bloqueo del entorno.

## Documentación del endpoint

[POST /auth/login](../../endpoint/post-auth-login/README.md).
