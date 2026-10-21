# Catálogo de endpoints del backend

Este directorio permite descubrir los contratos de la API mediante el listado de sus carpetas. Es documentación; no contiene controladores ni crea rutas HTTP.

## Consultar el catálogo

Desde la raíz del repositorio:

~~~sh
ls backend/docs/spec/endpoint
~~~

Desde backend/:

~~~sh
ls docs/spec/endpoint
~~~

En PowerShell también puede usarse Get-ChildItem con esas mismas rutas. Después de listar las carpetas, leer el README.md de la carpeta del endpoint buscado.

## Organización

Una carpeta por método y ruta, con nombre en minúsculas y kebab-case: método seguido de la ruta sin la barra inicial; sustituir las demás barras por guiones y los parámetros por nombres legibles. Por ejemplo, POST /incidents se documenta en post-incidents/ y GET /incidents/:id en get-incidents-id/. Son ejemplos de nombres, no una declaración de endpoints comprobados en este catálogo.

~~~text
endpoint/
  README.md
  <metodo>-<ruta-normalizada>/
    README.md
~~~

Cada README.md debe indicar:

- Estado del contrato y fecha de última revisión; distinguir propuesta e implementación.
- Método, ruta y finalidad.
- Autenticación y permisos realmente aplicados, o su ausencia.
- Parámetros de ruta/consulta, formato del cuerpo, tipos y validaciones.
- Ejemplos válidos de entrada y respuesta, códigos, cabeceras y errores.
- Almacenamiento y limitaciones que afecten al consumidor.
- Enlaces relativos a la especificación, plan, controlador, DTO/pipe y servicio existentes.

Al añadir, modificar o retirar un endpoint, actualizar su carpeta en el mismo cambio. Verificar también la compatibilidad con los consumidores sin conectarlos salvo petición explícita. No hacer solicitudes HTTP en vivo únicamente para consultar esta documentación.

## Endpoints documentados

- [Registrar incidencias](post-incidents/README.md): POST /incidents.
- [Consultar una incidencia](get-incidents-id/README.md): GET /incidents/:id.
- [Consultar categorías](get-categories/README.md): GET /categories.

Contratos revisados estáticamente; consultar cada ficha para los límites y la fecha de revisión.
