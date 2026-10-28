# 2026-10-26 - Especificación: resolver conflictos de backend con token

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA: identificador exacto no expuesto por la sesión.
- Rama: fix-resolve-backend-conflicts.
- Última actualización: 2026-10-26.
- Estado: resolución de backend implementada y verificada; merge pendiente de commit.
- Plan: [Ejecución y confirmación](../plans/2026-10-26-resolver-conflictos-backend-con-token-plan.md).
- Referencia: petición de fusionar token-backend y crear esta rama con informe de conflictos.

## Objetivo y decisiones vigentes

Completar la resolución del merge de origin/feature/token-backend (8ea1ddc) sobre feature/registro-incidencia-backend (d37c4ab), trasladando el trabajo a fix-resolve-backend-conflicts y conservando ambas funcionalidades. Generar el informe solicitado, además de especificación y plan. Sin commit ni push.

## Contexto verificado

El merge real dejó 17 rutas sin resolver. Autenticación estaba eliminada en destino: cinco fuentes modificadas en origen entraron en conflicto, pero otros archivos necesarios no reaparecieron automáticamente por no haber cambiado desde la base. También faltaban dependencias y registros de módulos, sin que Git los señalara como conflictos textuales.

## Contrato HTTP

Conservar POST /auth/register, POST /auth/login y GET /auth/me de token; POST /auth/token permanece retirado. Conservar categorías, registro, consultas, cambio de estado y prioridad de incidencias, y archivos estáticos /uploads. Añadir esquema Bearer a Swagger; no aplicar automáticamente guardas ni vinculación de identidad a los endpoints de incidencias.

## Modelos y objetos Prisma

Combinar Incident, IncidentLocation, IncidentImage, CambioEstado y CambioPrioridad con users, citizens y profile_role. Generar cliente único con Prisma 7.10.1. No inventar relaciones entre civicId/actorId y users ni cambiar sus contratos. El modelo de identidad usa PostgreSQL; incidencias e historiales siguen en Map e imágenes locales.

## Diseño mínimo

Recuperar módulo auth completo, DTO, pipes, guardas, semilla y unitarias del origen. AppModule importa AuthModule, PrismaModule, HealthModule e IncidentsModule y registra la semilla heredada. No iniciar la app ni ejecutar semilla, db push o migraciones durante esta tarea. Auth requiere DATABASE_URL, JWT_SECRET y JWT_EXPIRES_IN al arrancar; ejemplo DB_SYNC vacío por defecto. No leer ni modificar credenciales de .env real.

Mantener las versiones Prisma 7.10.1 del destino; incorporar @nestjs/jwt y bcryptjs del origen. El lockfile del origen no permite npm ci: corregir el lock mediante npm update con --package-lock-only y luego npm ci --ignore-scripts. No usar npm install ni pnpm install.

## Criterios de aceptación

1. La rama activa es fix-resolve-backend-conflicts; la rama original permanece en d37c4ab.
2. No quedan entradas sin resolver ni marcadores de conflicto; no hay commit ni push.
3. Esquema y cliente contienen identidades e incidencias; módulos y rutas de ambas ramas conservados.
4. Ejecutar unitarias, compilación, lint y validación Prisma; documentar límites reales.
5. Catálogo combinado, guía y ejemplo de entorno coherentes con auth en PostgreSQL e incidencias en memoria.
6. Informe identifica los 17 conflictos, causas, resolución y problemas adicionales sin conflicto textual.

## Documentación de endpoints

Catálogo de backend/docs/spec/endpoint con fichas de auth e incidencias. Conservar ficha retirada post-auth-token. No documentar la existencia de auth como cierre de las deudas de identidad de #27, #47 o #28.

## Estrategia de verificación

Solo unitarias existentes de ambas ramas, sin HTTP ni servicios externos. npm test, npm run build, npm run lint y Prisma generate/validate desde backend; git diff --check, enlaces y git diff --name-only --diff-filter=U desde raíz. Resultados y confirmación en el mismo plan. El informe adicional está expresamente solicitado por el usuario.
