# 2026-11-17 — Plan para cerrar el modelo y auditar asignaciones

- PR: #185, sobre fix/prisma-model-integrity.
- [Especificación](spec.md).
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
- Revisión posterior: la migración conserva el UUID del alias cuando no existe ya el nombre canónico; si ambos existen, activa el canónico sin chocar con los índices únicos y mantiene el histórico inactivo. También detiene la migración ante estados históricos que carecen de la asignación que exigiría el trigger.
- El detalle comprueba una pertenencia real al departamento y aplica el acceso por equipo solo a los roles de equipo y técnico. Se retiró `analyst` de la ruta, pues el servicio no le concede acceso. Vitest: 327 pruebas correctas en 27 archivos; lint sin errores, con los dos avisos previos. Las siete migraciones se aplicaron en un PostgreSQL 16 temporal vacío; en otra base temporal, la última migración también se aplicó con `Iluminación` y `Alumbrado público` coexistiendo. Quedaron 10 categorías activas y la antigua inactiva. No se modificó la base del proyecto.

## Cambios tras la revisión de la PR

- Incorporar la protección de `GET /incidents` de la #170 conservando las reglas de asignación e historial de la #185. El acceso global es de `admin` y `administrative`; los demás roles autorizados solo pueden listar la identidad ciudadana que tienen vinculada.
- Actualizar el mensaje y las pruebas del validador de estados. Mantener el modelo como referencia para las adaptaciones de la #192 (web) y la #193 (móvil).
- Aplicar a los documentos de la #185 la organización por funcionalidad acordada en la #181 y recuperar el workflow de backend de la #167.
- Verificación tras la revisión: [GitHub Actions](https://github.com/PulsadorUrbano/urban-pulse/actions/runs/44707147372) completó la instalación con lockfile congelado, la generación de Prisma, la compilación, el lint con tipos y las pruebas unitarias. Las pruebas del listado cubren filtros ajenos o ausentes, acceso global administrativo y consulta propia con perfil ciudadano y rol técnico.
