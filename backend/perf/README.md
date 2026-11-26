# Pruebas de rendimiento

`baseline.js` y `stress.js` ejecutan escenarios de carga contra endpoints reales de lectura del backend. No registran incidencias ni ejecutan otras operaciones que modifiquen datos.

## Requisitos y ejecución

Se necesita k6 instalado y disponible en `PATH`. Desde `backend/`, ejecutar:

```sh
pnpm run perf:baseline
```

Por defecto apunta a `http://localhost:3000`, usa 10 VUs durante 120 segundos por endpoint y deja 10 segundos entre escenarios. La prueba completa tarda varios minutos. Los informes se escriben en el directorio de ejecución como `baseline_resultados.md` y `baseline_raw.json`.

## Endpoints

El catálogo compartido por ambos scripts incluye:

| Identificador | Ruta | Requisitos |
|---|---|---|
| `health` | `GET /health` | Público. |
| `categories` | `GET /categories` | PostgreSQL disponible. |
| `incidents` | `GET /incidents?limit=10` | JWT de `admin`/`administrative`; para un ciudadano, configura su `CIVIC_ID` propio. |
| `assignment_options` | `GET /incidents/assignment-options` | JWT de `admin`, `administrative` o `department`. |
| `auth_me` | `GET /auth/me` | JWT vigente de un usuario existente. |
| `incident_detail` | `GET /incidents/:id` | JWT y `INCIDENT_ID` accesible para ese usuario. |
| `incident_assignments` | `GET /incidents/:id/assignments` | JWT, `INCIDENT_ID` accesible y rol operador. |

Los dos últimos se incluyen únicamente al definir `INCIDENT_ID`. Los endpoints que consultan datos requieren PostgreSQL disponible.

Se pueden seleccionar uno o varios identificadores separados por comas con `ENDPOINTS`. Por ejemplo, para una comprobación breve solo de salud:

```sh
BASE_URL=http://localhost:3000 ENDPOINTS=health VUS=1 DURATION_S=2 GAP_S=0 pnpm run perf:baseline
```

Para el resto de escenarios, configura `TOKEN` y, si seleccionas `incident_detail`, `INCIDENT_ID`. Puedes ajustar `BASE_URL`, `VUS`, `DURATION_S` y `GAP_S` para apuntar a un entorno autorizado y controlar la duración. La prueba comprueba respuestas 2xx y resume latencia, errores y throughput por endpoint.

En `stress.js`, selecciona un identificador del mismo catálogo, por ejemplo:

```sh
BASE_URL=http://localhost:3000 ENDPOINT=categories MODE=steps k6 run perf/stress.js
```

Los endpoints protegidos requieren `TOKEN`. El modo `steps` mantiene cada nivel durante dos minutos; usa un entorno de pruebas y datos adecuados antes de ejecutar escenarios de estrés.
