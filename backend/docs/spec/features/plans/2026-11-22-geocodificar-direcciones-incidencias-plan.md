# 2026-11-22 — Plan de implementación: geocodificar direcciones de incidencias

- Objetivo: asociar automáticamente una dirección fiable a las coordenadas de una incidencia sin cambiar los consumidores.
- Arquitectura: servicio Nest de geocodificación inversa con Nominatim, integrado antes de la transacción actual.
- Herramientas: Node.js 22, NestJS 12, Prisma 7.10.1, Vitest y `fetch` nativo.
- Especificación: [Contrato y criterios](../specs/2026-11-22-geocodificar-direcciones-incidencias-spec.md).
- Rama: `dev`.
- Estado: implementado y verificado; no desplegado.

## Restricciones generales

- No modificar `frontend-mobile/` ni `frontend-web/`.
- Mantener la petición y la estructura pública de respuesta de `POST /incidents`.
- No añadir entidad ni migración: conservar `Address`, su clave compuesta y la FK opcional desde `IncidentLocation`.
- No ejecutar peticiones reales a Nominatim, migraciones ni servicios externos durante las pruebas.
- La consulta externa no debe ejecutarse dentro de una transacción SQL ni impedir la creación si falla.
- La petición al geocodificador transmite coordenadas precisas a un tercero; no enviar texto de la incidencia ni datos de identidad.
- El servicio público Nominatim no debe recibir más de una consulta por segundo desde una instancia.

## Focos de revisión

| Riesgo | Tarea y caso unitario |
| --- | --- |
| Número, código postal o distrito ausente | La normalización devuelve `null` sin inventar valores. |
| Caída del geocodificador | La incidencia se guarda con `location.address: null`. |
| Dirección manual sobrescrita | El servicio de incidencias no consulta al geocodificador cuando recibe `address`. |
| Repetición de coordenadas | El servicio reutiliza la respuesta cacheada sin repetir `fetch`. |
| Cambios accidentales en consumidores | Revisar el listado de archivos modificados y confirmar cero cambios frontend. |

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | `backend/src/incidents/services/geocodificacion-inversa.service.ts` | Consulta, mapeo, limitación y caché. |
| Modificar | `backend/src/incidents/incidents.service.ts`, `backend/src/incidents/incidents.module.ts`, `backend/src/incidents/incidents.controller.ts` | Integrar resolución, registrar el servicio y describir el comportamiento en Swagger. |
| Crear/modificar | `backend/test/incidents/services/geocodificacion-inversa.service.spec.ts`, `backend/test/incidents/services/geocodificador-inverso.fake.ts`, pruebas de servicios de incidencias | Aislar el proveedor y comprobar el comportamiento. |
| Modificar | `.env.example`, `backend/.env.example`, `backend/README.md` | Documentar opciones y límites del proveedor en entorno local y Compose. |
| Modificar | `database/diagram.dbml`, `backend/prisma/schema.prisma` | Mantener sincronizado el significado de `Address.street`, sin alterar columnas. |
| Modificar | `backend/docs/spec/endpoint/post-incidents/README.md` | Actualizar el comportamiento observable del endpoint. |
| Crear/actualizar | Esta especificación y este plan | Registrar requisitos, tareas y resultados reales. |

## Tarea 1: servicio de geocodificación

**Archivos:** servicio Nest y pruebas unitarias propias.

**Interfaces:** `resolver(latitude, longitude): Promise<IncidentAddress | null>`.

- [x] Normalizar vía, número, código postal y distrito sin inventar componentes.
- [x] Añadir cabeceras identificativas, timeout, caché y límite de frecuencia.
- [x] Probar mapeo, rechazo de resultados incompletos, cabeceras, caché, deduplicación y fallo de red mediante dobles.

## Tarea 2: integración backend y documentación

**Archivos:** servicio y módulo de incidencias, endpoint, modelo DBML y documentación del backend.

- [x] Priorizar una dirección manual y consultar solo cuando se omite.
- [x] Ejecutar la consulta antes de la transacción y persistir el resultado usando el `upsert` existente.
- [x] Registrar el geocodificador como proveedor Nest e inyectar un doble en pruebas.
- [x] Documentar configuración, compatibilidad, política de fallos y semántica de `street`.

## Comprobaciones finales

| Comprobación | Comando | Resultado real |
| --- | --- | --- |
| Unitarias | `pnpm.cmd test` desde `backend/` | Correcto: 29 archivos y 360 pruebas |
| Compilación | `pnpm.cmd run build` desde `backend/` | Correcta; generó Prisma Client 7.10.1 y compiló Nest |
| Lint | `pnpm.cmd run lint` desde `backend/` | Código 0; conserva dos advertencias previas en pruebas de seed y autenticación |
| Formato | `pnpm.cmd exec prettier --check` sobre los TypeScript modificados | Correcto |
| Diff | `git diff --check` desde la raíz | Correcto; Git mostró avisos de normalización LF/CRLF de Windows |

- [x] Revisar que el contrato y los modelos documentados coinciden con el código.
- [x] Confirmar que ningún archivo de `frontend-mobile/` o `frontend-web/` se modificó.

## Confirmación de implementación

- Estado final: Implementado y verificado mediante las comprobaciones aplicables.
- Fecha de revisión: 2026-11-22.
- Resultado entregado: geocodificación inversa best-effort en la creación, persistencia por el modelo existente, pruebas y documentación actualizadas.

| Criterio de aceptación | Evidencia concreta | Resultado |
| --- | --- | --- |
| 1 | `test/incidents/services/incidents.service.spec.ts`: dirección automática persistida | Cumplido |
| 2 | `test/incidents/services/incidents.service.spec.ts`: dirección manual evita consulta | Cumplido |
| 3 | Pruebas de normalización y fallo externo; alta permanece exitosa | Cumplido |
| 4 | Solo comentario semántico en `schema.prisma`; sin migraciones estructurales ni cambios frontend | Cumplido |
| 5 | 360 unitarias, build, lint y formato ejecutados | Cumplido |

- Comprobaciones: `pnpm.cmd test` (360/360); `pnpm.cmd run build` (correcto); `pnpm.cmd run lint` (código 0, dos advertencias previas ajenas); Prettier (correcto); `git diff --check` (correcto).
- Decisiones y desviaciones: no se añadieron columnas ni migraciones; `Address.street` representa la línea completa con vía y número. Se restauraron dependencias desde el lockfile congelado para ejecutar las verificaciones, sin cambios en manifiestos ni lockfile.
- Limitaciones y pendientes: no se hizo una consulta real a Nominatim. La frecuencia y caché son por proceso; varias réplicas requieren limitación compartida o usar otra instancia/proveedor. Los fallos o resultados sin número, código postal o distrito reconocido dejan `address` en `null`.
