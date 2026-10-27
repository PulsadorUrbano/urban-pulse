# {{fecha}} — Especificación: {{descripción de la acción o cambio}}

- Desarrollador responsable: {{nombre del desarrollador humano que crea y asume la especificación}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA que creó la especificación: {{identificador y versión exactos o No utilizada; si no están disponibles, declararlo sin inventarlos}}.

> Copiar a frontend-web/docs/spec/features/DD-MM-YY-nombre-feature/spec.md. Sustituir los marcadores y usar rutas relativas desde el documento.

- Rama: {{rama de trabajo}}.
- Última actualización: {{AAAA-MM-DD}}.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: {{issue, petición, especificación previa o decisión aplicable}}.

## Objetivo y decisiones vigentes

{{Problema que resuelve, usuario del flujo (operador municipal, responsable, etc.) y resultado observable esperado.}}

- Alcance confirmado: {{comportamientos incluidos}}.
- Decisiones confirmadas: {{decisión y motivo}}.
- Suposiciones por validar: {{suposición y efecto; o ninguna}}.
- Fuera de alcance: {{límites explícitos, incluidos backend y frontend-mobile}}.

## Contexto verificado

- Implementación actual: {{archivos y comportamiento observado}}.
- Dependencias disponibles: {{versiones comprobadas en package.json}}.
- Diferencia entre estado actual y propuesto: {{cambio concreto}}.

## Contrato de datos (backend real + fallback)

Referencia de solo lectura al contrato documentado por backend; nunca redefinirlo desde el frontend.

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| {{método y ruta}} | {{JSON, parámetros o sin cuerpo}} | {{código y cuerpo}} | {{backend/docs/spec/endpoint/... o "no documentado todavía"}} |

- Identidad y permisos: {{cabecera Authorization, rol requerido, comprobaciones en cliente}}.
- Si el backend no responde: {{aviso en pantalla y comportamiento de fallback}}.

## Contrato de UI

- Componentes y vistas afectados en `src/components/`: {{lista}}.
- Hooks y servicios en `src/hooks/` y `src/services/`: {{lista}}.
- Tipos en `src/types/`: {{nuevos o reutilizados}}.
- Estados de carga y error: {{cómo se evita el envío duplicado y qué ve el usuario}}.

## Criterios de aceptación

1. {{Entrada válida y resultado observable concreto}}.
2. {{Entrada inválida, límite o recurso ausente y comportamiento esperado}}.
3. {{Backend caído o respuesta de error}}.

## Estrategia de verificación

{{Casos de prueba que demuestran cada criterio. Tests en src/__tests__/<ruta-que-refleja-src>/ con Vitest.}}

Los resultados reales se registran en [el plan](./plan.md#confirmación-de-implementación).
