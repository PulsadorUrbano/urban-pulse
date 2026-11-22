# 2026-11-22 — Especificación: geocodificar direcciones de incidencias

- Desarrollador responsable: pendiente de designación por el equipo.
- Asistente de IA: OpenCode.
- Modelo de IA que creó la especificación: opencode-go/gpt-6-luna.
- Rama: `dev`.
- Última actualización: 2026-11-22.
- Estado: implementado y verificado mediante pruebas unitarias, compilación y lint; no se contactó al proveedor real.
- Plan: [Plan de implementación](../plans/2026-11-22-geocodificar-direcciones-incidencias-plan.md).
- Referencias: issue #210; modelo existente de direcciones y ubicaciones.

## Objetivo y decisiones vigentes

Al crear una incidencia con coordenadas, el backend intenta asociar una dirección reutilizable sin exigir cambios en las aplicaciones consumidoras.

- Alcance confirmado: geocodificación inversa best-effort dentro del backend, persistencia de la dirección existente y documentación del contrato.
- Decisiones confirmadas: una dirección enviada explícitamente tiene prioridad; en su ausencia, Nominatim se consulta antes de abrir la transacción de Prisma. La resolución requiere vía, número, código postal español de cinco dígitos y distrito de Málaga reconocido.
- Suposiciones por validar: el volumen de uso es bajo y compatible con el servicio público de Nominatim; la caché y el límite por proceso son apropiados mientras exista una sola instancia. El envío de coordenadas exactas a este tercero queda documentado; no se envían el título, la descripción ni la identidad.
- Fuera de alcance: cambios en `frontend-mobile/` o `frontend-web/`, nueva ruta HTTP, migración o cambio estructural del modelo, edición de coordenadas y garantía de dirección para resultados incompletos.

## Contexto verificado

- `Address` ya almacena `street`, `zipCode` y `district`; su clave única es `(street, zipCode, district)`.
- `IncidentLocation.addressId` es una FK opcional a `Address`. El DBML, `schema.prisma` y la migración `20261117000000_model_integrity` describen esta estructura.
- `POST /incidents` ya admite dirección manual opcional y devuelve `location.address` como objeto o `null`; el cuerpo no necesita cambios.
- `IncidentsService.create` persiste la dirección, ubicación, incidencia e historial inicial en una transacción.
- El backend usa NestJS 12, Prisma 7.10.1, Node.js 22 o posterior y no tiene dependencia HTTP adicional para esta función.

## Contrato HTTP

No se crean ni modifican endpoints. El geocodificador completa `location.address`, ya existente en la respuesta, sin añadir campos ni hacer obligatoria la dirección.

| Método y ruta | Entrada y formato | Respuesta correcta | Acceso |
| --- | --- | --- | --- |
| `POST /incidents` | JSON actual; coordenadas obligatorias; `address` opcional | `201`, misma forma de incidencia, ubicación y `address` objeto o `null` | JWT y perfil ciudadano vigente |

### Validación y normalización

| Campo y ubicación | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| `latitude`, `longitude` en JSON | number | Sí | Rangos actuales; enviados al proveedor sin alterarlos | No aplica |
| `address` en JSON | objeto | No | Si se envía, conserva su validación actual y evita la consulta externa | Si se omite, se intenta resolver |
| `location.address.street` en respuesta | string | No | Vía y número en una línea, con espacios normalizados | `null` si no hay resultado completo |
| `location.address.zipCode` en respuesta | string | No | Exactamente cinco dígitos | No se persiste sin código válido |
| `location.address.district` en respuesta | `AddressDistrict` | No | Alias conocidos se mapean al enum Prisma | No se persiste un distrito desconocido |

- Campos desconocidos y campos controlados por servidor: sin cambios en la petición; el propietario sigue procediendo del JWT.
- Errores: los errores de catálogo y persistencia mantienen su comportamiento; una caída o respuesta incompleta del geocodificador no produce un error HTTP.
- Compatibilidad: ninguna clave o requisito nuevo para consumidores. El único cambio observable es que el `address` existente puede dejar de ser `null`.

## Modelos y objetos Prisma

| Modelo nuevo o reutilizado | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| `Address` reutilizado | `id`, `street`, `zipCode`, `district` | Reutilizable por `(street, zipCode, district)`; `street` contiene la línea con vía y número |
| `IncidentLocation` reutilizado | `incidentId`, coordenadas, `accuracy`, `createdAt`, `addressId` | `addressId` sigue opcional y referencia `Address` |

No se añade entidad ni campo: la relación actual cubre la necesidad y permite guardar una ubicación cuando no hay una dirección fiable. La representación de datos continúa usando los modelos y tipos generados por Prisma.

- Almacenamiento de esta fase: PostgreSQL mediante la transacción existente.
- Ciclo de vida: direcciones reutilizables y persistentes; la caché del geocodificador es local al proceso y volátil.
- Base de datos y migraciones: no se cambia el esquema ni se ejecutan migraciones.

## Diseño mínimo

`GeocodificacionInversaService` envía únicamente las coordenadas a Nominatim usando `fetch` de Node, establece `User-Agent` y `Accept-Language`, limita la frecuencia a una solicitud por segundo por proceso, deduplica peticiones concurrentes por coordenada y cachea resultados en memoria por 24 horas. El tiempo de espera está limitado por configuración. `NOMINATIM_ENDPOINT`, `NOMINATIM_USER_AGENT` y `NOMINATIM_TIMEOUT_MS` se documentan en ambos ejemplos de entorno: `backend/.env.example` para ejecución local y `.env.example` en la raíz para Compose. El número, distrito y código postal se validan antes de construir `IncidentAddress`. La consulta ocurre fuera de la transacción; la dirección resuelta se reutiliza con el `upsert` ya existente. Si los datos se presentan directamente a usuarios, debe mostrarse la atribución requerida por OpenStreetMap.

## Criterios de aceptación

1. Una dirección completa resuelta se persiste y aparece en `location.address` sin cambiar la forma de respuesta.
2. Una dirección manual conserva prioridad y no genera una consulta al proveedor.
3. Una respuesta incompleta, un distrito no reconocido, un timeout o un error externo no impiden guardar la incidencia y producen `address: null`.
4. No se cambian Prisma estructuralmente, las migraciones ni los frontends.
5. Los casos de mapeo, caché, fallo y persistencia se verifican con pruebas unitarias y dobles; no se hacen peticiones reales al proveedor.

## Documentación de endpoints

- Carpeta por endpoint: [POST /incidents](../../endpoint/post-incidents/README.md).
- Mantener la ficha sincronizada con el tratamiento best-effort y el formato de `street`.

## Estrategia de verificación

Pruebas unitarias del mapeo del resultado Nominatim, caché y cabeceras usando `fetch` simulado, además de las pruebas del servicio de incidencias para éxito, dirección manual y fallo externo. Ejecutar `pnpm test`, `pnpm run build`, `pnpm run lint` y `git diff --check`; confirmar que no se modificaron archivos frontend.
