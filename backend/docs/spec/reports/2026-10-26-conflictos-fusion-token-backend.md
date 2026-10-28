# 2026-10-26 - Informe de conflictos al fusionar token-backend

## Alcance y referencias

- Repositorio: PulsadorUrbano/urban-pulse.
- Rama original: feature/registro-incidencia-backend, d37c4abcfd180503ea4bd05632b586a9ad6e0aaa.
- Rama incorporada: origin/feature/token-backend, 8ea1ddc8a1a09856a55f92debaa8dd8a4787bb90.
- Rama de resolución: fix-resolve-backend-conflicts.
- Evidencia: git merge --no-commit --no-ff y entradas de etapas del índice obtenidas con git ls-files -u. No es una lista de diferencias normales entre ramas.

## Los 17 conflictos reales

| Archivo | Tipo Git | Causa | Resolución aplicada |
| --- | --- | --- | --- |
| backend/.env.example | contenido | El destino retiró la configuración JWT/DB; el origen la amplió. | Conservar HTTP/Observe e incorporar JWT/DB, con DB_SYNC vacío. |
| backend/docs/spec/endpoint/README.md | add/add | Ambas ramas crearon catálogos distintos. | Unificar incidencias y autenticación; mantener /auth/token retirado. |
| backend/prisma/schema.prisma | contenido | Destino define incidencias; origen define usuarios/ciudadanos. | Combinar los modelos sin relaciones de identidad ficticias. |
| backend/src/auth/auth.controller.ts | modify/delete | Eliminado en destino y modificado en token. | Recuperar versión de token y sus dependencias. |
| backend/src/auth/auth.service.ts | modify/delete | Eliminado en destino y modificado en token. | Recuperar versión de token y sus dependencias. |
| backend/src/auth/jwt-auth.guard.ts | modify/delete | Eliminado en destino y modificado en token. | Recuperar versión de token y sus dependencias. |
| backend/src/auth/token-payload.ts | modify/delete | Eliminado en destino y modificado en token. | Recuperar versión de token y sus dependencias. |
| backend/src/dev-seed/dev-seed.service.ts | modify/delete | Eliminado en destino; origen actualiza la semilla. | Conservar versión de token, ejecutable solo en desarrollo; no ejecutada aquí. |
| backend/src/generated/prisma/browser.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/client.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/commonInputTypes.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/enums.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/internal/class.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/internal/prismaNamespace.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/internal/prismaNamespaceBrowser.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/models.ts | contenido | Cliente generado desde esquemas divergentes. | Regenerar desde el esquema combinado con Prisma 7.10.1. |
| backend/src/generated/prisma/models/users.ts | modify/delete | Eliminado en destino y generado de nuevo en origen. | Recuperar mediante generación, sin resolver a mano el tipo. |

Recuento: 10 conflictos de contenido, 1 add/add y 6 modify/delete. Nueve rutas pertenecen al cliente generado; las otras ocho corresponden a configuración, catálogo, esquema y fuentes.

## Problemas adicionales que Git no marcó como conflictos

1. Módulo incompleto: auth.module.ts y current-user.decorator.ts faltaban en destino pero no habían cambiado desde la base. Git mantuvo su eliminación sin conflicto, dejando las fuentes recuperadas con imports rotos. Se recuperó el módulo completo de token y sus DTO/pipes/unitarias.
2. AppModule no registraba AuthModule ni PrismaModule y tampoco DevSeedService. Se incorporan conservando IncidentsModule y HealthModule. PrismaModule recupera DbSyncService del origen.
3. package.json había perdido @nestjs/jwt y bcryptjs. El merge textual no los reintroducía. Se añaden preservando las versiones Prisma 7.10.1 de destino.
4. El package-lock.json de token estaba desactualizado y npm ci fallaba por paquetes ausentes o incompatibles. Se reparó el lock con npm update --package-lock-only y npm ci posterior correcto, sin npm install.
5. Swagger no declaraba el esquema Bearer. Se añadió manteniendo /uploads y el arranque Express del destino.
6. Los catálogos no compartían estructura: el origen listaba auth en tabla y el destino incidencias como lista. Se combinan enlaces explícitos y se conserva la retirada de /auth/token.
7. Cambio de requisito de arranque: auth usa PostgreSQL; importar sus módulos requiere DATABASE_URL y configuración JWT. Incidencias continúa en memoria. Importar auth no resuelve la deuda de autorización de sus endpoints.

## Criterios de resolución

Se conservaron ambas funcionalidades. Los conflictos de Prisma se resolvieron en schema.prisma y se regeneró el cliente; no se eligió una rama completa descartando la otra. DB_SYNC queda vacío por defecto en el ejemplo para evitar sincronizaciones implícitas. No se inició la API ni se ejecutaron migraciones, semillas o comandos DB.

La rama original conserva su commit inicial. El trabajo se trasladó sin perder el merge abierto a fix-resolve-backend-conflicts. Los cambios frontend-web que ya traía el origen permanecen en el merge; no se editaron manualmente y no están cubiertos por las pruebas backend de este informe.

## Verificación y estado

- Dependencias: npm ci --ignore-scripts correcto tras reparar lockfile.
- Prisma generate y validate: correctos, versión 7.10.1.
- Unitarias: 17 suites y 175 pruebas correctas.
- Compilación: correcta.
- Lint: sin errores; cuatro avisos heredados de ambas ramas (Unicode, variable sin usar y spread de instancia).
- Estado final: cero conflictos sin resolver y cero marcadores en backend; revisión estática independiente sin hallazgos accionables.
- Documentación: 8 documentos revisados sin enlaces ausentes. git diff --cached --check -- backend correcto.
- El diff global conserva avisos de espacios finales en frontend-web heredados del origen. No son conflictos de merge y no se corrigieron fuera del alcance solicitado.
- Modos de sincronización DB_SYNC no ejercitados; no se acredita su funcionamiento contra una DB real.
- Sin commit ni push. Este informe no acredita un arranque con DB real ni pruebas HTTP, frontend o de integración.

## Referencias

- [Especificación](../features/specs/2026-10-26-resolver-conflictos-backend-con-token-spec.md).
- [Plan y confirmación de implementación](../features/plans/2026-10-26-resolver-conflictos-backend-con-token-plan.md).
