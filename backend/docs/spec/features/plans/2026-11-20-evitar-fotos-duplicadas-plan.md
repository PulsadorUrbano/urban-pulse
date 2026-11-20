# 2026-11-20 — Plan para evitar fotos duplicadas

- Objetivo: recuperar una subida confirmada al reintentar la misma tanda.
- Arquitectura: reutilizar el servicio de fotos, el modelo Prisma y el bloqueo por incidencia.
- Herramientas: NestJS, Prisma 7.10.1, PostgreSQL y Vitest.
- Especificación: [Contrato y criterios](../specs/2026-11-20-evitar-fotos-duplicadas-spec.md).
- Rama: `fix/200-idempotencia-fotos`.
- Estado: implementación y comprobaciones locales terminadas.

## Restricciones generales

Mantener el contrato compatible, comprobar la propiedad de la incidencia antes de aceptar la clave y conservar las fotos históricas. Verificar con compilación, lint y pruebas unitarias.

## Focos de revisión

- Reintento con la galería al límite y renovación de URLs de lectura.
- Confirmación concurrente y limpieza de objetos provisionales.
- Clave mal formada, autenticación y clientes que omiten la cabecera.

## Mapa de archivos

| Ruta desde la raíz | Responsabilidad |
| --- | --- |
| `backend/src/incidents/incidents.controller.ts` | Leer, validar y documentar la cabecera. |
| `backend/src/incidents/services/fotos-incidencia.service.ts` | Reconocer la tanda confirmada y controlar solicitudes concurrentes. |
| `backend/prisma/schema.prisma` y `backend/prisma/migrations/20261120010000_fotos_idempotentes/migration.sql` | Guardar la clave dentro de la transacción de imágenes. |
| `backend/test/incidents/` | Verificar el contrato HTTP y el servicio con dobles de Prisma y S3. |
| `backend/docs/spec/endpoint/post-incidents-id-images/README.md` | Documentar la cabecera, su alcance y retención. |

## Preparación

- [x] Revisar #200, #185, #193, las instrucciones del repositorio, el catálogo de endpoints y el código vigente en `dev`.
- [x] Consultar la documentación de NestJS y Prisma.

## Implementación

- [x] Añadir la migración nullable y conectar el guardado de la clave al flujo existente.
- [x] Leer la cabecera en el controlador y actualizar el contrato del endpoint.
- [x] Cubrir el reintento al límite, la concurrencia y la validación de la cabecera con pruebas unitarias.
- [x] Ejecutar `pnpm run build` y `pnpm exec prisma validate --config prisma7.config.ts`.
- [x] Ejecutar `pnpm test`. Pasaron 309 pruebas de 27 archivos.
- [x] Ejecutar `pnpm run lint`. Pasó con dos avisos en pruebas de seed y autenticación ajenas al cambio.
- [x] Comprobar el parche con `git diff --check`.
