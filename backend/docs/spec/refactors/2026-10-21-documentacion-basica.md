# Documentación básica del backend

- Desarrollador responsable: Jose
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: Identificador exacto no expuesto por la sesión.

- Fecha: 2026-10-21.
- Rama: docs-crear-documentacion-basica.
- Estado: guía completada y verificada.

## Objetivo y alcance

Reescribir backend/AGENTS.md en español utilizando la guía previa del backend y frontend-mobile/CLAUDE.md de feature/registro-incidencia. El archivo no está en la copia actual de docs-crear-documentacion-basica, pero se ha leído directamente mediante git show, sin cambiar de rama. Las referencias local y origin/feature/registro-incidencia contienen el mismo blob b9c49d771321d811f5b9942ebb6cb69f9afea49a. No existe un AGENTS.md en la raíz de esta rama.

Incluir programación y documentación en español, modelos y objetos tipados Prisma para cada funcionalidad, estructura de pruebas unitarias por funcionalidad y rol, y documentación dentro de backend/docs/spec/ con especificación, plan, tareas e informe según el tipo de cambio. Adaptar contexto del producto, nombres autodescriptivos, tipado sin any y seguimiento de tareas de la referencia móvil. Conservar contratos y nombres técnicos existentes; no traducirlos mediante cambios de código en esta tarea.

## Criterios de aceptación

- Guía completa en español, sin emojis, con comandos y rutas comprobados contra esta rama.
- Modelos Prisma obligatorios al implementar funcionalidades; distinguir generación de tipos, almacenamiento temporal y persistencia real.
- Pruebas nuevas en test/<funcionalidad>/<rol>/; solo unitarias por defecto, sin e2e ni integración salvo solicitud explícita.
- Diferenciar estructura recomendada del estado heredado, sin afirmar migraciones o movimientos inexistentes.
- Explicar spec.md, plan.md, tasks.md e informe.md y conservar los documentos históricos de la raíz.
- No modificar código, dependencias, configuración, frontend, pruebas existentes ni bases de datos. No crear commits ni hacer push.

## Verificación

Se revisan package.json, vitest.config.ts, los módulos, controladores, esquema/configuración Prisma, Dockerfile, Compose y rutas documentales. Revisión final correcta: rutas de referencia y scripts comprobados, guía sin emojis y git diff --check sin errores. Solo se modifica backend/AGENTS.md y se añade esta especificación. No corresponde ejecutar pruebas de aplicación para este cambio documental.

## Adaptación de la referencia de registro de incidencias

Se incorporan el contexto de UrbanPulse, el alcance del backend, las convenciones de nombres y tipado, tasks.md y un flujo de seguimiento de tareas. Se conserva la programación en español solicitada para el backend frente al inglés indicado por la guía móvil. No se trasladan reglas de Expo, UI, fixtures mobile ni permisos exclusivos del frontend. No se copia ni modifica el CLAUDE.md original ni se cambia de rama.
