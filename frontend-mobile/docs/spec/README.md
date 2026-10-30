# Spec Driven Development 

## Estructura

```text
spec/
└── features/                           ← Carpeta dedicada por funcionalidad
|   └── DD-MM-YY-nombre-feature/        ← Identificador cronológico (ej. 10-02-26-registro-incidencia)
|       ├── spec.md                     ← Casos de uso, UI requerida, endpoints y criterios de aceptación
|       └── plan.md                     ← Checklist granular gestionado por el agente organizador
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

- **`spec.md` es el contrato.** Qué se construye, para quién, el contrato de datos (backend real + mock) y de UI, y los criterios de aceptación. Una vez aprobado, cambia poco — solo para registrar una ampliación o recorte de alcance ya acordado.
- **`plan.md` es la ejecución.** Enfoque técnico, mapa de archivos, checklist de tareas y comandos de verificación con su resultado real. Es un documento vivo: se actualiza continuamente durante toda la implementación hasta la "Confirmación de implementación" final.

## Flujo para una feature nueva

1. Crear `features/DD-MM-YY-nombre-feature/` con la fecha de inicio.
2. Rellenar `spec.md` a partir de `templates/spec-template.md`: qué hace, por qué y criterios de aceptación medibles.
3. Rellenar `plan.md` a partir de `templates/plan-template.md`: enfoque técnico, mapa de archivos y checklist de tareas.
4. Implementar y verificar (lint, typecheck, tests), marcando el checklist de `plan.md` a medida que se avanza.
5. Registrar el resultado final en la sección "Confirmación de implementación" del propio `plan.md`. No crear informes ni documentos de cierre aparte.

El agente `organizador` es responsable de mantener esta carpeta y su trazabilidad.

## Flujo para un bug

1. Anotar el bug en `bugs/todo.md` si no se va a arreglar en el momento.
2. Al arreglarlo, crear `bugs/nombre-feature/DD-MM-YY-asunto.md` a partir de `templates/bug-template.md`.
3. Marcar el bug como resuelto (quitar o tachar la línea) en `bugs/todo.md` si venía de ahí.

> Si el bug pertenece a una feature que ya tiene más bugs, no hace falta crear `bugs/nombre-feature/DD-MM-YY-asunto.md`, basta con introducirlo en `bugs/nombre-feature/`.

## Flujo para una refactorización

1. Crear `refactor/nombre-feature/DD-MM-YY-asunto.md` (o `refactor/independent/DD-MM-YY-asunto.md` si no pertenece a una feature concreta) a partir de `templates/refactor-template.md`.
2. Documentar motivo, alcance y resultado; una refactorización no debe cambiar comportamiento observable.

> Si refactor pertenece a una feature que ya tiene más refactors, no hace falta crear `bugs/nombre-feature/DD-MM-YY-asunto.md`, basta con introducirlo en `bugs/nombre-feature/`.

> El alcance, el stack y las convenciones del proyecto los manda `CLAUDE.md` — no se duplican aquí. Si una feature, bug o refactor choca con lo que indica `CLAUDE.md`, se replantea el trabajo, no `CLAUDE.md`.
