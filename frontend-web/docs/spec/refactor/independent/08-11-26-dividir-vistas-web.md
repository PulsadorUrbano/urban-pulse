# 08-11-26 — Refactor: dividir las vistas grandes del panel web

- Desarrollador responsable: Alejandro.
- Asistente de IA: Claude Code.
- Modelo de IA: Claude Opus 5.5 (claude-opus-5-5).

- Feature afectada: independiente (login y validación de incidencias).
- Rama: feature/web-typescript-migration.
- Última actualización: 2026-11-08.
- Estado: Implementado y verificado.

## Motivo

Una auditoría rápida de modularidad detectó dos vistas de 776 y 590 líneas que mezclaban formulario, cabecera, modales y consola técnica, y el estado del tema oscuro duplicado en ambas.

## Alcance

- Alcance confirmado: extraer piezas de las dos vistas a `src/components/` y crear `use-theme.ts`, con props directas, sin contextos ni dependencias nuevas.
- Fuera de alcance: servicios, tipos, estilos y dividir las pestañas de la consola técnica.
- Comportamiento preservado: mismo marcado y mismos flujos. Único cambio visible: el tema oscuro se mantiene al cambiar de pantalla, porque ahora hay un solo estado.

## Archivos tocados

| Acción | Archivo | Responsabilidad |
| --- | --- | --- |
| Crear | src/hooks/use-theme.ts | Tema único de la app. |
| Crear | src/components/login-form.tsx, demo-accounts.tsx, technical-console.tsx | Piezas de la vista de login. |
| Crear | src/components/app-header.tsx, incident-gallery.tsx, resolution-form.tsx, logout-modal.tsx | Piezas de la vista de validación. |
| Crear | src/constants/incident-labels.ts | Etiquetas compartidas de estado y prioridad. |
| Modificar | src/components/login-view.tsx, incident-validation-view.tsx, src/App.tsx | Componen las piezas; 252 y 204 líneas. |
| Modificar | frontend-web/README.md | Estructura actualizada. |

## Verificación

- [x] Registrar el comportamiento antes del cambio: flujos probados en la feature 07-11-26.
- [x] Aplicar el refactor.
- [x] Confirmar el mismo comportamiento en el navegador contra el backend con Docker: login, galería y ampliación, tema, consola técnica, menú y cierre de sesión, validar con prioridad (`validated`/`high` en la API), descartar con motivo y errores del formulario.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.
- [x] Tests existentes correctos: 41/41; `npm run build` correcto, sin credenciales de prueba en el bundle.

## Confirmación

- Estado final: Implementado y verificado.
- Fecha de revisión: 2026-11-08.
- Resultado entregado: vistas divididas en piezas de una sola responsabilidad y tema centralizado.
- Decisiones y desviaciones: `technical-console.tsx` queda con 388 líneas; dividir sus pestañas añadiría archivos sin beneficio claro para una consola de demostración.
- Limitaciones y pendientes: ninguno.
