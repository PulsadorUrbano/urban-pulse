# 2026-11-16 — Plan de implementación: crear workflow del backend

- Objetivo: verificar compilación, lint y unitarias del backend en GitHub Actions.
- Arquitectura: un job con comandos existentes y caché de pnpm.
- Herramientas: Node 22 y pnpm 10.34.8.
- Especificación: [Contrato y criterios](../specs/2026-11-16-crear-workflow-backend-spec.md).
- Rama: `chore/161-workflow-backend`.
- Estado: implementado y verificado localmente y en GitHub Actions.

## Restricciones generales

Conservar los cambios locales ajenos. Usar español y pnpm. No modificar dependencias, endpoints, esquema ni consumidores. Ejecutar exclusivamente unitarias. La instalación con lockfile congelado queda autorizada en el runner por el alcance del workflow.

## Focos de revisión

Comprobar la ruta del lockfile, el directorio de ejecución, la generación previa de Prisma y los disparadores para la PR apilada.

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | .github/workflows/backend-build.yml | Instalación y verificaciones |
| Crear | backend/docs/spec/features/specs/2026-11-16-crear-workflow-backend-spec.md | Requisitos |
| Crear | backend/docs/spec/features/plans/2026-11-16-crear-workflow-backend-plan.md | Progreso y evidencia |

## Preparación y tarea: automatizar las verificaciones

- [x] Leer instrucciones, estado Git, configuración y plantillas.
- [x] Consultar Context7 sobre caché y preparación de pnpm.
- [x] Crear el workflow con filtros de rutas, permisos de lectura y comandos existentes.
- [x] Ejecutar build, lint y unitarias; revisar YAML y diff.
- [x] Publicar los archivos del alcance y crear [PR #167](https://github.com/PulsadorUrbano/urban-pulse/pull/167) sobre S3 #160.

No se añaden pruebas que repliquen el YAML. No hay cambios de contratos que requieran documentación de endpoints.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | pnpm test | 306 pruebas y 27 archivos correctos |
| Compilación | pnpm run build | Correcta, incluida generación de Prisma |
| Lint | pnpm run lint | Sin errores ni advertencias tras corregir las dos pruebas existentes |
| Diff | git diff --check | Correcto |
| YAML | Analizador yaml 2.9.1 ya instalado | Sintaxis válida; eventos y siete pasos comprobados |

## Confirmación de implementación

- Estado final: implementado y verificado.
- Fecha de revisión: 2026-11-16.
- Resultado: workflow creado y documentación del alcance preparada.
- Verificación local: restauradas las dependencias con `pnpm install --frozen-lockfile`, sin modificar el manifiesto ni el lockfile. El primer intento de build y tests falló porque faltaba instalar `@aws-sdk/cloudfront-signer`; tras restaurar el lockfile ambos pasan.
- Decisión: permitir PR hacia cualquier rama para comprobar también el stack sobre S3.
- GitHub Actions: [primera ejecución](https://github.com/PulsadorUrbano/urban-pulse/actions/runs/43849284281) correcta sobre el commit `29888ab`: instalación, generación de Prisma, compilación, lint y unitarias con Node 22 en Ubuntu.
- Criterios de aceptación: filtros y versiones revisados en el YAML; comandos verificados en el runner sin servicios externos; PR #167 apilada sobre #160 y vinculada al issue #161.
- Limitación: el entorno local usa Node 24.21.0; el runner confirma las verificaciones con Node 22.

### Corrección de advertencias solicitada el 2026-11-16

- En `test/dev-seed/services/dev-seed.service.spec.ts`, eliminar la variable `logSpy` sin uso, conservando el doble del logger y su restauración.
- En `test/auth/services/auth.service.spec.ts`, construir la entrada sin teléfono mediante campos explícitos en lugar de aplicar spread sobre el tipo de clase DTO.
- Verificación tras los cambios: lint sin errores ni advertencias, 306 pruebas correctas en 27 archivos y compilación correcta. Se conservan las aserciones y el comportamiento de las pruebas.

### Resolución de conflictos con la rama base (2026-11-17)

- Integrada la base feat-integracion-s3 en la rama de la PR #167 mediante un commit de merge.
- Resueltos 16 archivos en conflicto conservando las versiones actuales de S3 y del flujo web, incluida la recuperación de URLs de fotos y la respuesta correcta de los PATCH cuando falla la firma.
- Conservados el workflow, las correcciones de lint y los cambios previos de la rama.
- Comprobaciones locales: YAML válido con siete pasos, sin marcadores de conflicto ni errores de whitespace en los cambios; los archivos en conflicto coinciden con la base actual.
- Generación de Prisma, compilación, lint y unitarias intentados pero bloqueados por dependencias no disponibles en la copia aislada. El entorno impide enlazar node_modules; no se presentan estas comprobaciones como superadas. La ejecución completa corresponde al workflow de la PR.
