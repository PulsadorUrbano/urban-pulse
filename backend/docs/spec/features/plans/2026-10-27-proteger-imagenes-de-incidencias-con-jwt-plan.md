# 2026-10-27 - Plan para proteger imágenes de incidencias con JWT

- Especificación: [Contrato y criterios](../specs/2026-10-27-proteger-imagenes-de-incidencias-con-jwt-spec.md).
- Rama: feature-login.
- Objetivo: retirar acceso estático y reutilizar autorización de incidencias para cada descarga.
- Estado: implementado y verificado; revisión independiente sin hallazgos.

## Restricciones y decisiones

Solo backend. Preservar URLs y almacenamiento, sin DB/servidor/migraciones, dependencias nuevas, npm install, e2e/integración, commit o push. Spec y plan son los únicos documentos nuevos de seguimiento.

La explicación previa fijó propietario u operador como política y el usuario pidió aplicarla. Reutilizar guardas y findOne; no introducir cookies, JWT en query o URL firmada. Lectura Buffer por límite existente de 5 MiB y para evitar errores asíncronos de streaming con rutas internas.

## Preparación

- [x] Trazar entrada/sink: montaje estático main.ts y rutas generadas en UploadStorageService.save.
- [x] Investigación independiente previa, solo lectura: único montaje productivo; e2e heredada monta static por su cuenta y no debe usarse como evidencia del cierre. No ejecutarla ni ampliarla.
- [x] Consultar Context7 sobre StreamableFile y cabeceras; inspeccionar versión instalada.
- [x] Base real: 21 archivos y 273 unitarias correctas antes de tocar producto.

## Mapa de archivos y tareas

| Archivo | Cambio |
| --- | --- |
| backend/src/main.ts | Retirar useStaticAssets y su import |
| backend/src/incidents/controllers/uploads.controller.ts | Ruta exacta, guardas, roles, Buffer/StreamableFile y cabeceras |
| backend/src/incidents/incidents.module.ts | Registrar controlador existente en la misma funcionalidad |
| backend/src/incidents/incidents.service.ts | obtenerImagen(id,archivo,usuario): {incidenciaId:string;imagen:IncidentImage}, con propiedad y metadata |
| backend/src/incidents/upload-storage.service.ts | Nombre reconstruido común y leer(incidenciaId,imagen): Promise<Buffer>, con errores seguros |
| backend/test/incidents/controllers/uploads.controller.spec.ts | Metadata, descarga legítima, errores de pertenencia sin lectura |
| backend/test/incidents/services/leer-imagen.service.spec.ts | Lectura con fs doblado, escape real, no regular y errores |
| backend/docs/spec/endpoint/ | Nueva ficha y referencias al contrato protegido |

## Tarea 1: pruebas del límite y cierre de la ruta

- [x] Escribir primero unitarias de controlador/servicio para dueño y admin/administrative, imagen ajena, ausente/no registrada y nombres traversal/codificados; comprobar que no se llama a lectura cuando falla permiso o metadata.
- [x] Añadir unitarias de almacenamiento con realpath/stat/readFile doblados: bytes esperados, ruta fuera de raíz, directorio, ENOENT y EACCES. No acceder a disco real en las pruebas nuevas.
- [x] Observar fallos antes de implementar; registrar evidencia aquí.
- [x] Implementar controlador con guardas existentes, nombre exacto reconstruido por servidor y chequeo de pertenencia antes de fs. Registrar en módulo.
- [x] Retirar montaje estático completo del arranque. No fallback para archivos existentes tras pérdida del Map.
- [x] Devolver StreamableFile(Buffer) con MIME/Content-Disposition y cabeceras no-store/nosniff; errores de disco sin rutas en respuesta.

## Tarea 2: verificación y documentación

- [x] Ejecutar unitarias focalizadas, luego npm test, npm run build y npm run lint.
- [x] Revisión independiente posterior centrada en bypass y regresiones, una sola ronda según fix-finding.
- [x] Crear ficha de descarga, actualizar catálogo y avisos de /uploads público sin reescribir historia del alcance previo.
- [x] Revisar enlaces, diff y ausencia de useStaticAssets en producción; el test e2e heredado sigue fuera de alcance y no es una configuración productiva.

## Comprobaciones finales

| Comprobación | Resultado real |
| --- | --- |
| Unitarias focalizadas/completas | 25 pruebas nuevas correctas; 23 archivos y 298 casos en suite completa |
| Build/lint | Correctos, cuatro avisos de lint heredados |
| Bypass y control legítimo | Propietario/operadores PNG/JPEG/WebP, ajeno/no registrado, traversal/encoding y errores FS cubiertos sin HTTP |
| Diff/enlaces | 9 documentos sin enlaces ausentes; git diff --check -- backend correcto y sin montajes estáticos productivos |

## Ejecución y evidencia

- Investigación previa independiente confirmó el montaje público de main.ts como única vía productiva. El padre contrastó source/sink, roles actuales, asociación del Map, metadatos y composición de rutas antes de escribir.
- Rojo observado: seis unitarias de lectura fallaron por leer aún inexistente; el controlador inicialmente no cargaba y tras introducir su interfaz mínima fallaron sus 17 casos de comportamiento.
- Verde: lectura/controlador correctos; cobertura adicional de formatos JPEG/WebP junto a PNG. Total 25 casos nuevos, suite completa 23 archivos y 298 pruebas correctas.
- Build y lint correctos, sin nuevos avisos. Persisten cuatro avisos anteriores de Unicode, variable no usada y spread de instancia en pruebas.
- Eliminado useStaticAssets de main.ts y revisado también dist/main.js regenerado; no se encontraron montajes estáticos en src/ ni dist/. El test e2e heredado monta static por su cuenta: no es arranque productivo y no se ejecutó ni modificó.
- Se preservan URLs, MIME, archivos existentes y dependencias. Se reconstruye nombre desde id/MIME, no desde url; propiedad antes de FS. realpath confina la lectura, stat rechaza no regulares y errores no exponen rutas locales.
- Revisión independiente posterior, una ronda según fix-finding: sin bypass o regresiones concretos. El revisor inspeccionó archivos/callers directamente al fallar Git por restricciones de sandbox; el padre comprueba diff/estado por separado.
- Context7 consultado para StreamableFile y cabeceras. Buffer evita mensajes asíncronos del stream que podrían incluir rutas internas en esta versión de Nest; tamaños sujetos al límite de subida existente.

## Confirmación de implementación

- Estado final: implementado y verificado, incluido cierre documental.
- Fecha: 2026-10-27.
- Criterios 1 a 4: cumplidos por eliminación del estático, ruta protegida, pertenencia estricta, FS confinado y cabeceras/errores comprobados.
- Criterio 5: 298 unitarias, build/lint, revisión independiente y 9 documentos/enlaces/diff correctos.
- Sin DB/servidor, frontend, migraciones, e2e/integración, dependencias nuevas, commit ni push.
- Límites: metadatos en memoria, copias/cachés anteriores no revocables y consumidores deben adjuntar Authorization. Sin garantía frente a escritura local maliciosa concurrente en el almacenamiento.
