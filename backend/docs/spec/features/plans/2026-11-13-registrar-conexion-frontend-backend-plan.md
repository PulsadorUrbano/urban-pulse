# 2026-11-13 — Plan para registrar peticiones HTTP del backend

- Rama: `feat/logs`, desde `feature/asignaciones-backend` (`d33ba5d`).
- [Especificación](../specs/2026-11-13-registrar-conexion-frontend-backend-spec.md).
- Estado: implementación backend hecha; comprobación real con frontend pendiente.

## Pasos

- [x] Revisar la conexión actual: el frontend web usa `/api` mediante Vite o nginx; NestJS ya incorpora `Logger` y Observe.
- [x] Consultar en Context7 el registro de middleware global con `app.use()`.
- [x] Retirar la cabecera diagnóstica y todos los cambios en `frontend-web` del intento anterior.
- [x] Escribir una prueba que falle sin el registro de peticiones y cubra datos sensibles y rutas omitidas.
- [x] Añadir `backend/src/configuracion/registro-conexion-web.ts` y registrarlo en `backend/src/main.ts`.
- [x] Ejecutar la suite, compilación, lint y revisión del diff finales.
- [ ] Cotejar una acción del frontend con Network y el log del backend cuando exista un entorno operativo.

## Archivos

- `backend/src/configuracion/registro-conexion-web.ts`: log HTTP de una línea para rutas API reconocidas.
- `backend/src/main.ts`: registro único del middleware.
- `backend/test/configuracion/registro-conexion-web.spec.ts`: una comprobación de salida y otra de exclusiones.

## Confirmación de implementación

- Resultado: backend instrumentado sin cambios en frontend; pendiente únicamente la comprobación real de conexión.
- Entorno de prueba real: no hay `.env` local ni servicios escuchando; Compose requiere `DB_NAME`, `DB_USER` y `DB_PASSWORD`. El backend necesita además `DATABASE_URL` y JWT para arrancar. No se han aplicado migraciones.
- Comprobaciones finales: `pnpm test -- --reporter=dot` 288/288; `pnpm run build` correcto; `pnpm run lint` código 0 con dos avisos preexistentes en pruebas de auth y dev-seed; `npm test -- --reporter=dot` en frontend 55/55; `git diff --check` correcto y `git diff --quiet -- frontend-web` confirma que no hay cambios allí.
