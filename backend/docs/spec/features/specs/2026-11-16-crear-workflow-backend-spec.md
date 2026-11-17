# 2026-11-16 — Especificación: crear workflow del backend

- Desarrollador responsable: pendiente de identificación en la PR.
- Asistente de IA: Codex.
- Modelo de IA que creó la especificación: gpt-6.1-sol.
- Rama: `chore/161-workflow-backend`, basada en `feat-integracion-s3`.
- Última actualización: 2026-11-16.
- Estado: implementación autorizada por el usuario.
- Plan: [Plan de implementación](../plans/2026-11-16-crear-workflow-backend-plan.md).
- Referencia: [Issue 161](https://github.com/PulsadorUrbano/urban-pulse/issues/161).

## Objetivo y decisiones vigentes

Verificar automáticamente compilación, lint y pruebas unitarias del backend antes de integrar cambios. Crear `.github/workflows/backend-build.yml`.

- Alcance: un job en Ubuntu con Node 22, pnpm según `backend/package.json` (10.34.8) y caché del almacén por `backend/pnpm-lock.yaml`.
- Disparadores: PR hacia cualquier rama para admitir el stack sobre S3; push a `dev`. Ambos se filtran por `backend/**` y el archivo del workflow.
- Alternativas: limitar las PR a `dev` dejaría sin comprobar la PR apilada; separar los comandos en varios jobs repetiría la preparación. Se adopta un único job con pasos separados.
- Fuera de alcance: despliegue, frontend, pruebas e2e, servicios externos y migraciones.

## Contexto verificado

`backend/package.json` declara Node >=22, pnpm 10.34.8, `build`, `lint` y `test`. `build` genera el cliente Prisma antes de compilar; `vitest.config.ts` descubre las pruebas unitarias `**/*.spec.ts`.

## Contrato HTTP y documentación de endpoints

No se crean ni modifican endpoints: el cambio solo automatiza los comandos existentes.

## Modelos y objetos Prisma

Se conserva el esquema. Generar el cliente no aplica migraciones ni conecta PostgreSQL. La URL de CI es un valor ficticio para cargar la configuración, sin credenciales externas.

## Diseño mínimo

Checkout, preparación de pnpm y Node, instalación con lockfile congelado, build, lint y tests. Los comandos se ejecutan en `backend/`; un fallo detiene el job. Permisos de lectura y tiempo máximo de 15 minutos.

## Criterios de aceptación

1. Los cambios del backend o del workflow disparan las verificaciones en PR y push a `dev`.
2. Se usan Node 22, pnpm 10.34.8 y el lockfile del backend.
3. Se ejecutan build, lint y pruebas unitarias en pasos separados.
4. No se requieren PostgreSQL, AWS, secretos ni migraciones para ejecutar las verificaciones.
5. La PR se apila sobre S3 y referencia el issue 161.

## Estrategia de verificación

Revisar YAML, rutas y filtros; ejecutar build, lint y unitarias; comprobar `git diff --check`. La ejecución real en Ubuntu se comprueba en GitHub Actions tras abrir la PR. Registrar los resultados en el plan.
