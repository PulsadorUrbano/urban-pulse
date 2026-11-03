# Bugs que se deben arreglar

---
**PLANTILLA**
**No se debe eliminar este párrafo. Debe servir como guía permanente para no alucinar y plantear otra estructura**

## Nombre Feature

> La fecha a la derecha del asunto será la fecha en la que se registró el bug a arreglar

- [] ASUNTO (DD-MM-YY): DESCRIPCIÓN *(No debe ser excesivamente larga, suficiente para que se entienda qué falla)*
---

## Login

- [] Token pedido a un endpoint retirado del backend (27-10-26): `requestToken` en `src/services/authService.ts` llama a `POST /auth/token`, que ya no existe en el backend (`backend/src/auth/auth.controller.ts` solo expone `POST /auth/register`, `POST /auth/login` y `GET /auth/me`). Con el backend real levantado, esa petición falla siempre y la web cae al token local de fallback. Hay que migrar a `POST /auth/login` con `usernameOrEmail` y `password`.
