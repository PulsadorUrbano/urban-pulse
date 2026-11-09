# 2026-10-31 — Plan 1 propuesto: unificar el inicio de sesión en /auth/login

Estado: plan aprobado; implementado con verificación pendiente por dependencias web ausentes.
Rama: fix/unificar-login, hija de docs/modularizar-documentacion.

## Decisión confirmada

Usar POST /auth/login como endpoint común. El backend ya lo expone y el móvil ya lo consume. Conservar POST /auth/register y GET /auth/me.

## Propuesta mínima (Ponytail)

1. Mantener las rutas actuales del backend y del móvil: no necesitan cambios para esta unificación.
2. Adaptar la petición de token web de POST /auth/token a POST /auth/login. Enviar usernameOrEmail y password en lugar de userId, pasando las credenciales desde el formulario a la petición.
3. Actualizar las pruebas web para comprobar la ruta y el cuerpo de la petición, así como el uso de accessToken y la consulta existente a /auth/me.
4. Revisar y actualizar únicamente la documentación que describa el consumidor web del endpoint retirado /auth/token.
5. Ejecutar las pruebas de autenticación y la compilación web. Actualmente faltan las dependencias locales de web; registrar el bloqueo si persiste, sin instalar dependencias automáticamente.

## Alcance y limitaciones

La web actualmente valida usuarios locales antes de solicitar el token y conserva mecanismos mock. Adaptar esta petición no equivale a migrar toda la autenticación web al backend. Cualquier cambio de ese comportamiento debe acordarse por separado.

No se necesitan alias ni cambios de controlador: /auth/login ya es el contrato vigente. No añadir dependencias, capas ni abstracciones.

Fuera de alcance: puertos dinámicos, base de datos, despliegue y rediseño de mecanismos mock. Sin commits ni push.

## Criterios de aceptación propuestos

- La web solicita POST /auth/login con usernameOrEmail y password, sin enviar userId como credencial.
- La web utiliza accessToken de la respuesta y conserva la consulta de sesión existente.
- Backend y móvil conservan sus rutas y comportamiento.
- Las pruebas y la documentación afectadas reflejan la petición web actualizada.

## Confirmación de implementación

El usuario aprobó aplicar el plan. Se adaptaron el servicio web, sus pruebas de ruta y cuerpo y la ficha del endpoint retirado. Backend y móvil sin cambios de código.

Comprobaciones: npm test -- src/__tests__/services/authService.test.ts y npm run build desde frontend-web bloqueados porque vitest y vite no están instalados localmente. No se instalaron dependencias. Un primer intento de prueba se lanzó por error desde la raíz y falló por ausencia de package.json; se corrigió la carpeta. No se afirma que las pruebas pasen. git diff --check correcto.

Pendiente: ejecutar pruebas y compilación web cuando estén disponibles sus dependencias. Sin commits ni push.
