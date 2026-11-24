# 2026-11-20 — Plan de implementación: poblar la base de datos con incidencias masivas de prueba

- Desarrollador responsable: Sofía Si Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA: `claude-opus-5-5`.
- Objetivo: insertar unas 5000 incidencias de prueba coherentes con un solo comando, en local y en la nube.
- Arquitectura: un script SQL transaccional ejecutado con `prisma db execute`. Se reutilizan los catálogos de categorías y activos urbanos que crean las migraciones.
- Herramientas: Prisma 7.10.1 y PostgreSQL 16 (PostGIS), ya disponibles. No se añaden dependencias.
- Especificación: [Contrato y criterios](spec.md).
- Rama: `feature/seed-incidencias-masivas`.
- Estado: implementado y verificado en local; ejecución en la nube pendiente.

## Restricciones generales

- Respetar el alcance de la especificación: sin fotos, sin cambios de esquema y sin código de la aplicación.
- Documentar en español y sin emojis (AGENTS.md).
- No ejecutar `pnpm install` ni `npm install`.
- No ejecutar el seed contra la BD de la nube sin haberlo probado antes en local: los datos no se pueden borrar.
- Restricciones particulares: título de 4 a 35 caracteres; un usuario por equipo; técnico del mismo equipo con `isTechnician`; prioridad automática sin actor; ubicación obligatoria en la misma transacción.

## Focos de revisión

| Riesgo | Tarea | Comprobación |
| --- | --- | --- |
| Datos irreversibles duplicados | 1 | Reejecución, que debe abortar con `Seed ya aplicado` |
| Estado sin asignación completa (trigger `validar_transicion`) | 1 | Consulta de asignación incompleta |
| Historial que no termina en el estado final o tiene fechas futuras | 1 | Comprobación interna del script y consulta posterior |
| Incidencia sin ubicación (trigger diferido) | 1 | Comprobación interna y consulta posterior |
| Choque con usuarios o departamentos existentes en la nube | 1 | Filtro `NOT EXISTS` sobre usuarios y guarda de nombres de departamento |
| Contraseña no compatible con `bcryptjs` | 1 | `crypt()` en una transacción revertida |

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | backend/prisma/seed/incidencias-masivas.sql | Generación transaccional de actores, incidencias e historial. |
| Modificar | backend/package.json | Script `seed:incidencias`. |
| Crear | docs/spec/features/20-11-26-poblar-incidencias-masivas/spec.md | Requisitos y uso operativo. |
| Crear | docs/spec/features/20-11-26-poblar-incidencias-masivas/plan.md | Plan, decisiones y resultados reales. |

## Preparación

- [x] Leer AGENTS.md, CONTRIBUTING.md, `schema.prisma`, las migraciones con triggers y el servicio de incidencias (actores de cada transición).
- [x] Crear la rama `feature/seed-incidencias-masivas` desde `dev`.
- [x] Comprobar el estado inicial de la BD local: 1 incidencia, 2 usuarios, catálogos de categorías y activos presentes.

## Tarea 1: script SQL del seed

**Archivos:** backend/prisma/seed/incidencias-masivas.sql.

**Interfaces:** consume los catálogos `Category` y `UrbanAsset` y produce las filas descritas en la especificación.

**Criterios cubiertos:** 1, 2, 3 y 4.

- [x] Guardas: usuario marcador `5eed0000-0000-4000-8000-000000000001`, departamentos homónimos y categorías activas.
- [x] Usuarios a partir de tres listas: 40 nombres (siempre), 25 sufijos (60 %) y 22 números (50 %), con separadores `_` o `.` opcionales.
- [x] Departamentos, equipos, responsables y técnicos; 42 direcciones; 41 plantillas.
- [x] 5000 incidencias, ubicaciones e historial (`status_changes`, `assignment_changes`, `priority_changes`).
- [x] Comprobaciones finales dentro de la transacción.

## Tarea 2: comando de ejecución

**Archivos:** backend/package.json.

**Criterios cubiertos:** 5.

- [x] `"seed:incidencias": "prisma db execute --config prisma7.config.ts --file prisma/seed/incidencias-masivas.sql"`.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Ensayo sin persistir | script con `ROLLBACK` vía `psql` en el contenedor | 5000 nuevas: reported 1249, validated 780, rejected 411, assigned 725, in_progress 581, resolved 575, closed 522, reopened 158 |
| Ejecución real | `psql` en el contenedor con el mismo fichero | Correcta en unos 1,2 s; total 5001 incidencias (1 previa) |
| Reejecución | mismo comando | `ERROR: Seed ya aplicado`; sin cambios |
| Integridad | consultas de la especificación | 0 sin ubicación, 0 con asignación incompleta, 0 historiales que no cuadran |
| Historiales | recuentos | 15085 `status_changes`, 2561 `assignment_changes`, 2478 `priority_changes` |
| Contraseñas | `crypt('seed1234', password)` en una transacción revertida | 256 de 256 válidas |
| `pnpm seed:incidencias` en local | desde backend/ | Bloqueado: `P1000`, credenciales de `backend/.env` y `.env` no válidas para el volumen local existente (problema de entorno previo) |
| Unitarias | `pnpm test` | 273 superadas, 1 fallida; mismo resultado sin estos cambios (faltan `@nestjs/jwt` y `bcryptjs` en `node_modules` local) |
| Diff | `git diff --check` | Sin errores |

- [x] Revisar que cada criterio tiene evidencia.
- [x] Confirmar que no se tocaron archivos ajenos, credenciales ni servicios externos.

## Confirmación de implementación

- Estado final: Implementado con verificación pendiente (ejecución en la nube y comando npm contra una BD con credenciales válidas).
- Fecha de revisión: 2026-11-20.
- Resultado entregado: script SQL transaccional, comando `pnpm seed:incidencias` y esta documentación.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1. 5000 incidencias con ubicación en una transacción | Ejecución real y consulta de ubicación | Cumplido |
| 2. La reejecución aborta sin cambios | `ERROR: Seed ya aplicado` | Cumplido |
| 3. Asignación e historial coherentes, sin fechas futuras | Consultas de integridad y comprobaciones internas | Cumplido |
| 4. Usuarios realistas y únicos con contraseña válida | Muestra de usernames (`maria34`, `raquel_delgado3`, `miguelMalaga1995`) y validación con `crypt()` | Cumplido |
| 5. Mismo comando para local y nube | Comando `prisma db execute` sobre `DATABASE_URL`; en local verificado el SQL vía `psql` | Pendiente: falta probar el comando npm con credenciales válidas |

- Decisiones y desviaciones: en local el SQL se aplicó con `psql` dentro del contenedor porque la contraseña de los `.env` no coincide con la del volumen ya existente. No se cambió ninguna credencial. El SQL es el mismo que ejecuta `prisma db execute`.
- Limitaciones y pendientes: ejecutar `pnpm seed:incidencias` contra la BD de la nube tras revisar que no existan departamentos homónimos; fotos en una segunda fase.
