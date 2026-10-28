# spec/ — Spec Driven Development (plantilla)

## Estructura

```text
spec/
├── constitution/            ← Reglas base y restricciones inmutables
│   ├── mission.md           ← Propósito de UrbanPulse, usuarios y alcance funcional
│   ├── tech-stack.md        ← Expo, NativeWind, contratos de datos (db.json/types) y convenciones
│   └── roadmap.md           ← Priorización y estado de las features (Backlog / En progreso / Hecho)
└── features/                ← Carpeta dedicada por funcionalidad
    └── NNN-nombre-feature/  ← Identificador incremental (ej. 001-registro-incidencia)
        ├── spec.md          ← Casos de uso, UI requerida, endpoints y criterios de aceptación
        ├── plan.md          ← Enfoque técnico, hooks/servicios, contratos TS y mocks en db.json
        └── tasks.md         ← Checklist granular gestionado por el subagente planner
```

## Flujo para una feature nueva

1. Crear `features/NNN-nombre-feature/` con el siguiente número libre (`001`, `002`, …).
2. Escribir `spec.md`: qué hace, por qué y criterios de aceptación medibles.
3. Escribir `plan.md`: enfoque técnico y decisiones, respetando `constitution/tech-stack.md`.
4. Desglosar en `tasks.md` y marcar el progreso.
5. Implementar y validar (build/tests/lint o lo que defina la constitución).
6. Actualizar `constitution/roadmap.md` (mover la feature a "Hecho").

> La constitución manda: si una feature choca con `mission.md` o `tech-stack.md`, se replantea la feature, no la constitución.
