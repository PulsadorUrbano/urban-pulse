# 2026-11-24 — Especificación: ampliar el seed masivo a 50.000 incidencias con una foto real en S3

- Desarrollador responsable: Sofía Si Villalba Jiménez.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: `claude-opus-5-5`.

- Rama: `feature/seed-fotos-incidencias`.
- Última actualización: 2026-11-24.
- Estado: implementado y verificado en local (incluido el ensayo del script de fotos); subida real a S3 pendiente de ejecutar con credenciales AWS.
- Plan: [Plan de implementación](plan.md).
- Referencias: seed anterior en [poblar incidencias masivas](../../../../../docs/spec/features/20-11-26-poblar-incidencias-masivas/spec.md); [conexión de fotos con S3](../../../../../docs/conexion-s3-fotos.md); servicio [`fotos-incidencia.service.ts`](../../../../src/incidents/services/fotos-incidencia.service.ts).

## Objetivo y decisiones vigentes

Con 5000 incidencias sin fotos no se pueden probar con un volumen realista los listados, los mapas ni la vista de fotos. Esta fase añade 45.000 incidencias más, hasta 50.000, y asigna a cada incidencia del seed una foto real coherente con su tipo, almacenada en el bucket S3 que ya usa el backend.

- Alcance confirmado:
  - Banco de fotos con licencia libre en `backend/prisma/seed/fotos/`, con su manifiesto y sus créditos.
  - Script SQL de ampliación con 45.000 incidencias.
  - Script Node que sube las fotos base y crea una foto por incidencia del seed.
- Decisiones confirmadas:
  - Una foto por incidencia del seed: las 5000 del primero y las 45.000 de la ampliación.
  - Fotos de Wikimedia Commons con licencia CC0, de dominio público, CC BY o CC BY-SA, revisadas a mano. Se redimensionan a un máximo de 1024 px (JPEG de calidad 60, unos 22 MB las 100 fotos) y se recodifican sin metadatos, para que no quede EXIF ni GPS.
  - Atascos y vías de metro entran como plantillas nuevas, sin cambiar el esquema: "Atasco por semáforo averiado" y "Atasco diario en el cruce" en `senalizacion`, y "Vía de metro dañada" en `otros`.
  - Cada `IncidentImage` necesita su propio objeto porque `objectKey` es único. Las fotos base se suben una vez a `incidents/_seed/base/` y se duplican dentro de S3 con `CopyObject`, sin descargarlas. El prefijo debe estar bajo `incidents/` porque es el único que permiten la política IAM del backend y la distribución de CloudFront.
  - El script de fotos lo ejecuta una persona del equipo con credenciales AWS propias. Las credenciales no se guardan en el repositorio.
- Suposiciones por validar: que la identidad IAM usada tenga `s3:GetObject` y `s3:PutObject` sobre `pulsadorurbano/incidents/*`, porque `CopyObject` necesita ambos permisos.
- Fuera de alcance: cambios de esquema y migraciones; categorías nuevas; frontends; fotos de incidencias que no sean del seed.

## Contexto verificado

- Implementación actual:
  - `prisma/seed/incidencias-masivas.sql` crea 256 usuarios, 6 departamentos, 12 equipos, 36 técnicos y 5000 incidencias sin fotos.
  - Las cuentas del seed comparten el hash bcrypt de `seed1234`, y el primer administrativo tiene el id marcador `5eed0000-0000-4000-8000-000000000001`.
- Contratos y referencias del dominio:
  - `IncidentImage` tiene `objectKey` único, `mimeType`, `idempotencyKey` opcional y `createdAt`.
  - El servicio de fotos crea claves `incidents/<incidencia>/<uuid>.<extensión>` y admite un máximo de 8 fotos por incidencia.
  - `GET /incidents/:id/fotos` firma la lectura de cada `objectKey`.
- Configuración y dependencias disponibles: `@aws-sdk/client-s3`, `@prisma/adapter-pg`, `dotenv` y Prisma 7.10.1 ya son dependencias. No se añade ninguna.
- Diferencia entre estado actual y propuesto:
  - Archivos nuevos: `prisma/seed/incidencias-masivas-ampliacion.sql`, `prisma/seed/fotos-incidencias.mjs` y `prisma/seed/fotos/`.
  - Comandos nuevos: `pnpm seed:incidencias:ampliacion` y `pnpm seed:fotos`.

## Contrato HTTP

No se crean ni se modifican endpoints. Las fotos generadas se leen con el `GET /incidents/:id/fotos` existente, sin cambios en su contrato.

## Modelos y objetos Prisma

No se modifica `schema.prisma` ni se añaden migraciones.

| Modelo reutilizado | Datos generados | Relaciones y valores |
| --- | --- | --- |
| `users` / `citizens` | 301 usuarios nuevos: 1 administrativo marcador (`5eed0000-0000-4000-8000-000000000002`) y 300 ciudadanos | Mismo generador de nombres y la misma contraseña `seed1234` del primer seed |
| `Department`, `Team`, `TeamMember` | Ninguno nuevo | Se reutilizan los del primer seed, localizados por nombre de departamento y equipo |
| `Incident` / `IncidentLocation` | 45.000 incidencias con su ubicación | Las mismas reglas que el primer seed; 44 plantillas (las 41 anteriores y 3 nuevas); ciudadanos repartidos entre los 500 del seed |
| `CambioEstado`, `CambioAsignacion`, `CambioPrioridad` | Historial coherente con el estado final | Mismo algoritmo que el primer seed |
| `IncidentImage` | Una fila por incidencia del seed | `objectKey` `incidents/<incidencia>/<uuid>.jpg`, `mimeType` `image/jpeg`, `idempotencyKey` NULL y `createdAt` igual al alta de la incidencia |

- Almacenamiento de esta fase: persistencia real en PostgreSQL y objetos reales en S3.
- Ciclo de vida:
  - Las incidencias y sus historiales no se pueden borrar.
  - Los objetos de S3 se pueden borrar por prefijo, pero las filas `IncidentImage` quedarían apuntando a objetos inexistentes.
  - En local se deshace todo recreando el volumen de la BD.
- Base de datos y migraciones: requiere las migraciones aplicadas y el primer seed ejecutado.

## Diseño mínimo

### Ampliación SQL

[`incidencias-masivas-ampliacion.sql`](../../../../prisma/seed/incidencias-masivas-ampliacion.sql) es una única transacción:

1. **Guardas:** exige el marcador del primer seed y aborta con `Ampliación del seed ya aplicada` si ya existe su propio marcador. Fija `setseed(0.4242)`.
2. **Usuarios nuevos:** el marcador y 300 ciudadanos, sin chocar con usuarios existentes.
3. **Actores existentes:** localiza departamentos, responsables, equipos, técnicos, administrativos y ciudadanos del seed por nombre y por el hash común. Si la estructura no está completa, aborta.
4. **Datos:** las mismas direcciones y plantillas (más las 3 nuevas), las mismas secciones de generación, historial y comprobaciones finales, con `generate_series(1, 45000)`.

### Banco de fotos

- `prisma/seed/fotos/<categoria>/<slug>.jpg`: JPEG de un máximo de 1024 px, sin metadatos.
- `prisma/seed/fotos/manifest.json`: por cada foto, archivo, categoría, activo urbano (o `null`), títulos de plantilla a los que corresponde, autor, licencia, URL de la licencia y página de origen.
- `prisma/seed/fotos/CREDITOS.md`: atribución que exigen las licencias CC BY y CC BY-SA.

### Script de fotos

[`fotos-incidencias.mjs`](../../../../prisma/seed/fotos-incidencias.mjs):

- **Configuración:** lee `DATABASE_URL`, `S3_BUCKET`, `S3_REGION` y las credenciales de la cadena predeterminada del SDK. Usa el cliente Prisma compilado en `dist/` (`pnpm run build`).
- **Selección:** incidencias cuyo ciudadano tiene el hash del seed y que no tienen ninguna `IncidentImage`.
- **Elección de foto:** primero una foto de la misma plantilla (por título), luego del mismo activo y categoría y, si no hay, de la categoría. Entre las opciones se elige de forma estable a partir del UUID de la incidencia.
- **Paso A:** `HeadObject` y, si no existe, `PutObject` de cada foto base en `incidents/_seed/base/<archivo>`. La política del backend no concede `s3:ListBucket`, así que S3 responde 403 en lugar de 404 a un objeto inexistente; el script trata ambos códigos como "no existe".
- **Paso B:** `CopyObject` hacia `incidents/<incidencia>/<uuid>.jpg` con 32 copias concurrentes (configurable). Las filas se insertan con `createMany` en lotes de 500, solo después de que la copia haya ido bien.
- **Reanudación:** al relanzarlo sigue con las incidencias que aún no tienen foto. Una copia cuya fila no llegó a insertarse queda como objeto huérfano en S3, sin efecto en la aplicación.
- **Opciones:** `--dry-run` muestra el reparto sin escribir nada; `--limit N` procesa solo N incidencias; `--concurrencia N` cambia el número de copias simultáneas.

### Uso operativo

Primero en local y después en la nube. En la nube no se puede deshacer.

```bash
cd backend
pnpm seed:incidencias                 # si no se había aplicado
pnpm seed:incidencias:ampliacion      # +45.000
pnpm run build                        # cliente Prisma compilado para el script de fotos
pnpm seed:fotos --dry-run             # reparto previsto
pnpm seed:fotos --limit 20            # prueba real pequeña
pnpm seed:fotos                       # resto
```

- **Alternativa sin Node local:** ejecutar el script dentro de la imagen del backend, que ya incluye `dist/`, `prisma/` y las dependencias de producción. Por ejemplo: `docker compose exec backend node prisma/seed/fotos-incidencias.mjs --dry-run`. El servicio `backend` ya recibe `S3_*` y `AWS_*` del `.env` de la raíz. Si la imagen es anterior a esta rama, hay que reconstruirla con `docker compose up -d --build backend`.
- **Coste aproximado en S3:** 50.000 copias cuestan unos 0,25 USD en peticiones, y unos 11 GB de almacenamiento (unos 220 KB por foto) rondan los 0,25 USD al mes.

## Criterios de aceptación

1. Con el primer seed aplicado, la ampliación inserta exactamente 45.000 incidencias con ubicación y un historial coherente en una sola transacción. El total del seed pasa a 50.000.
2. Una segunda ejecución de la ampliación aborta con `Ampliación del seed ya aplicada` sin cambios. Sin el primer seed, aborta con `Falta el primer seed`.
3. Cada foto del banco tiene licencia libre, autor y origen en el manifiesto, y cada categoría activa tiene al menos una foto.
4. `pnpm seed:fotos --dry-run` asigna una foto a todas las incidencias del seed sin foto y no escribe en S3 ni en la BD.
5. Tras la ejecución real, cada incidencia del seed tiene exactamente una `IncidentImage` cuyo objeto existe en S3, y `GET /incidents/:id/fotos` devuelve su URL firmada.
6. No se modifica el esquema, el código de la aplicación ni las dependencias.

## Documentación de endpoints

No aplica: no se crean ni se modifican endpoints.

## Estrategia de verificación

No cambia código de la aplicación, así que no se añaden pruebas unitarias. La verificación se hace contra el PostgreSQL local:

- Ensayo de la ampliación con `ROLLBACK`, ejecución real y reejecución.
- Validación del manifiesto con `jq`: archivos existentes, licencias y categorías.
- `--dry-run` del script de fotos contra la BD local.
- La ejecución real contra S3 queda pendiente de credenciales.
- `pnpm test` y `git diff --check`.

Los resultados reales se registran en [el plan](plan.md#confirmación-de-implementación).
