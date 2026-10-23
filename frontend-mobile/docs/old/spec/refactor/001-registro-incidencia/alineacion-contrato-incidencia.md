# Refactor · Alineación del contrato de incidencia (front ↔ backend)

> Estado: **completado** (2026-10-19). Unifica el contrato de "registrar incidencia" entre el móvil
> y el backend, decidiendo por campo qué lado manda. El backend **no se conecta todavía** (seguimos
> contra el mock `json-server`); esto es solo alineación de contrato.
> Verificado: front `tsc`/`lint`/`jest` 233/233; backend `build` + unit 31/31 + e2e 11/11 + `oxlint` OK.

## Contrato final acordado

| Campo | Regla final | Lado que cambia |
|---|---|---|
| `title` | 4–25 caracteres (como backend) | **front** |
| `description` | opcional, cualquier longitud (como móvil) | **backend** (quitar min 10) |
| `civicId` | UUID (`20ac442e-0f00-4fe4-bad3-61c8e8e0bff5`) | **front** (+ mock) |
| `category` | `categoryId` + `category` (texto libre) (como front) | **backend** |
| `latitude`/`longitude` | nullable/opcionales (como front) | **backend** |
| `accuracy`, resto | compatible | ninguno |

## Cambios en el front (esta rama)

- `src/utils/incident-validator.ts`: `INCIDENT_TITLE_MIN_LENGTH = 4`, `INCIDENT_TITLE_MAX_LENGTH = 25`
  (antes 100); `validateIncidentInput` valida min 4 / max 25 con mensajes. El `maxLength` del input de
  `src/app/incidents/new.tsx` hereda el nuevo máximo.
- `src/services/incident.service.ts`: `TEMPORARY_CIVIC_ID` pasa a ser un **UUID** (sigue siendo TEMPORAL,
  hasta tener sesión real — ver issue #61).
- `db.json`: el id de `sofia13` (en `users` y `civics.userId`) pasa a ese UUID, para que la incidencia
  referencie a un ciudadano real del mock. También se corrigió la duplicación de `users`/`civics`
  heredada del merge de `feature/token`.
- Tests ajustados: validador (caso min + título válido ≤25), servicio, hook y pantalla.

## Cambios en el backend (rama `feature/registro-incidencia`, coordinados)

- `description`: dejar de exigir `min 10` (aceptar opcional / cualquier longitud).
- `category`: aceptar `categoryId` (UUID opcional) + `category` (texto libre opcional) en vez de
  `categoryName`.
- `latitude`/`longitude`: pasar a opcionales/nullable.
- Se mantienen `civicId` (UUID) y `accuracy` (opcional).

## Fuera de alcance / pendiente

- Conectar el backend en vivo (seguimos con el mock).
- **Transporte:** el endpoint de incidencias del backend es **multipart** (sube imágenes) y parsea
  números como string; el móvil envía **JSON**. Alinear el transporte queda pendiente para cuando se
  conecte el backend.
- `civicId` es provisional hasta que exista registro/sesión de ciudadanía (issue #61).

## Integración de ramas

1. `feature/token` → `feature/registro-incidencia-front-mobile` (traer el frontend más avanzado).
2. Cambios de contrato del front en `feature/registro-incidencia-front-mobile`.
3. `feature/registro-incidencia-front-mobile` → `feature/registro-incidencia` (back+front en la raíz).
4. Cambios de contrato del backend en `feature/registro-incidencia`.
