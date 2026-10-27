# Spec Driven Development y trazabilidad de IA (frontend-web)

Carpeta única de trazabilidad del frontend web: qué se construye (spec), cómo se ejecuta (plan), qué se corrige (bugs), qué se reestructura (refactor) y con qué prompts de IA se ha hecho cada cambio (prompts).

Sigue la misma estructura que `frontend-mobile/docs/spec/` y los mismos campos de IA que `backend/docs/spec/templates/`, añadiendo el historial diario de prompts.

## Estructura

```text
docs/spec/
├── features/                            <- Carpeta por funcionalidad
│   └── AAAA-MM-DD-nombre-feature/       <- Fecha de inicio + descripción (ej. 2026-10-27-login-operador)
│       ├── spec.md                      <- Contrato: alcance, endpoints consumidos, UI y criterios de aceptación
│       └── plan.md                      <- Ejecución: mapa de archivos, checklist y confirmación de implementación
├── refactor/
│   ├── nombre-feature/AAAA-MM-DD-asunto.md
│   └── independent/AAAA-MM-DD-asunto.md <- Refactors no atados a una feature
├── bugs/
│   ├── nombre-feature/AAAA-MM-DD-asunto.md
│   └── todo.md                          <- Bugs pendientes de arreglar
├── prompts/
│   └── AAAA-MM-DD.md                    <- Historial de prompts de IA del día, en orden
└── templates/
    ├── spec-template.md
    ├── plan-template.md
    ├── bug-template.md
    ├── refactor-template.md
    └── prompts-template.md
```

Las fechas usan el formato `AAAA-MM-DD` (el mismo que la especificación existente `frontend-web/spec/2026-10-20-003-token-jwt-integration.md`), para que las carpetas y archivos se ordenen cronológicamente.

## Historial de prompts (`prompts/`)

Es la pieza central de la trazabilidad del uso de IA:

1. Un archivo por día de trabajo: `prompts/AAAA-MM-DD.md`, creado a partir de `templates/prompts-template.md` la primera vez que se usa la IA ese día.
2. Cada prompt que produce o condiciona un cambio en el repositorio se añade como una entrada nueva, numerada en orden (`## 01`, `## 02`, ...). Nunca se reescriben entradas anteriores; si algo cambia, se añade otra entrada.
3. El prompt se copia literal. Solo se sustituyen secretos, tokens o datos personales por `[REDACTADO]`.
4. Cada entrada enlaza el resultado: archivos tocados, la spec/plan/bug/refactor relacionado y el commit o PR.
5. El archivo del día se incluye en el mismo commit (o PR) que los cambios que describe.

Las preguntas puramente informativas que no generan cambios pueden omitirse o resumirse en una sola entrada.

## `spec.md` vs. `plan.md`

- **`spec.md` es el contrato.** Qué se construye, para quién, endpoints consumidos (backend real y fallback), UI y criterios de aceptación. Una vez aprobado cambia poco.
- **`plan.md` es la ejecución.** Enfoque técnico, mapa de archivos, checklist y comprobaciones con su resultado real. Se actualiza durante toda la implementación hasta la "Confirmación de implementación".

Ambos documentos declaran desarrollador responsable, asistente de IA y modelo exacto; si el modelo no está disponible, se indica sin inventarlo.

## Flujo para una feature nueva

1. Crear `features/AAAA-MM-DD-nombre-feature/` con la fecha de inicio.
2. Rellenar `spec.md` y `plan.md` a partir de las plantillas.
3. Implementar y verificar (`npm run lint`, `npm run test`, `npm run build`), marcando el checklist del plan.
4. Registrar el resultado en la "Confirmación de implementación" del propio plan. No crear informes aparte.
5. Registrar los prompts usados en `prompts/AAAA-MM-DD.md` de cada día de trabajo.

## Flujo para un bug

1. Anotarlo en `bugs/todo.md` si no se arregla en el momento.
2. Al arreglarlo, crear `bugs/nombre-feature/AAAA-MM-DD-asunto.md` desde `templates/bug-template.md` y marcarlo como resuelto en `bugs/todo.md`.

## Flujo para una refactorización

1. Crear `refactor/nombre-feature/AAAA-MM-DD-asunto.md` (o `refactor/independent/`) desde `templates/refactor-template.md`.
2. Documentar motivo, alcance y resultado; un refactor no cambia comportamiento observable.

## Documentación anterior

`frontend-web/spec/2026-10-20-003-token-jwt-integration.md` se conserva como referencia histórica en su ubicación original. Los cambios nuevos se documentan en esta carpeta.
