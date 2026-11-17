# 2026-11-17 — Plan para cerrar el modelo y auditar asignaciones

- PR: #185, sobre fix/prisma-model-integrity.
- [Especificación](../specs/2026-11-17-cerrar-modelo-asignaciones-spec.md).
- Implementar migración incremental, categorías y ubicación obligatorias, perfiles compatibles y pertenencias.
- Aplicar matriz de estados y registrar asignaciones atómicamente.
- Actualizar contratos, diagrama, SQL de referencia y pruebas unitarias.

## Confirmación de implementación

- Modelo, migración incremental, catálogo controlado, pertenencias y conservación implementados.
- Historial de asignaciones, matriz de estados y permisos implementados con escritura atómica y control optimista.
- Prisma validate y generate correctos; nest build y tsc correctos.
- Vitest tras fusionar dev: 325 pruebas correctas en 27 archivos. Incluye rollback de asignación, permisos, transiciones, estados iniciales y compatibilidad ciudadano/operario.
- Oxlint con tipos: sin errores, dos avisos previos en autenticación y semilla de desarrollo.
- En la implementación original, los comandos se ejecutaron mediante los CLI locales de Node porque pnpm no estaba disponible en PATH. Tras la fusión se usó pnpm 10.34.8. Las dependencias instaladas contienen Vitest 4.1.11; package.json declara ^4.1.2.
- La primera ejecución de Vitest quedó bloqueada por permisos de renombrado en su carpeta temporal. Se ejecutó correctamente usando la carpeta temporal de trabajo permitida.
- SQL de referencia regenerado desde Prisma y diagrama actualizado; las restricciones no representables en Prisma permanecen documentadas en las migraciones.
- Tras fusionar dev, las siete migraciones se aplicaron en un PostgreSQL 16 temporal y vacío. Se verificaron 10 categorías activas, 15 activos urbanos y la tabla IncidentImage. Se insertó una incidencia con categoría, ubicación y referencia de foto; Prisma migrate diff no detectó diferencias con el esquema final. La base temporal se descartó; no se modificó ninguna base existente. Los datos históricos incompatibles siguen requiriendo corrección antes de migrar y poblar una base ya usada.
- Cambio de contrato: categoría y coordenadas obligatorias en el alta; cause obligatorio y equipo requerido al asignar. Frontends pendientes de adaptación.
