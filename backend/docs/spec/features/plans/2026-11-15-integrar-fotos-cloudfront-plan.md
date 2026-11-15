# 2026-11-15 — Plan para servir fotos privadas con CloudFront

- Rama: `feat-integracion-s3`.
- Especificación: [Fotos privadas mediante CloudFront](../specs/2026-11-15-integrar-fotos-cloudfront-spec.md).
- Alcance: backend, configuración de desarrollo e infraestructura CDN; sin cambios en `frontend-mobile/`.

## Tareas

- [x] Revisar el servicio S3, el contrato de `GET /incidents/:id`, las versiones y las instrucciones del backend.
- [x] Consultar la documentación de CloudFront y del firmador del SDK en Context7.
- [x] Añadir casos unitarios de URL CloudFront válida y configuración incompleta; comprobar que fallaban antes del cambio (2 fallos).
- [x] Implementar firma de URL de CloudFront durante 15 minutos con conservación temporal de la ruta S3.
- [x] Documentar variables de entorno y pasos de configuración de distribución, OAC, grupo de claves y política del bucket.
- [ ] Crear en AWS la clave pública, grupo de claves, OAC y distribución; limitar la lectura del bucket al ARN de la distribución.
- [ ] Configurar el `.env` local y verificar la URL firmada y los rechazos sin firma y por acceso directo a S3.
- [ ] Publicar los cambios en la rama y actualizar la PR existente.

## Comprobaciones reales

| Comprobación | Resultado |
| --- | --- |
| `pnpm test -- test/incidents/services/almacenamiento-fotos-s3.service.spec.ts` antes del código | 2 fallos esperados de CloudFront; 5 casos existentes pasaron. |
| Mismo comando tras el código | 7/7 pasaron. |
| `pnpm test` | 27 archivos, 306 pruebas pasaron. |
| `pnpm build` | Correcto. |
| `pnpm lint` | Sin errores; 2 avisos previos y 2 avisos del test nuevo, corregidos después. |
| Acceso AWS `cloudfront:ListDistributions` | Bloqueado por `AccessDenied` de la identidad IAM `Jose`. |
| Acceso AWS `s3:GetBucketPolicy` | Bloqueado por `AccessDenied` de la misma identidad. |

## Decisiones y limitaciones

- Se usa el dominio estándar de CloudFront para evitar DNS y certificado propio.
- La transición mantiene la firma S3 solo cuando no se define ninguna variable de CloudFront. Una configuración parcial da `503`.
- La creación de recursos AWS requiere permisos adicionales de CloudFront y de política del bucket; solicitados al usuario.
- Estado: implementación de código verificada; infraestructura y prueba de extremo a extremo pendientes.
