# Bugs que se deben arreglar

---
**PLANTILLA** (no eliminar: guía permanente de formato)

## Nombre Feature

> La fecha junto al asunto es la fecha en la que se registró el bug.

- [ ] ASUNTO (DD-MM-YY): descripción breve, suficiente para entender qué falla.
---

## Login

- [ ] Token pedido a un endpoint retirado del backend (27-10-26): `requestToken` en `src/services/authService.ts` llama a `POST /auth/token`, que ya no existe en el backend (`backend/src/auth/auth.controller.ts` solo expone `POST /auth/register`, `POST /auth/login` y `GET /auth/me`). Con el backend real levantado, esa petición falla siempre y la web cae al token local de fallback. Hay que migrar a `POST /auth/login` con `usernameOrEmail` y `password`.
