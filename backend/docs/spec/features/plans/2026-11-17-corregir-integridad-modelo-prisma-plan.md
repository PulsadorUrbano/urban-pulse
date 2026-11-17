# 2026-11-17 — Plan de implementación: corregir la integridad del modelo Prisma

> Documento de la primera fase. Las decisiones y comprobaciones finales de esta PR se actualizan en [cierre del modelo](../specs/2026-11-17-cerrar-modelo-asignaciones-spec.md) y su [plan](../plans/2026-11-17-cerrar-modelo-asignaciones-plan.md).

- Rama: `fix/prisma-model-integrity`, desde `dev`.
- Especificación: [Contrato y criterios](../specs/2026-11-17-corregir-integridad-modelo-prisma-spec.md).
- Estado: implementado; verificación con base de datos pendiente.

## Preparación

- [x] Leer `AGENTS.md`, `CONTRIBUTING.md`, esquema, migraciones y flujos afectados.
- [x] Consultar Prisma 7 en Context7 y reglas de PostgreSQL.
- [x] Generar el cliente Prisma y ejecutar la línea base: 24 archivos y 288 pruebas correctas.

## Trabajo

- [x] Añadir pruebas para categorías persistidas, catálogo inválido, ubicación opcional, coordenadas emparejadas, dirección normalizada, descripción y cambios de prioridad automáticos. Se observaron fallos antes de corregir el comportamiento.
- [x] Actualizar Prisma y crear migración incremental con comprobaciones previas de datos existentes. El SQL incorpora restricciones `CHECK` y disparadores que Prisma no representa.
- [x] Adaptar servicios y documentación de endpoints a las relaciones y restricciones.
- [x] Generar cliente, compilar, ejecutar lint y pruebas unitarias; revisar el diff.

## Confirmación de implementación

- Estado final: implementado con verificación de base de datos pendiente.
- Fecha de revisión: 2026-11-17.
- Resultado entregado: categorías y activos persistibles; claves foráneas para propietarios e historiales; cambios de prioridad manuales y automáticos; asignaciones y coordenadas protegidas; validación de título y descripción; estados adicionales; dirección asociada a la ubicación y contexto urbano opcional. El catálogo HTTP conserva su forma y orden inicial.
- Pruebas: `pnpm test`, 24 archivos y 297 pruebas correctas.
- Compilación: `pnpm run build`, correcta; cliente Prisma 7.10.1 generado.
- Lint: `pnpm run lint`, sin errores; dos avisos previos en pruebas de autenticación y semilla de desarrollo.
- Esquema: `prisma validate` correcto; el SQL base se contrastó con `prisma migrate diff` y se añadieron controles de datos históricos.
- `git diff --check`: correcto.
- Limitaciones: la migración no se ejecutó contra una base de datos real. Elimina filas históricas de ubicación completamente vacías y se detiene ante otras referencias o ubicaciones inválidas; deben corregirse antes del despliegue. Los nuevos estados no tienen transiciones HTTP y el contexto urbano no tiene endpoint público.
