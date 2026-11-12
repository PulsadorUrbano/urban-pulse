# POST /incidents — registrar una incidencia

- Estado: implementado y cubierto por pruebas unitarias.
- Última revisión: 2026-11-09.
- Autenticación: `Authorization: Bearer <JWT>` obligatoria.
- Rol: `civic` con relación `citizens` vigente en PostgreSQL.
- Content-Type: `application/json`.

## Entrada

El cuerpo admite solo estos campos:

| Campo | Regla |
| --- | --- |
| `title` | Obligatorio; texto recortado de 4 a 35 puntos de código. |
| `description` | Texto opcional, recortado. |
| `categoryId` | UUID opcional. |
| `category` | Texto opcional, recortado. |
| `latitude` | Número JSON opcional entre -90 y 90. |
| `longitude` | Número JSON opcional entre -180 y 180. |
| `accuracy` | Número JSON finito opcional, mayor o igual que 0. |
| `urbanAssetId` | UUID opcional. |

`civicId`, `images` y cualquier campo desconocido devuelven 400. No se aceptan archivos ni multipart. El propietario se deriva del usuario autenticado.

```json
{
  "title": "Farola apagada",
  "description": "No ilumina la calle",
  "latitude": 36.7213,
  "longitude": -4.4214,
  "accuracy": 8.5
}
```

## Respuesta y persistencia

Responde 201, cabecera `Location: /incidents/{id}` y el recurso creado. La incidencia y su ubicación se escriben en una transacción Prisma asíncrona. El estado inicial es `reported` y la prioridad inicial, `low`.

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "Farola apagada",
  "description": "No ilumina la calle",
  "civicId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "categoryId": null,
  "category": null,
  "urbanAssetId": null,
  "location": {
    "latitude": 36.7213,
    "longitude": -4.4214,
    "accuracy": 8.5,
    "createdAt": "2026-11-09T10:00:00.000Z"
  },
  "images": [],
  "status": "reported",
  "priority": "low",
  "createdAt": "2026-11-09T10:00:00.000Z"
}
```

`images` es deuda técnica de compatibilidad: siempre vale `[]` y no representa almacenamiento disponible. Se retirará cuando los consumidores migren. Errores: 400 entrada inválida; 401 JWT inválido; 403 rol o vínculo ciudadano inválido; 503 PostgreSQL no disponible.

## Referencias

- [Controlador](../../../../src/incidents/incidents.controller.ts)
- [Validación](../../../../src/incidents/create-incident.pipe.ts)
- [Servicio](../../../../src/incidents/incidents.service.ts)
- [Diseño integrado](../../../../../docs/superpowers/specs/2026-11-09-integrar-incidencias-jwt-prisma-sin-imagenes-design.md)
