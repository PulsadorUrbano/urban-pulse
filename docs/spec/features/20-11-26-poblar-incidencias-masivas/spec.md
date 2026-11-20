# 2026-11-20 — Especificación: poblar la base de datos con incidencias masivas de prueba

- Desarrollador responsable: Sofía Si Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: `claude-opus-5-5`.

- Rama: `feature/seed-incidencias-masivas`.
- Última actualización: 2026-11-20.
- Estado: implementado y verificado en local; ejecución en la nube pendiente.
- Plan: [Plan de implementación](plan.md).
- Referencias: plantillas [spec](../../../../backend/docs/spec/templates/spec-template.md) y [plan](../../../../backend/docs/spec/templates/plan-template.md) del backend; restricciones de [cierre del modelo](../../../../backend/prisma/migrations/20261118000000_close_model/migration.sql) e [integridad del modelo](../../../../backend/prisma/migrations/20261117000000_model_integrity/migration.sql).

## Objetivo y decisiones vigentes

El equipo necesita un volumen grande de incidencias (unas 5000) para probar listados, paginación, mapas, filtros y vistas de departamento, equipo y técnico. Crearlas a mano o generarlas fila a fila con un asistente de IA es lento y costoso. Se entrega un único script SQL que genera los datos dentro de PostgreSQL con `generate_series` y `random()`, con un coste fijo independiente del volumen.

- Alcance confirmado: 5000 incidencias sin fotos con ubicación, dirección, categoría, activo urbano, prioridad y estado final variados; actores de prueba (ciudadanos, administrativos, departamentos, equipos y técnicos); historial de estados, asignaciones y prioridades coherente con el estado final.
- Decisiones confirmadas:
  - SQL puro ejecutado con `prisma db execute`, que lee `DATABASE_URL` desde `prisma7.config.ts`: sirve para la BD local y la de la nube sin dependencias nuevas.
  - Una única transacción: si una comprobación falla no queda ningún dato parcial.
  - Mezcla realista de estados (aproximadamente reported 25 %, validated 15 %, rejected 8 %, assigned 15 %, in_progress 12 %, resolved 12 %, closed 10 %, reopened 3 %).
  - Nombres de usuario realistas compuestos por tres listas: nombre de pila (siempre), apellido o extensión neutra (opcional, alrededor del 60 %) y extensión numérica (opcional, alrededor del 50 %), sin lenguaje obsceno ni excesivamente humorístico.
  - Todas las cuentas del seed usan la contraseña `seed1234` (bcrypt, coste 10).
- Suposiciones por validar: que la BD de la nube no tenga departamentos con los mismos nombres que usa el seed; si los tiene, el script aborta sin cambios.
- Fuera de alcance: fotos de incidencias (segunda fase, ver [Diseño mínimo](#diseño-mínimo)), `UrbanContext`, cambios de esquema, migraciones nuevas, código de la aplicación y frontends.

## Contexto verificado

- Implementación actual: [`dev-seed.service.ts`](../../../../backend/src/dev-seed/dev-seed.service.ts) solo crea un administrador y un ciudadano en modo `development`. No existía ningún mecanismo de datos masivos.
- Contratos y referencias del dominio: [`schema.prisma`](../../../../backend/prisma/schema.prisma) y las migraciones citadas, que imponen:
  - Las incidencias no se pueden borrar ni truncar, y `status_changes`, `priority_changes` y `assignment_changes` son inmutables. **El seed es irreversible.**
  - Toda incidencia necesita `IncidentLocation` en la misma transacción (trigger diferido).
  - `validar_transicion` comprueba las transiciones solo en `UPDATE`. En `INSERT` exige departamento y equipo para `assigned/in_progress/resolved/closed` y técnico para `in_progress/resolved`.
  - El título debe tener entre 4 y 35 caracteres. El técnico ha de ser `TeamMember` con `isTechnician` del mismo equipo. Una prioridad automática no lleva `user_id`.
  - Los identificadores UUID los genera Prisma en el cliente, así que el script los genera con `gen_random_uuid()`.
- Configuración y dependencias disponibles: Prisma 7.10.1 (`prisma db execute --config --file`), PostgreSQL 16 con PostGIS (`imresamu/postgis:16-3.5-bookworm`).
- Diferencia entre estado actual y propuesto: se añade el script `backend/prisma/seed/incidencias-masivas.sql` y el comando `pnpm seed:incidencias`.

## Contrato HTTP

No se crean ni se modifican endpoints: es un script de datos que se ejecuta directamente contra la base de datos. Los endpoints existentes devuelven los datos generados sin cambios en su contrato.

## Modelos y objetos Prisma

No se modifica `schema.prisma` ni se añaden migraciones. Se pueblan los modelos existentes:

| Modelo reutilizado | Datos generados | Relaciones y valores |
| --- | --- | --- |
| `users` / `citizens` | 256 usuarios: 2 `administrative`, 6 `department`, 12 `team`, 36 `technician` y 200 `civic` | Username y email únicos sin distinguir mayúsculas; el primer administrativo tiene el id fijo `5eed0000-0000-4000-8000-000000000001`, que actúa como marcador |
| `Department` / `DepartmentMember` | 6 departamentos con un usuario `department` cada uno | Alumbrado Público, Limpieza y Residuos, Vía Pública, Parques y Jardines, Aguas y Saneamiento, Movilidad |
| `Team` / `TeamMember` | 2 equipos por departamento (Norte y Sur), con un responsable y 3 técnicos | Cada usuario pertenece a un solo equipo |
| `Address` | 42 calles de Málaga repartidas entre los 11 distritos | `ON CONFLICT DO NOTHING` reutiliza direcciones existentes |
| `Incident` / `IncidentLocation` | 5000 incidencias, una ubicación cada una | Categoría y activo coherentes con la plantilla; departamento según la categoría; coordenadas con un desvío de unos 800 m sobre el centroide del distrito |
| `CambioEstado` (`status_changes`) | Camino válido completo hasta el estado final | Actores: ciudadano (alta), administrativo (validación o rechazo), departamento (asignación, cierre, reapertura), técnico (en curso, resuelta) |
| `CambioAsignacion` (`assignment_changes`) | Una fila por incidencia que pasó por `assigned` | Anteriores a NULL; motivo opcional |
| `CambioPrioridad` (`priority_changes`) | Priorización automática para las incidencias `medium` y `high` | `is_manual = false`, `user_id` NULL |

- Almacenamiento de esta fase: persistencia real en PostgreSQL.
- Ciclo de vida: los datos son permanentes. En local se eliminan recreando el volumen (`docker compose down -v` y volver a aplicar migraciones); en la nube no se pueden eliminar.
- Base de datos y migraciones: requiere tener aplicadas las migraciones, porque el script comprueba que existan las 10 categorías activas del catálogo.

## Diseño mínimo

El script [`incidencias-masivas.sql`](../../../../backend/prisma/seed/incidencias-masivas.sql) se ejecuta en una transacción con estos pasos:

1. **Guardas**: aborta con `Seed ya aplicado` si existe el usuario marcador. También aborta si ya existen departamentos con los nombres del seed o si faltan categorías. Después fija `setseed(0.42)` para que la generación sea reproducible.
2. **Usuarios**: genera 3000 candidatos combinando las tres listas (`lucia`, `javier_moreno`, `carmenTheBest49`, `alvaro.ruiz2`). Los sufijos que empiezan en mayúscula se unen sin separador. Se deduplican, se descartan los que chocan con usuarios existentes y se toman 256. El email se deriva del username con dominios `gmail.com`, `hotmail.com`, `outlook.es` y `yahoo.es`.
3. **Estructura municipal**: departamentos, equipos, responsables y técnicos.
4. **Direcciones y plantillas**: 42 calles y 41 plantillas de título y descripción por categoría.
5. **Incidencias**: una tabla temporal con todos los valores aleatorios, que después se resuelven a referencias reales. Las incidencias `reported` y `validated` son de los últimos 60 días; el resto se reparte en el último año.
6. **Historial**: se despliega el camino de estados de cada incidencia con fechas crecientes entre el alta y el último cambio, sin fechas futuras.
7. **Comprobaciones finales**: verifica que no haya incidencias sin ubicación, que cada historial termine en el estado final y que no haya fechas futuras. Si alguna falla, revierte todo.

Uso operativo:

```bash
cd backend
pnpm seed:incidencias                                # usa DATABASE_URL del .env
DATABASE_URL="postgresql://..." pnpm seed:incidencias  # otra BD, por ejemplo la de la nube
```

- Probar siempre primero en local: en la nube no hay vuelta atrás.
- Alternativa equivalente en local, sin pasar por las credenciales del host: `docker exec -i urbanpulse_db psql -U <DB_USER> -d <DB_NAME> -v ON_ERROR_STOP=1 < backend/prisma/seed/incidencias-masivas.sql`.
- Reset en local: `docker compose down -v`, volver a levantar la BD y aplicar las migraciones.
- Credenciales: cualquier usuario del seed con la contraseña `seed1234`. Por ejemplo, para obtener un ciudadano con incidencias: `SELECT u.username FROM users u JOIN "Incident" i ON i."civicId" = u.id LIMIT 1;`.
- Segunda fase (fotos): `IncidentImage.objectKey` es único, así que cada fila necesita su propio objeto. La propuesta es subir una vez unas 20 fotos de muestra a `seed/base/` del bucket y, con un script Node que use `@aws-sdk/client-s3`, hacer `CopyObject` en el servidor hacia claves nuevas para un subconjunto de incidencias, insertando después `IncidentImage`. Se especificará aparte.

## Criterios de aceptación

1. Con las migraciones aplicadas, una ejecución inserta exactamente 5000 incidencias, cada una con su ubicación y dirección, en una sola transacción.
2. Una segunda ejecución aborta con `Seed ya aplicado` y no inserta nada.
3. Ninguna incidencia en `assigned/in_progress/resolved/closed` queda sin departamento y equipo, ni en `in_progress/resolved` sin técnico. El último cambio de estado coincide con el estado final y no hay fechas futuras.
4. Los usuarios generados tienen username y email únicos, compuestos por un nombre de pila y, opcionalmente, un sufijo y un número, y su contraseña `seed1234` es válida.
5. El mismo comando sirve para la BD local y la de la nube cambiando solo `DATABASE_URL`, sin código de aplicación nuevo ni cambios de esquema.

## Documentación de endpoints

No aplica: no se crean ni se modifican endpoints.

## Estrategia de verificación

No se añaden pruebas unitarias porque no cambia código de la aplicación. La verificación se hace contra el PostgreSQL local:

- Ensayo con `ROLLBACK` en lugar de `COMMIT` para ver la distribución sin persistir.
- Ejecución real y reejecución para comprobar la guarda.
- Consultas de integridad (ubicación, asignación según estado, último estado del historial), recuento de historiales y reparto por distrito.
- Validación de los hashes con `crypt()` de `pgcrypto` en una transacción revertida.
- `pnpm test` y `git diff --check` para confirmar que no se altera nada más.

Los resultados reales se registran en [el plan](plan.md#confirmación-de-implementación).
