# Especificación: autoría y ubicación de la documentación

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Fecha: 2026-10-21.
- Rama: docs-crear-documentacion-basica.
- Estado: completado y verificado.

## Objetivo y alcance

El usuario solicita registrar el desarrollador responsable y la IA autora de cada especificación, y trasladar las plantillas y el resto de la documentación a backend/docs/. Se conserva la estructura spec/{templates,specs,plans,reports,endpoint}, junto a los ADR, migraciones y diagramas existentes. No se modifica código ni se conecta ningún servicio.

## Decisiones

Cada especificación identifica al desarrollador humano responsable, al asistente y al modelo exacto que la redactó. No confundir el asistente con el identificador del modelo. Si un dato no fue registrado o no está disponible, declararlo expresamente, sin atribuir la autoría histórica a la IA actual. Las plantillas requieren completar estos campos.

Mantener las rutas relativas entre documentos y actualizar las instrucciones de copia, consultas al catálogo y referencias del README y AGENTS. El traslado combina archivos con backend/docs/ sin sobrescribir archivos existentes.

## Criterios de aceptación

- Plantillas, catálogo, especificaciones, planes, informes, ADR, migraciones y diagramas bajo backend/docs/.
- Metadatos de autoría en la plantilla y las especificaciones existentes, sin nombres o versiones inventadas.
- Consulta de endpoints desde raíz: ls backend/docs/spec/endpoint; desde backend/: ls docs/spec/endpoint.
- Enlaces locales y destinos de copia coherentes, sin pérdida de archivos ni cambios de contenido binario.
- Solo cambios documentales; sin dependencias, ejecución de pruebas de aplicación, commits o push.

## Verificación

Trasladados 13 archivos desde docs/ y comprobados sus hashes antes de actualizar las referencias. Se conserva la documentación que ya existía en backend/docs/. Verificados todos los enlaces Markdown locales sin marcadores, los tres campos de autoría de las especificaciones, las rutas de las plantillas, el catálogo desde raíz y backend, y las referencias de ADR/migraciones del README. git diff --check correcto. No se ejecutan pruebas de aplicación por tratarse de documentación.

## Corrección de la guía de agentes

El usuario señala que AGENTS.md no quedó actualizado correctamente. Se elimina la mezcla de rutas documentales relativas a backend/ y a la raíz: las rutas de plantillas, destinos, catálogo y flujo de trabajo se expresan ahora desde la raíz como backend/docs/. Se añaden el árbol completo de documentación y una sección de autoría obligatoria con los tres campos exactos de la plantilla. Solo los ejemplos de comandos distinguen explícitamente el directorio de ejecución.
