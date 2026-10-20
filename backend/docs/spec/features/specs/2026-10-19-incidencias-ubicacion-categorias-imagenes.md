# Especificación: incidencias con ubicación, categorías e imágenes

- Rama objetivo: `feature/registro-incidencia-backend`.
- Estado: implementado y verificado; pendiente de revisión independiente de la rama.
- Fecha: 2026-10-19.
- Plan: [Plan de implementación](../plans/2026-10-19-incidencias-ubicacion-categorias-imagenes-plan.md).

## Objetivo

Ampliar el registro temporal de incidencias para que el frontend pueda enviar identidad cívica, categoría por nombre, ubicación precisa e imágenes. La solución mantiene el alcance actual sin base de datos: los metadatos viven en memoria y los ficheros se almacenan temporalmente en el disco local del backend.

## Decisiones aprobadas

- La petición de creación usa `multipart/form-data`.
- `civicId` es obligatorio y se valida únicamente como UUID. No se implementan autenticación, autorización ni consulta de ciudadanía.
- `description` es opcional.
- El frontend aporta `categoryName`. El backend compara el nombre tras `trim`, sin distinguir mayúsculas/minúsculas, contra un catálogo simulado. Si no hay coincidencia, crea una categoría temporal.
- Cada incidencia tiene una entidad `location` con `latitude`, `longitude`, `accuracy` y `createdAt` generado por el servidor.
- Las imágenes se guardan localmente bajo `backend/uploads/incidents/<incident-id>/` y la respuesta devuelve URL públicas relativas.

## Contrato HTTP

### `POST /incidents`

Content type: `multipart/form-data`.

| Campo | Regla |
| --- | --- |
| `title` | Obligatorio; trim; entre 4 y 35 puntos de código Unicode. |
| `description` | Opcional; si se proporciona, trim y mínimo 10 puntos de código Unicode. |
| `civicId` | Obligatorio; UUID con validación de formato solamente. |
| `categoryName` | Obligatorio; texto no vacío tras trim. |
| `latitude` | Obligatorio; número finito entre -90 y 90. |
| `longitude` | Obligatorio; número finito entre -180 y 180. |
| `accuracy` | Opcional; número finito mayor o igual que cero. |
| `urbanAssetId` | Opcional; UUID con validación de formato solamente. |
| `images` | Opcional; campo repetible, de 0 a 8 ficheros JPEG, PNG o WebP, máximo 5 MB por fichero. |

Los valores de texto del formulario se convierten de forma controlada en los campos numéricos antes de validar; no se aceptan valores no finitos. Se rechazan los campos no reconocidos y los campos que solo controla el servidor (`id`, estado, prioridad y marcas temporales) con `400 Bad Request`.

La respuesta permanece en `201 Created` e incluye `Location: /incidents/{id}`. Su forma es:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "title": "Farola apagada",
  "description": null,
  "civicId": "00000000-0000-4000-8000-000000000002",
  "category": {
    "id": "00000000-0000-4000-8000-000000000003",
    "name": "Iluminación",
    "createdAt": "2026-10-19T12:00:00.000Z"
  },
  "location": {
    "latitude": 36.7213,
    "longitude": -4.4214,
    "accuracy": 8.5,
    "createdAt": "2026-10-19T12:00:00.000Z"
  },
  "images": [
    {
      "id": "00000000-0000-4000-8000-000000000004",
      "url": "/uploads/incidents/00000000-0000-4000-8000-000000000001/farola.jpg",
      "mimeType": "image/jpeg",
      "createdAt": "2026-10-19T12:00:00.000Z"
    }
  ],
  "urbanAssetId": null,
  "status": "reported",
  "priority": "low",
  "createdAt": "2026-10-19T12:00:00.000Z"
}
```

`GET /incidents/:id` devuelve el mismo recurso. La ruta estática `/uploads/...` permite recuperar los ficheros guardados durante la vida del proceso.

## Catálogo temporal

El catálogo inicial contiene `Iluminación`, `Limpieza`, `Vía pública`, `Movilidad` y `Zonas verdes`. Cada categoría tiene UUID y fecha de creación generados por el servidor. La comparación usa una clave normalizada (`trim` y minúsculas); se conserva el nombre recortado aportado por el usuario al crear una categoría nueva.

Las categorías y las incidencias no se comparten entre instancias y se pierden al reiniciar. La carpeta de archivos es igualmente temporal y no debe considerarse almacenamiento duradero.

## Errores y consistencia

- `400`: campo de formulario desconocido, datos inválidos, categoría vacía, UUID inválido, coordenadas/precisión inválidas, tipo de fichero no permitido o límite de tamaño/cantidad superado.
- `404`: UUID de incidencia válido pero no almacenado, o URL de imagen temporal que ya no existe.
- `500`: error inesperado de almacenamiento. Si una escritura de imagen falla, se eliminan los ficheros ya escritos para esa petición y no se crea la incidencia.

No se permite que una solicitud parcial deje una incidencia apuntando a archivos que no se guardaron correctamente.

## Fuera de alcance

Persistencia, migraciones, almacenamiento cloud, análisis antivirus, transformación de imágenes, autenticación, autorización, validación de existencia de ciudadanía/activos urbanos, edición, borrado, listados y limpieza programada de la carpeta temporal.

## Criterios de aceptación

1. Una incidencia creada con categoría simulada reutiliza la categoría existente; un nombre nuevo crea otra categoría temporal.
2. `civicId` es obligatorio y se devuelve sin exponer identidad adicional.
3. La descripción puede omitirse; si existe, conserva las reglas de longitud tras trim.
4. La respuesta incluye ubicación con latitud, longitud, precisión y fecha creadas por el servidor.
5. Se aceptan hasta ocho imágenes JPEG, PNG o WebP de hasta 5 MB y se devuelven URLs accesibles localmente.
6. Ficheros inválidos o un fallo de escritura no crean registros parciales.
7. El contrato queda documentado en Swagger, README y pruebas unitarias/e2e.

## Estado de implementación

- Implementado en `feature/registro-incidencia-backend`: categorías en memoria, ubicación con precisión y fecha del servidor, carga temporal local y URL estáticas bajo `/uploads/`.
- Verificado de forma focalizada con pruebas unitarias, e2e multipart y compilación. La verificación completa se registra en el informe de implementación.
