# Colores finales del footer y retiro del panel temporal de colores (2026-10-15)

## Decisión de diseño

Tras probar opciones con la herramienta temporal de previsualización, se
fijaron los colores definitivos del footer de la pantalla de nueva incidencia:

| Elemento | Fondo | Texto / icono |
|---|---|---|
| Botón **Enviar** | Blanco `#ffffff` | Texto negro `#000000` |
| Botón de **localización** (FAB) | Negro `#000000` | Icono `location_on` blanco `#ffffff` |

Valores fijos (no dependen del tema light/dark). En `location-toggle.tsx` el
fondo va en estilo inline (igual que Enviar) para poder verificarlo en tests,
ya que en Jest los `className` de NativeWind no resuelven (el CSS se mockea).

## Retiro de la herramienta temporal

Se eliminó por completo la herramienta dev de previsualización de colores
(pastilla "Cambiar colores"):

- Borrados: `src/hooks/use-dev-colors.ts`, `src/components/dev-color-panel.tsx`
  y sus tests (`use-dev-colors.test.ts`, `dev-color-panel.test.tsx`).
- `src/app/incidents/new.tsx`: purgados los 9 puntos marcados
  `TEMPORAL (dev-colors)` (imports, hook, overrides de bordes/fondo/texto,
  render del panel) y aplicados los colores finales de Enviar.
- `src/components/location-toggle.tsx`: retiradas las props temporales
  `backgroundColor?`/`iconColor?`; fondo e icono con los valores finales.
- `src/__tests__/app/incidents/new-incident-screen.test.tsx`: fuera las
  aserciones del panel; dentro un test que **bloquea los colores finales**
  (fondo `#ffffff` y texto `#000000` de Enviar, fondo `#000000` del toggle).
- Docs: borrada `docs/2026-10-14-dev-panel-colores.md` y su ítem del Backlog
  del roadmap.

Verificación de la purga: `grep -rn "TEMPORAL" src/` y
`grep -rn "dev-colors\|DevColorPanel\|DevColor" src/` sin coincidencias.

## Verificación

- `npx expo lint`  · `npx tsc --noEmit`
- `npx jest --ci`  — 15 suites / 116 tests en verde.
