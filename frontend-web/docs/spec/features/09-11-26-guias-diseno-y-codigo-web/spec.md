# 2026-11-09 — Especificación: guías de diseño y de estilo de código del panel web

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA que creó la especificación: Claude Opus 5.5 (claude-opus-5-5).

- Rama: feature/web-typescript-migration.
- Última actualización: 2026-11-09.
- Estado: implementado y verificado.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: petición del desarrollador para coordinar el trabajo de frontend web con su compañera; PR #129.

## Objetivo y decisiones vigentes

Dejar por escrito el diseño y el estilo de código reales del panel web, para que una IA en otro ordenador trabaje de forma coherente con lo ya hecho.

- Alcance confirmado: skills `diseno-web` y `estilo-codigo-web` en `frontend-web/.claude/skills/` y referencia en `frontend-web/CLAUDE.md`.
- Decisiones confirmadas: skills del proyecto, porque se versionan con el repositorio y Claude Code las activa solas. Escritas en inglés, como la skill `trazabilidad`. Los valores se extraen del código, no de memoria.
- Suposiciones por validar: ninguna.
- Fuera de alcance: cambiar código, estilos o los defectos visuales que las guías señalan; backend y frontend-mobile.

## Contexto verificado

- Implementación actual: 774 clases de color en `src/`, el 77 % de la familia `zinc`; sin `any`, `@ts-ignore` ni `eslint-disable`.
- Contratos y referencias del dominio: no aplica.
- Configuración y dependencias disponibles: Tailwind CSS 3.4, `lucide-react`, TypeScript estricto.
- Diferencia entre estado actual y propuesto: las convenciones pasan de estar solo implícitas en el código a estar documentadas.

## Contrato de datos (backend real + mock)

No aplica: cambio documental, no consume ni simula ningún endpoint.

## Contrato de UI y navegación

No aplica: cambio documental.

## Tipos y datos mock

No aplica: cambio documental.

## Diseño mínimo

Un `SKILL.md` por guía, sin scripts ni dependencias.

## Criterios de aceptación

1. La guía de diseño recoge paleta con valores hexadecimales, roles de color, tipografía, formas y recetas de componentes.
2. Las clases y los valores de la guía de diseño existen en el código o en Tailwind.
3. La guía de código recoge capas, nombres, TypeScript, React, llamadas al backend, tests y comprobaciones.
4. Ambas guías señalan lo que no se debe imitar o aplicar sin acuerdo.

## Estrategia de verificación

Contrastar por script las clases y los colores de la guía con `src/` y con la paleta de Tailwind. Revisar rutas, enlaces y diff sin ejecutar la aplicación.

Los resultados reales se registran en [el mismo plan](./plan.md#confirmación-de-implementación).
