# 2026-10-21 — Especificación para adaptar la documentación de registro de incidencias

- Desarrollador responsable: pendiente de indicar por el equipo.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: identificador exacto no expuesto por la sesión.
- Rama: feature/registro-incidencia.
- Plan: [Adaptación y confirmación](../plans/2026-10-21-adaptar-documentacion-registro-incidencias-plan.md).

## Objetivo y decisiones

Aplicar la guía y las plantillas acordadas en docs-crear-documentacion-basica, conservando la estructura backend/docs/spec/features/specs/ y backend/docs/spec/features/plans/. Cada cambio tiene una especificación y un plan con fecha y descripción de la acción en el nombre y en el título. El progreso y la confirmación permanecen en el mismo plan.

Se conservan los documentos y resultados históricos como referencias, sin convertir sus instrucciones antiguas de e2e, informes o commits en obligaciones actuales. No se modifica código, pruebas, datos, dependencias ni frontend. No se ejecuta npm install, no se conecta la base de datos y no se crea commit ni push.

## Contexto comprobado y contrato actual

El código de esta rama expone POST /incidents (multipart, título de 4 a 35 puntos de código y civicId UUID obligatorios), GET /incidents/:id y GET /categories. La descripción, categoría, coordenadas y precisión son opcionales; se admiten ocho imágenes JPEG/PNG/WebP de 5 MB. Las coordenadas multipart se validan como cadenas convertibles a números finitos. Los registros usan los modelos Incident, IncidentLocation e IncidentImage en memoria, con fechas Date internas y fechas ISO en las respuestas. Las imágenes son archivos locales. No hay persistencia de incidencias tras reiniciar ni autenticación; los UUID referenciados solo se validan por formato.

El servicio no resuelve automáticamente el nombre de una categoría desde categoryId al crear una incidencia. CategoriesService mantiene su propio catálogo temporal. Esta documentación refleja la lectura estática de la implementación y no equivale a una prueba de conectividad.

## Criterios de aceptación

1. AGENTS.md está en español e incorpora plantillas, solo especificación y plan, confirmación en el mismo plan, unitarias por defecto y prohibición de npm install.
2. Se conserva spec/features/specs/ y spec/features/plans/; los nombres y títulos nuevos contienen fecha y descripción concreta.
3. Las plantillas son coherentes con estas rutas y mantienen los campos de autoría sin inventar nombres o modelos.
4. El catálogo permite consultar los tres endpoints actuales por carpeta con enlaces al código y esta especificación.
5. Las referencias históricas siguen accesibles y se distinguen de la guía vigente; enlaces y diff correctos. No se modifica código de ejecución.

## Diseño mínimo y verificación prevista

Actualizar únicamente AGENTS.md y documentos Markdown del backend. Importar de la rama documental solo la guía y las plantillas, sin fusionar código. Mantener el catálogo en backend/docs/spec/endpoint/. Comprobar rutas, enlaces locales, nombres, títulos y git diff --check; registrar el resultado en el plan. No ejecutar pruebas de aplicación, e2e ni integración para esta adaptación documental.
