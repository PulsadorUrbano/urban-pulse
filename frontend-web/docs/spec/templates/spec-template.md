# {{fecha}} — Especificación: {{descripción de la acción o cambio}}

- Desarrollador responsable: {{nombre del desarrollador humano que crea y asume la especificación}}.
- Asistente de IA: {{herramienta utilizada o No utilizada}}.
- Modelo de IA que creó la especificación: {{identificador y versión exactos o No utilizada; si no están disponibles, declararlo sin inventarlos}}.

> Crear únicamente esta especificación y su plan. Copiar a frontend-web/docs/spec/features/DD-MM-YY-nombre-feature/spec.md. Usar una descripción concreta de la acción en el nombre de la carpeta y la fecha AAAA-MM-DD en el título. Sustituir los marcadores y usar rutas relativas desde el documento.

- Rama: {{rama de trabajo}}.
- Última actualización: {{AAAA-MM-DD}}.
- Estado: borrador; implementación y verificación pendientes.
- Plan: [Plan de implementación](./plan.md#confirmación-de-implementación).
- Referencias: {{petición, issue, ADR, especificación previa o decisión aplicable}}.

## Objetivo y decisiones vigentes

{{Problema que resuelve, rol del personal municipal que usa el flujo y resultado observable esperado.}}

- Alcance confirmado: {{comportamientos incluidos}}.
- Decisiones confirmadas: {{decisión y motivo}}.
- Suposiciones por validar: {{suposición y efecto; indicar ninguna si corresponde}}.
- Fuera de alcance: {{límites explícitos, incluidos backend, frontend-mobile y conexiones externas}}.

## Contexto verificado

- Implementación actual: {{archivos y comportamiento observado}}.
- Contratos y referencias del dominio: {{rutas existentes}}.
- Configuración y dependencias disponibles: {{versiones comprobadas en package.json y servicios activos}}.
- Diferencia entre estado actual y propuesto: {{cambio concreto}}.

## Contrato de datos (backend real + mock)

Si la feature no consume ni simula ningún endpoint, indicarlo expresamente y justificarlo.

### Backend real (consumo)

Referencia de solo lectura al contrato ya documentado por backend; nunca redefinirlo ni implementarlo desde el frontend.

| Método y ruta | Entrada y formato | Respuesta correcta | Referencia |
| --- | --- | --- | --- |
| {{método y ruta}} | {{JSON, multipart, parámetros o sin cuerpo}} | {{código, cuerpo y cabeceras}} | {{enlace a backend/docs/spec/endpoint/... o "no documentado todavía"}} |

- Identidad y permisos: {{token Bearer, roles con acceso al panel web (ADR 0002) o ausencia explícita}}.
- Si el backend no responde (error de red, timeout o 502/503/504 del proxy de Vite): {{aviso en pantalla y caída al mock, según política real-first/fallback}}.

### Mock (`src/mocks/`)

Los datos simulados viven en `src/mocks/` con la misma forma que la respuesta del backend, para que cambiar de origen no obligue a tocar la UI. El origen se elige por configuración (`src/config.ts`, `.env.example`); nunca borrar el mock al añadir el camino real.

| Campo | Tipo | Obligatorio | Validación y normalización | Omisión y null |
| --- | --- | --- | --- | --- |
| {{campo}} | {{tipo}} | {{sí/no}} | {{límites, formato, trim, coerción permitida o rechazada}} | {{comportamiento definido}} |

- Recurso simulado: {{campos, tipos, fechas, anidación y ejemplos válidos}}.
- Errores simulados: {{código o error por condición y mensaje}}.

## Contrato de UI y navegación

- Vistas afectadas: {{componentes en src/components/ y cómo se llega a ellos desde App.jsx}}.
- Componentes nuevos vs. reutilizados: {{lista}}.
- Estados explícitos de carga/error/aviso: {{cómo se evita el envío duplicado y qué feedback ve el usuario}}.

## Tipos y datos mock

| Tipo nuevo o reutilizado (src/types/) | Campos y tipos | Relaciones, nulabilidad y valores iniciales |
| --- | --- | --- |
| {{interfaz}} | {{campos del dominio}} | {{decisiones concretas}} |

{{Diferencia entre el tipo interno y la respuesta pública del backend, si aplica. Para cambios sin entidades nuevas, señalar qué tipos existentes se conservan y por qué no se añaden otros.}}

- Almacenamiento de esta fase: {{mock vs. backend real realmente incluido en el alcance}}.
- Ciclo de vida: {{persistencia en el navegador (localStorage/sessionStorage) o en memoria}}.

## Diseño mínimo

{{Componente, hook y servicio (src/components/, src/hooks/, src/services/) implicados; reutilizar código y dependencias existentes. Estilos con Tailwind CSS e iconos con lucide-react. Describir el flujo y los errores que puedan dejar datos parciales. No añadir capas especulativas.}}

## Criterios de aceptación

1. {{Entrada válida y resultado observable concreto}}.
2. {{Entrada inválida, límite o recurso ausente y comportamiento esperado}}.
3. {{Valores omitidos/null y campos propiedad del servidor}}.
4. {{Origen mock vs. backend y aviso cuando no hay conexión}}.
5. {{Compatibilidad y documentación del contrato}}.

## Estrategia de verificación

{{Casos de prueba y comprobaciones que demostrarán cada criterio de aceptación. Para cambios documentales, revisar rutas, enlaces y diff sin ejecutar la aplicación.}}

Tests con Vitest bajo `src/__tests__/<ruta-que-refleja-src>/`. No crear ni ejecutar e2e o integración salvo petición explícita. Un contrato de consumo documentado no equivale a una verificación de que el backend responde correctamente: el frontend solo comprueba que la petición se envía bien formada y llega con respuesta; no es responsabilidad del frontend depurar la lógica interna del backend.

Los resultados reales, decisiones de ejecución, pendientes y confirmación de implementación se registran únicamente en [el mismo plan](./plan.md#confirmación-de-implementación). No crear informes, archivos de tareas o documentos de cierre separados.
