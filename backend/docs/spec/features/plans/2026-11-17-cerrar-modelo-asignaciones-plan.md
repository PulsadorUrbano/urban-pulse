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
- Vitest: 306 pruebas correctas en 24 archivos. Incluye rollback de asignación, permisos, transiciones, estados iniciales y compatibilidad ciudadano/operario.
- Oxlint con tipos: sin errores, dos avisos previos en autenticación y semilla de desarrollo.
- Comandos ejecutados mediante los CLI locales de Node porque pnpm no estaba disponible en PATH. Las dependencias instaladas contienen Vitest 4.1.11; package.json declara ^4.1.2.
- La primera ejecución de Vitest quedó bloqueada por permisos de renombrado en su carpeta temporal. Se ejecutó correctamente usando la carpeta temporal de trabajo permitida.
- SQL de referencia regenerado desde Prisma y diagrama actualizado; las restricciones no representables en Prisma permanecen documentadas en las migraciones.
- Limitación: migración sin ejecutar contra PostgreSQL. No se aplicaron seeds ni se modificó ninguna base de datos. La población masiva queda pendiente de validar la migración en un entorno de prueba.
- Cambio de contrato: categoría y coordenadas obligatorias en el alta; cause obligatorio y equipo requerido al asignar. Frontends pendientes de adaptación.
