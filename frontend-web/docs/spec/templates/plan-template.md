# {{fecha}} — Plan de implementación: {{descripción de la acción o cambio}}

> Crear únicamente este plan y su especificación. Copiar a frontend-web/docs/spec/features/DD-MM-YY-nombre-feature/plan.md.

- Objetivo: {{resultado observable definido por la especificación}}.
- Arquitectura: {{diseño mínimo, componentes existentes reutilizados, nuevos componentes}}.
- Herramientas: {{versiones y dependencias ya disponibles en package.json}}.
- Especificación: [Contrato y criterios](./spec.md).
- Rama: {{rama de trabajo}}.
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar en inglés (identificadores) y documentar en español (comentarios y textos de la UI); conservar contratos públicos y nombres exigidos por las dependencias.
- Código nuevo en TypeScript estricto (sin `any`); estilos solo con Tailwind CSS (`className`); lógica de datos en `src/services/` y `src/hooks/`, no en los componentes.
- No instalar dependencias nuevas sin aprobación explícita previa.
- Backend y mock: real-first con fallback al mock, mostrando un aviso claro en pantalla si no hay conexión; el origen se elige en `src/config.ts`. Nunca borrar lógica o datos mock que el backend aún no cubra de forma estable. No depurar ni arreglar el backend — si falla, reportarlo y continuar.
- Crear tests en `src/__tests__/<ruta-que-refleja-src>/`. No crear ni ejecutar e2e/integración salvo solicitud explícita.
- Confinar los cambios a `frontend-web/`. Preservar cambios ajenos y la rama acordada. No crear commits ni hacer push salvo petición explícita.
- Restricciones particulares: {{límites, valores iniciales y reglas exactas de esta funcionalidad}}.

## Focos de revisión

{{Relacionar cada riesgo relevante de la especificación con la tarea y el caso unitario que lo comprueba: tipos incorrectos, límites, null/omisión, recursos ausentes, permisos por rol, fallos parciales o caída al mock. No inventar operaciones fuera del alcance.}}

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| {{crear/modificar}} | {{ruta exacta de código, componente o prueba}} | {{responsabilidad}} |
| Actualizar (si aplica) | frontend-web/src/mocks/{{entidad}}.ts / frontend-web/src/types/{{entidad}}.ts | Datos simulados y contrato de tipos cuando la feature introduce o modifica una entidad. |
| Actualizar | {{ruta de la especificación y de este plan}} | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

## Preparación

- [ ] Leer `frontend-web/CLAUDE.md`, la especificación, los archivos afectados y el estado de Git.
- [ ] Si la feature consume un endpoint real, revisar su contrato en `backend/docs/spec/endpoint/` y el código del controlador solo en modo lectura; si no existe o no está estable, trabajar contra el mock sin eliminar lo ya simulado.
- [ ] Comprobar las versiones instaladas en `package.json`.
- [ ] Registrar el estado inicial de las comprobaciones (`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`) y distinguir problemas previos. Para cambios documentales, revisar documentos y rutas sin ejecutar la aplicación.

## Tarea {{N}}: {{entregable concreto}}

Repetir esta sección por cada entregable necesario, sin duplicar la misma responsabilidad entre tareas.

**Archivos:** {{rutas exactas que se crean o modifican}}.

**Interfaces:** {{tipos, firmas, dependencias consumidas y resultado producido}}.

**Criterios cubiertos:** {{números de la especificación}}.

- [ ] Definir el caso unitario relevante: {{nombre, entradas, resultado y errores que debe detectar}}. No añadir pruebas que solo repliquen la implementación ni pruebas para texto.
- [ ] Si se introduce o corrige comportamiento, ejecutar la prueba pertinente antes del cambio y registrar el resultado: {{comando concreto y resultado observado}}.
- [ ] Implementar el cambio mínimo: {{decisión que la firma y la especificación no determinen}}.
- [ ] Ejecutar la comprobación unitaria y registrar evidencia: {{comando concreto y resultado observado}}.
- [ ] Revisar el diff y actualizar la especificación y este plan.

## Comprobaciones finales

Ejecutar desde frontend-web/ para cambios de código o dependencias; marcar no aplicable con motivo para cambios puramente documentales.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Tests | npm run test | Pendiente |
| Typecheck | npx tsc --noEmit | Pendiente |
| Lint | npm run lint | Pendiente |
| Build | npm run build | Pendiente |
| Diff, desde la raíz | git diff --check | Pendiente |

- [ ] Revisar que cada criterio de aceptación tiene evidencia y que los tipos y firmas coinciden entre tareas.
- [ ] Mantener la especificación alineada con los requisitos y registrar decisiones, desviaciones, limitaciones y resultados en este mismo plan. No crear archivos de tareas, informes ni documentos de cierre adicionales.
- [ ] Confirmar que no se tocaron archivos ajenos, credenciales, consumidores o servicios fuera del alcance.

## Confirmación de implementación

Completar esta sección en este mismo archivo al finalizar; no crear un informe aparte.

- Estado final: {{Pendiente / Implementación parcial / Implementado con verificación pendiente / Implementado y verificado}}.
- Fecha de revisión: {{AAAA-MM-DD}}.
- Resultado entregado: {{comportamiento o documentos realmente implementados}}.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| {{número y criterio de la especificación}} | {{archivo, caso unitario o comprobación ejecutada}} | {{Cumplido / Pendiente / Bloqueado}} |

- Comprobaciones: {{comandos ejecutados y resultados reales; no aplicable con motivo cuando corresponda}}.
- Decisiones y desviaciones: {{cambios respecto al plan y su motivo}}.
- Limitaciones y pendientes: {{detalle o ninguno}}.

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente. No prometer persistencia real por usar el mock.
