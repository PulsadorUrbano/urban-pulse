# 2026-11-20 — Especificación para evitar fotos duplicadas

- Desarrollador responsable: Jose (CodeJose21).
- Asistente de IA: Codex. Identificador exacto del modelo no disponible.
- Rama: `fix/200-idempotencia-fotos`.
- Última actualización: 2026-11-20.
- Estado: implementado en backend.
- Plan: [Plan de implementación](plan.md).
- Referencia: [Issue #200](https://github.com/PulsadorUrbano/urban-pulse/issues/200).

## Objetivo y decisiones

Si se pierde la respuesta de una subida ya guardada, el ciudadano puede reintentar con la misma clave y recuperar la galería sin duplicar fotos. La adaptación de los clientes corresponde a la parte de frontend del issue.

## Contexto verificado

El servicio de fotos sube los archivos a S3, registra sus metadatos en PostgreSQL y genera URLs de lectura. Ya utiliza un bloqueo por incidencia para comprobar el límite de ocho fotos antes de insertar.

## Contrato HTTP

| Método y ruta | Entrada | Respuesta | Acceso |
| --- | --- | --- | --- |
| `POST /incidents/:id/images` | Multipart con `images` e `Idempotency-Key` opcional | `201` con la galería actual | Ciudadano autenticado y propietario |

La clave debe ser un UUID v4 válido. Se normaliza a minúsculas y los valores inválidos devuelven `400`. Se usa una clave nueva por tanda y la misma en sus reintentos. La primera tanda confirmada prevalece y la respuesta renueva las URL de lectura. Los clientes que omiten la cabecera siguen funcionando. [Contrato completo](../../endpoint/post-incidents-id-images/README.md).

## Modelo Prisma y diseño mínimo

`IncidentImage.idempotencyKey` es un UUID nullable. Las fotos históricas conservan `null`. Se guarda con las filas de la tanda en la misma transacción. La clave pertenece a la incidencia y se conserva mientras quede alguna foto de esa tanda. La API devuelve los mismos campos públicos de imagen.

El servicio revisa la clave antes de aplicar el límite, y vuelve a comprobarla bajo el bloqueo existente antes de insertar. Una petición concurrente que detecte la tanda confirmada borra solo los objetos provisionales que ella misma haya subido.

## Criterios de aceptación

1. Repetir una tanda confirmada devuelve la galería incluso con ocho fotos y prescinde de nuevas escrituras en S3 y PostgreSQL.
2. Dos peticiones simultáneas de una tanda dejan un solo conjunto registrado y limpian los objetos provisionales de la otra petición.
3. Una tanda nueva sigue sujeta al límite de ocho, y consultar la clave requiere ser el propietario.
4. Una cabecera inválida devuelve `400`. Los clientes que la omiten mantienen su comportamiento.
