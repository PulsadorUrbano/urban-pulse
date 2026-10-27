# Spec Driven Development (frontend-web)

Misma estructura de trazabilidad que `frontend-mobile/docs/spec/`. El uso de IA queda registrado en cada documento mediante los campos de desarrollador responsable, asistente de IA y modelo de IA.

## Estructura

```text
spec/
└── features/                           ← Carpeta dedicada por funcionalidad
|   └── DD-MM-YY-nombre-feature/        ← Identificador cronológico (ej. 27-10-26-login-operador)
|       ├── spec.md                     ← Casos de uso, UI requerida, endpoints y criterios de aceptación
|       └── plan.md                     ← Checklist granular de la implementación
└── refactor/                           ← Carpeta dedicada a la refactorización
|   └── nombre-feature/                 ← A qué funcionalidad se le ha aplicado la refactorización
|   |   └── DD-MM-YY-asunto.md          ← Explicación de la refactorización y documentación sobre esta
|   └── independent/                    ← Refactorizaciones independientes a una feature
|   |   └── DD-MM-YY-asunto.md          ← Explicación de la refactorización y documentación sobre esta
└── bugs/                               ← Carpeta dedicada al arreglo de bugs
|   └── nombre-feature/                 ← A qué funcionalidad se le ha aplicado el arreglo de bugs
|   |   └── DD-MM-YY-asunto.md          ← Explicación del arreglo de bugs y documentación sobre este
|   └── todo.md                         ← Bugs anotados para arreglar en un futuro, viene con estructura que se debe seguir
└── templates/                          ← Plantillas para el agente
    ├── bug-template.md                 ← Para rellenar un bug
    ├── refactor-template.md            ← Para rellenar la refactorización
    ├── spec-template.md                ← Para rellenar el spec de una feature
    └── plan-template.md                ← Para rellenar el plan de una feature
```

## `spec.md` vs. `plan.md`

Son dos documentos complementarios, nunca uno sustituye al otro:

- **`spec.md` es el contrato.** Qué se construye, para quién, los endpoints consumidos (backend real y fallback), la UI y los criterios de aceptación. Una vez aprobado, cambia poco.
- **`plan.md` es la ejecución.** Enfoque técnico, mapa de archivos, checklist de tareas y comandos de verificación con su resultado real. Se actualiza durante toda la implementación hasta la "Confirmación de implementación" final.

## Flujo para una feature nueva

1. Crear `features/DD-MM-YY-nombre-feature/` con la fecha de inicio.
2. Rellenar `spec.md` a partir de `templates/spec-template.md`.
3. Rellenar `plan.md` a partir de `templates/plan-template.md`.
4. Implementar y verificar (`npm run lint`, `npm run test`, `npm run build`), marcando el checklist de `plan.md`.
5. Registrar el resultado final en la sección "Confirmación de implementación" del propio `plan.md`. No crear informes aparte.

## Flujo para un bug

1. Anotar el bug en `bugs/todo.md` si no se va a arreglar en el momento.
2. Al arreglarlo, crear `bugs/nombre-feature/DD-MM-YY-asunto.md` a partir de `templates/bug-template.md`.
3. Marcar el bug como resuelto en `bugs/todo.md` si venía de ahí.

## Flujo para una refactorización

1. Crear `refactor/nombre-feature/DD-MM-YY-asunto.md` (o `refactor/independent/DD-MM-YY-asunto.md`) a partir de `templates/refactor-template.md`.
2. Documentar motivo, alcance y resultado; una refactorización no debe cambiar comportamiento observable.

## Documentación anterior

`frontend-web/spec/2026-10-20-003-token-jwt-integration.md` se conserva como referencia histórica en su ubicación original.
