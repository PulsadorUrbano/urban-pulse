# POST /incidents — registrar una incidencia

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-17.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Rol: `civic` con relación `citizens` vigente en PostgreSQL.
- Content-Type: `application/json`.

## Entrada

El cuerpo admite solo estos campos:

| Campo | Regla |
| --- | --- |
| `title` | Obligatorio; texto recortado de 4 a 35 puntos de código. |
| `description` | Texto opcional, recortado, de al menos 10 caracteres si se envía. |
| `categoryId` | UUID opcional de una categoría persistida. |
| `category` | Texto opcional, recortado. |
| `latitude` | Número JSON opcional entre -90 y 90; debe acompañar a `longitude`. |
| `longitude` | Número JSON opcional entre -180 y 180; debe acompañar a `latitude`. |
| `accuracy` | Número JSON finito opcional, mayor o igual que 0; requiere coordenadas. |
| `urbanAssetId` | UUID opcional de un activo urbano persistido. |
| `address` | Objeto opcional con `street` no vacía, `zipCode` de cinco dígitos y `district` del enum de distritos; requiere coordenadas. |

`civicId`, `images` y cualquier campo desconocido devuelven 400. No se aceptan archivos ni multipart. El propietario se deriva del usuario autenticado y debe existir en `citizens`. La base de datos exige que los identificadores de categoría y activo urbano existan cuando se proporcionan. Si solo llega `category`, se resuelve o crea una categoría persistida dentro de la misma transacción. Si llegan `categoryId` y `category`, sus nombres deben coincidir.

```json
{
  "title": "Farola apagada",
  "description": "No ilumina la calle",
  "latitude": 36.7213,
  "longitude": -4.4214,
  "accuracy": 8.5,
  "address": {
    "street": "Calle Larios",
    "zipCode": "29005",
    "district": "centro"
  }
}
```

## Respuesta y persistencia

Responde 201, cabecera `Location: /incidents/{id}` y el recurso creado. La incidencia y, cuando hay coordenadas, su ubicación se escriben en una transacción Prisma asíncrona. Si no hay coordenadas, no se guarda una fila de ubicación. El estado inicial es `reported` y la prioridad inicial, `low`.

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "Farola apagada",
  "description": "No ilumina la calle",
  "civicId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "categoryId": null,
  "category": null,
  "urbanAssetId": null,
  "departmentId": null,
  "teamId": null,
  "technicianId": null,
  "location": {
    "latitude": 36.7213,
    "longitude": -4.4214,
    "accuracy": 8.5,
    "address": {
      "street": "Calle Larios",
      "zipCode": "29005",
      "district": "centro"
    },
    "createdAt": "2026-11-09T10:00:00.000Z"
  },
  "images": [],
  "status": "reported",
  "priority": "low",
  "createdAt": "2026-11-09T10:00:00.000Z"
}
```

La dirección se reutiliza mediante una clave única por calle, código postal y distrito. Si se omite, `location.address` vale `null`. `images` es deuda técnica de compatibilidad: siempre vale `[]` y no representa almacenamiento disponible. Se retirará cuando los consumidores migren. Errores: 400 entrada inválida, categoría contradictoria o identificador de catálogo inexistente; 401 JWT inválido; 403 rol o vínculo ciudadano inválido; 503 PostgreSQL no disponible o fallo de integridad durante la creación.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación](../../../../src/incidents/create-incident.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
- [Diseño integrado](../../features/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md)
