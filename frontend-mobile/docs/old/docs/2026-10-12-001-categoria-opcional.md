# Sesión — 2026-10-12 · Feature 001 · Ampliación: categoría opcional

## Contexto

La feature 001 (registro de incidencia) ya estaba en "Hecho " con título obligatorio y
descripción opcional. En esta sesión se **planifica** una ampliación de esa misma feature para
capturar una **categoría opcional** al registrar una incidencia. Aquí solo se actualiza la
documentación de `spec/`; **no** se toca `src/` ni `db.json` y no se crea una feature nueva.

## Alcance de la ampliación

- Nueva entidad `Category { id: string; name: string }`, cargada del mock vía `GET /categories`.
- `Incident` añade `category: string | null` junto al ya existente `categoryId: string | null`.
- `db.json` tendrá la colección `categories` con `Transporte`, `Alumbrado público` y
  `Objetos urbanos`.
- Selector opcional en el formulario con las 3 categorías + "Otros"; "Otros" abre un `TextInput`
  libre y "Otros" vacío es error de validación. Botón "×" para deseleccionar.
- Categoría existente → `categoryId`; texto libre → `category`; sin elegir → ambos `null`.

## Decisiones clave

- `category` y `categoryId` coexisten y son mutuamente excluyentes.
- `fetchWithTimeout` + `RequestTimeoutError` se extraen a un helper común `src/services/http.ts`.
- La carga de categorías vive en `src/hooks/use-categories.ts`, separada del envío.
- La categoría nunca bloquea el registro; un fallo de `GET /categories` es recuperable.

## Documentos actualizados

- [x] `spec/features/001-registro-incidencia/spec.md` — descripción, criterios de aceptación y "Fuera de alcance".
- [x] `spec/features/001-registro-incidencia/plan.md` — pasos técnicos, decisiones y riesgos.
- [x] `spec/features/001-registro-incidencia/tasks.md` — checklist granular (base en `[x]`, ampliación en `[ ]`).
- [x] `spec/constitution/roadmap.md` — 001 sigue en "Hecho " con nota de categoría opcional.

## Pendiente (siguiente ciclo)

- [ ] Implementar las tareas de la sección "Categoría opcional" de `tasks.md` vía `developer`.
- [ ] `npx expo lint` + `npx tsc --noEmit` + tests (compiler-checker / tester).
- [ ] Marcar la ampliación como completada.

> Detalle granular en `spec/features/001-registro-incidencia/tasks.md`.
