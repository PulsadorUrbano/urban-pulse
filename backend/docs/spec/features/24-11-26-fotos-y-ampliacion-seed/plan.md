# 2026-11-24 — Plan de implementación: ampliar el seed masivo a 50.000 incidencias con una foto real en S3

- Desarrollador responsable: Sofía Si Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA: `claude-opus-5-5`.
- Objetivo: 50.000 incidencias de prueba, cada una con una foto real y coherente con su tipo almacenada en S3.
- Arquitectura:
  - Script SQL transaccional que reutiliza los actores del primer seed.
  - Banco de fotos versionado.
  - Script Node que copia las fotos dentro de S3 con `CopyObject`.
- Herramientas: Prisma 7.10.1, PostgreSQL 16 (PostGIS), `@aws-sdk/client-s3` y `@prisma/adapter-pg`, ya disponibles. No se añaden dependencias.
- Especificación: [Contrato y criterios](spec.md).
- Rama: `feature/seed-fotos-incidencias`.
- Estado: ampliación y ensayo del script de fotos verificados en local; subida real a S3 pendiente.

## Restricciones generales

- Sin cambios de código de la aplicación ni dependencias. Único cambio de esquema: la tabla `SeedIncident` (tarea 4, revisión del PR #219).
- Documentar en español y sin emojis (AGENTS.md); los autores de las fotos se normalizan para cumplirlo.
- No ejecutar `pnpm install` ni `npm install`.
- No escribir en S3 ni en la BD de la nube desde el asistente: lo ejecuta una persona del equipo con sus credenciales.
- Fotos solo con licencias CC0, de dominio público, CC BY o CC BY-SA, revisadas a mano y sin metadatos.

## Focos de revisión

| Riesgo | Tarea | Comprobación |
| --- | --- | --- |
| Ampliación duplicada (datos irreversibles) | 2 | Reejecución, que debe abortar con `Ampliación del seed ya aplicada` |
| Actores del primer seed no encontrados o incompletos | 2 | Guarda de estructura (6 departamentos, 12 equipos, 36 técnicos) |
| Foto incoherente con la incidencia | 1 y 3 | Todas las plantillas tienen al menos una foto propia por título |
| Objetos fuera del prefijo permitido por IAM y CloudFront | 3 | Claves bajo `incidents/` |
| Fila `IncidentImage` sin objeto en S3 | 3 | La fila solo se inserta tras una copia correcta |
| Atribución incompleta | 1 | Manifiesto con autor, licencia y origen; `CREDITOS.md` |

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | backend/prisma/seed/fotos/ (100 JPEG, `manifest.json`, `CREDITOS.md`) | Banco de fotos y atribución |
| Crear | backend/prisma/seed/incidencias-masivas-ampliacion.sql | 45.000 incidencias más |
| Crear | backend/prisma/seed/fotos-incidencias.mjs | Subida de fotos base, copias y filas `IncidentImage` |
| Crear | backend/prisma/seed/reparto-fotos.mjs y reparto-fotos.d.mts | Reparto de copias entre trabajadores y parada ante un fallo de la BD |
| Crear | backend/test/seed/reparto-fotos.spec.ts | Pruebas del reparto |
| Crear | backend/prisma/migrations/20261127000000_registro_incidencias_seed/ | Tabla `SeedIncident` |
| Modificar | backend/prisma/schema.prisma | Modelo `SeedIncident` y relación en `Incident` |
| Modificar | backend/prisma/seed/incidencias-masivas.sql | Registro de sus 5000 incidencias en `SeedIncident` |
| Modificar | backend/package.json | Comandos `seed:incidencias:ampliacion` y `seed:fotos` |
| Crear | backend/docs/spec/features/24-11-26-fotos-y-ampliacion-seed/ | Especificación y plan |

## Preparación

- [x] Crear la rama `feature/seed-fotos-incidencias` desde `origin/dev`, que ya incluye el PR #209.
- [x] Comprobar el estado de la BD local: 5001 incidencias (primer seed aplicado) y 0 fotos.
- [x] Comprobar las restricciones de S3: la política IAM y CloudFront solo cubren `incidents/*`, y `objectKey` es único.

## Tarea 1: banco de fotos

- [x] Buscar candidatas en la API de Wikimedia Commons, con filtro de licencia, y revisarlas en hojas de contactos.
- [x] Seleccionar 100 fotos que cubren las 44 plantillas: 18 de residuos (contenedores quemados, rotos, desbordados y enseres), 17 de otros (10 de vías de metro, obras nocturnas, cucarachas y animales muertos), 14 de señalización (5 de atascos), 13 de pavimentos, 8 de zonas verdes, 8 de mobiliario, 7 de alumbrado, 6 de limpieza, 5 de agua y 4 de accesibilidad.
- [x] Descartar personas reconocibles, matrículas legibles y fotos que no muestran el problema.
- [x] Redimensionar a 1024 px y recodificar sin metadatos: 22 MB en total.
- [x] Generar `manifest.json` y `CREDITOS.md`, sin emojis en los autores.

## Tarea 2: ampliación SQL

- [x] Reutilizar los generadores del primer seed (usuarios, direcciones, plantillas, incidencias, historial y comprobaciones).
- [x] Localizar los actores del primer seed por nombre y por el hash común de `seed1234`.
- [x] Añadir el marcador `5eed0000-0000-4000-8000-000000000002`, 300 ciudadanos y 3 plantillas (dos de atascos y una de metro).

## Tarea 3: script de fotos

- [x] Paso A: subida idempotente de las fotos base a `incidents/_seed/base/`.
- [x] Paso B: `CopyObject` concurrente e inserción por lotes, con reanudación.
- [x] Selección de foto por título, después por activo y después por categoría, estable por UUID.
- [x] Opciones `--dry-run`, `--limit` y `--concurrencia`.

## Tarea 4: cambios pedidos en la revisión del PR #219 (2026-11-27)

- [x] Si falla `createMany`, detener el reparto de copias y de lotes, esperar a los trabajadores en curso y relanzar el error antes de desconectar Prisma (`reparto-fotos.mjs`).
- [x] Prueba que reproduce el fallo de `createMany` con trabajadores concurrentes (`test/seed/reparto-fotos.spec.ts`).
- [x] Identificación estable de las incidencias del seed: tabla `SeedIncident`, rellenada por los dos seeds; el script de fotos selecciona por ella en lugar del hash de `seed1234`.
- [x] La ampliación aborta si `SeedIncident` no tiene las 5000 incidencias del primer seed (BD con una versión anterior del primer seed: recrearla con `docker compose down -v`).

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Ensayo de la ampliación | script con `ROLLBACK` vía `psql` en el contenedor | 45.000 nuevas; total 50.001; 0 con asignación incompleta; 1016 de metro y 2099 de atascos |
| Ejecución real | `psql` en el contenedor | Correcta en unos 4,7 s; 50.001 incidencias y 151.642 `status_changes` |
| Reejecución | mismo comando | `ERROR: Ampliación del seed ya aplicada`; sin cambios |
| Cobertura de fotos | `jq` sobre el manifiesto y las plantillas del SQL | Las 44 plantillas tienen foto propia; 100 archivos existentes; ninguno duplicado |
| Licencias | `jq` sobre el manifiesto | 11 CC0, 3 de dominio público, 13 CC BY y 73 CC BY-SA, todas con autor y origen |
| Sintaxis del script | `node --check` | Correcta |
| Ensayo del script de fotos | `docker exec urbanpulse_backend node prisma/seed/fotos-incidencias.mjs --dry-run` | 50.000 incidencias del seed con foto asignable, 0 sin foto compatible, 100/100 fotos usadas (de 91 a 1737 usos por foto); 0 filas `IncidentImage` escritas |
| Unitarias | `pnpm test` | 273 superadas y 1 fallida; mismo resultado que antes de estos cambios (faltan módulos en el `node_modules` local) |
| Integración con `dev` (2026-11-26) | `git merge origin/dev` | Un conflicto en `backend/package.json` (scripts): se conservan `perf:baseline` de `dev` y los tres scripts de seed. `dev` no modifica `prisma/`, el servicio de fotos ni el Dockerfile |
| Build tras integrar `dev` | `pnpm install --frozen-lockfile` y `pnpm run build` | Correcto, sin cambios en el lockfile |
| Lint tras integrar `dev` | `pnpm run lint` | 0 errores; 2 avisos ya presentes en `dev` (`dev-seed.service.spec.ts` y `auth.service.spec.ts`) |
| Unitarias tras integrar `dev` | `pnpm test` | 28 archivos y 363 pruebas superadas; el fallo anterior se debía al `node_modules` local incompleto |
| Sintaxis del script tras integrar `dev` | `node --check prisma/seed/fotos-incidencias.mjs` | Correcta |
| Diff | `git diff --check` | Sin errores |
| Prueba del reparto (2026-11-27) | `pnpm exec vitest run test/seed/reparto-fotos.spec.ts` | 2 superadas. Con el algoritmo anterior, el mismo escenario deja 3 copias activas al rechazar y lanza 6 copias y 3 lotes tras el fallo; con el nuevo, 0 |
| Migración (2026-11-27) | `prisma migrate diff` contra la BD local y arranque con `DB_SYNC=deploy` | El diff solo contiene `SeedIncident`; 10 migraciones aplicadas |
| Seeds desde cero (2026-11-27) | `psql` en el contenedor | Primer seed: 5000 incidencias y 5000 registradas. Ampliación: 50.000 y 50.000. Reejecuciones: `Ampliación del seed ya aplicada` y `Seed ya aplicado` |
| Ampliación sobre el primer seed anterior (2026-11-27) | `psql` en el contenedor | `ERROR: El primer seed no tiene sus 5000 incidencias en "SeedIncident"...`; sin cambios |
| Ensayo del script de fotos (2026-11-27) | `pnpm seed:fotos --dry-run` | 50.000 con foto asignable, 0 sin foto compatible, 100/100 fotos usadas |
| Build, lint y unitarias (2026-11-27) | `pnpm run build`, `pnpm run lint`, `pnpm test` | Correcto; 0 errores y los 2 avisos ya presentes; 29 archivos y 365 pruebas superadas |
| Primera prueba real (`--limit 20`) | `docker exec urbanpulse_backend node prisma/seed/fotos-incidencias.mjs --limit 20` | `UnknownError` (HTTP 403 en `HeadObject` por falta de `s3:ListBucket`). Corregido: 403 y 404 se tratan como objeto inexistente y los errores muestran el código HTTP |

## Confirmación de implementación

- Estado final: implementado; falta verificar la subida real a S3 (criterio 5).
- Fecha de revisión: 2026-11-27.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. +45.000 en una transacción | Ejecución real en local | Cumplido |
| 2. Guardas de la ampliación | Reejecución abortada | Cumplido (el caso sin primer seed no se ha probado en local) |
| 3. Fotos con licencia y cobertura | Manifiesto y `CREDITOS.md` | Cumplido |
| 4. `--dry-run` sin escrituras | Ensayo en el contenedor del backend y recuento de `IncidentImage` (0) | Cumplido |
| 5. Foto en S3 y URL firmada | — | Pendiente de credenciales AWS |
| 6. Sin cambios de código ni dependencias; solo `SeedIncident` en el esquema | `git status` y `prisma migrate diff` | Cumplido |
| 7. Identificación por `SeedIncident` | Seeds desde cero y ampliación sobre el primer seed anterior | Cumplido |
| 8. Parada ante un fallo de la BD | `test/seed/reparto-fotos.spec.ts` | Cumplido |

- Decisiones y desviaciones:
  - Las fotos se reducen a 1024 px y no a 1280 px, para dejar el banco en 22 MB.
  - Se añadieron fotos para las 5 plantillas que no tenían una propia, para que ninguna incidencia reciba la foto de otra plantilla.
  - Tres candidatas no se pudieron descargar por el límite de peticiones de Wikimedia y se sustituyeron o se omitieron.
- Limitaciones y pendientes:
  - El banco de fotos entra en la imagen del backend porque el Dockerfile copia `prisma/` (unos 22 MB más).
  - En la nube hay que ejecutar `pnpm seed:incidencias` (si no está aplicado), `pnpm seed:incidencias:ampliacion` y `pnpm seed:fotos`, con credenciales que tengan `s3:GetObject` y `s3:PutObject` sobre `incidents/*`.
  - Revisión visual del 2026-11-26: unas 15 fotos encajan peor con su título. Seis de "Vía de metro dañada" muestran catástrofes ferroviarias rurales o históricas (`via-deformada`, `vias-desplazadas`, `via-destrozada`, `via-hundida`, `via-danada-estacion` y `via-tranvia-levantada`). Otras no muestran el problema con claridad (`rampa-acceso`, `calle-de-noche`, `fuente-columna`, `fuente-beber` y `senal-entre-arboles`). El resto son menores: `cucaracha-1` y `cucaracha-2`, primeros planos sin espacio público; `atasco-centro` y `atasco-avenida`, ciudades no españolas; y `senal-arrancada`, un collage. El equipo decide mantenerlas en esta fase; se pueden sustituir más adelante actualizando `manifest.json` y `CREDITOS.md`.
