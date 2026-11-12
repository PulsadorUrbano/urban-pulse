# Bugs que se deben arreglar

---
**PLANTILLA**
**No se debe eliminar este párrafo. Debe servir como guía permanente para no alucinar y plantear otra estructura**

## Nombre Feature

> La fecha a la derecha del asunto será la fecha en la que se registró el bug a arreglar

- [] ASUNTO (DD-MM-YY): DESCRIPCIÓN *(No debe ser excesivamente larga, suficiente para que se entienda qué falla)*
---

## Login

- [x] ~~Token pedido a un endpoint retirado del backend (27-10-26)~~: `requestToken` en `src/services/authService.ts` llamaba a `POST /auth/token`, que ya no existe en el backend (`backend/src/auth/auth.controller.ts` solo expone `POST /auth/register`, `POST /auth/login` y `GET /auth/me`). Corregido con `POST /auth/login` + `GET /auth/me`, ver `bugs/login/28-10-26-login-web-no-conecta-con-el-backend.md`.

## General

> Bugs no atados a una feature concreta porque afectan a varias vistas a la vez (análogo a `refactor/independent/`).

- [] CORS en producción (28-10-26): `backend/src/main.ts` no activa CORS. En desarrollo no afecta porque la web usa el proxy `/api` de Vite, pero si en producción la web y la API se sirven desde dominios distintos (`VITE_BACKEND_URL` con otro origen), el navegador bloqueará las peticiones. Lo tiene que resolver el equipo de backend.
- [x] ~~Errores de lint previos en incidencias (28-10-26)~~: `no-unused-vars` en `useIncidentValidation.js` e `incidentService.js`. Desaparecen al migrar esos archivos a TypeScript, ver `features/07-11-26-migracion-typescript-backend/plan.md`.

## Validación de incidencias

- [] Sin listado de incidencias pendientes para el personal (07-11-26): `GET /incidents` exige el `civicId` de un ciudadano, así que el panel no puede listar las incidencias `reported`. La web abre la incidencia con `?incidencia=<id>` en la URL hasta que el backend ofrezca ese listado. Pedido en el issue #130.
