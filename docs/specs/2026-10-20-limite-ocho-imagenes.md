# Limite de ocho imagenes por incidencia

- Fecha: 2026-10-20.
- Rama: feature/registro-incidencia.
- Estado: implementado y verificado.

## Alcance

Alinear POST /incidents con MAX_SELECTED_PHOTOS = 8 del frontend movil. Admitir entre cero y ocho archivos en el campo repetible images; rechazar el noveno con 400. Mantener JPEG, PNG y WebP y el limite individual de 5 MB. No modificar el frontend, las dependencias ni el almacenamiento.

## Diseno minimo y aceptacion

Actualizar los dos limites del interceptor (maxCount y limits.files) y maxItems de Swagger a 8. Verificar que ocho imagenes se crean y se devuelven al consultar la incidencia, que nueve se rechazan y que siguen fallando los archivos demasiado grandes o de tipo no admitido. Actualizar README, guia backend y especificacion vigente.

## Verificacion e informe

La prueba de ocho imagenes y la asercion Swagger fallaron antes del cambio (400 y maxItems 5). Tras actualizar el interceptor y maxItems: build correcto, lint correcto con dos avisos Unicode ya existentes, 37 pruebas unitarias y 13 e2e correctas (50 en total). Se verifica aceptar ocho, rechazar nueve y mantener los rechazos por tamano o tipo.

El frontend ya limita MAX_SELECTED_PHOTOS a 8 y no ha requerido cambios. Se mantienen JPEG/PNG/WebP y 5 MB por archivo. README, guia backend y especificacion vigente actualizados. Se conservaron los cambios locales anteriores; no se crearon commits ni se hizo push.
