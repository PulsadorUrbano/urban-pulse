# Plan de implementación: {{nombre de la funcionalidad}}

> Crear únicamente este plan y su especificación. Copiar a backend/docs/spec/plans/{{fecha}}-{{funcionalidad}}-plan.md. Sustituir los marcadores antes de implementar. Los pasos empiezan pendientes; marcar únicamente trabajo realizado.

- Objetivo: {{resultado observable definido por la especificación}}.
- Arquitectura: {{diseño mínimo y componentes existentes reutilizados}}.
- Herramientas: {{versiones y dependencias ya disponibles}}.
- Especificación: [Contrato y criterios](../specs/{{fecha}}-{{funcionalidad}}.md).
- Rama: {{rama de trabajo}}.
- Estado: pendiente de implementación y verificación.

## Restricciones generales

- Respetar el alcance y los valores exactos de la especificación; no añadir requisitos implícitos.
- Programar y documentar en español; conservar contratos públicos y nombres exigidos por las dependencias.
- Usar o actualizar modelos Prisma y sus tipos generados cuando se implementen entidades de dominio. Generar tipos no autoriza a conectar la base de datos ni ejecutar migraciones.
- Mantener TypeScript estricto, imports ESM .js y herramientas existentes. No ejecutar npm install ni npm i, con o sin argumentos; tampoco pnpm install.
- Crear solo unitarias en backend/test/<funcionalidad>/<rol>/. No crear ni ejecutar e2e/integración salvo solicitud explícita.
- Preservar cambios ajenos y la rama acordada. No crear commits, push ni conexiones frontend fuera del alcance solicitado.
- Restricciones particulares: {{límites, valores iniciales y reglas exactas de esta funcionalidad}}.

## Focos de revisión

{{Relacionar cada riesgo relevante de la especificación con la tarea y el caso unitario que lo comprueba: tipos incorrectos, límites, null/omisión, recursos ausentes, aislamiento, fallos parciales o permisos realmente implementados. No inventar operaciones fuera del alcance.}}

## Mapa de archivos

Rutas relativas a la raíz del repositorio.

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| {{crear/modificar}} | {{ruta exacta de código, modelo o prueba unitaria}} | {{responsabilidad}} |
| Crear/actualizar | backend/docs/spec/endpoint/{{metodo}}-{{ruta-normalizada}}/README.md | Contrato y referencias del endpoint. |
| Actualizar | {{ruta de la especificación y de este plan}} | Requisitos en la especificación; decisiones, estado y resultados reales en este plan. |

## Preparación

- [ ] Leer AGENTS.md, la especificación, los archivos afectados y el estado de Git.
- [ ] Consultar los endpoints existentes listando backend/docs/spec/endpoint/ y leyendo su documentación antes de definir o reutilizar contratos.
- [ ] Comprobar las versiones instaladas; consultar Context7 si se cambia una API o configuración de biblioteca.
- [ ] Registrar el estado inicial de las comprobaciones pertinentes y distinguir problemas previos. Para cambios documentales, revisar documentos y rutas sin ejecutar la aplicación.

## Tarea {{N}}: {{entregable concreto}}

Repetir esta sección por cada entregable necesario, sin duplicar la misma responsabilidad entre tareas.

**Archivos:** {{rutas exactas que se crean o modifican}}.

**Interfaces:** {{tipos, firmas, dependencias consumidas y resultado producido}}.

**Criterios cubiertos:** {{números de la especificación}}.

- [ ] Definir el caso unitario relevante: {{nombre, entradas, resultado y errores que debe detectar}}. No añadir pruebas que solo repliquen la implementación ni pruebas para texto.
- [ ] Si se introduce o corrige comportamiento, ejecutar la prueba pertinente antes del cambio y registrar el resultado: {{comando concreto y resultado observado}}.
- [ ] Implementar el cambio mínimo: {{decisión que la firma y la especificación no determinen; modelos Prisma si corresponde}}.
- [ ] Ejecutar la comprobación unitaria y registrar evidencia: {{comando concreto y resultado observado}}.
- [ ] Revisar el diff y actualizar la documentación del endpoint, la especificación y el seguimiento de tareas.

## Comprobaciones finales

Ejecutar desde backend/ para cambios de código o dependencias; marcar no aplicable con motivo para cambios puramente documentales.

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | npm test | Pendiente |
| Compilación | npm run build | Pendiente |
| Lint | npm run lint | Pendiente |
| Diff, desde la raíz | git diff --check | Pendiente |

- [ ] Mantener el catálogo backend/docs/spec/endpoint/ coherente con los contratos implementados, sin documentar una propuesta como activa.
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

Confirmar Implementado y verificado solo cuando los criterios estén cumplidos y las comprobaciones aplicables lo respalden. Una comprobación necesaria bloqueada implica verificación pendiente. No copiar resultados históricos ni prometer persistencia por usar tipos Prisma.
