## Navegación y rutas

- Usa **Expo Router** para toda la navegación. Las rutas viven en `src/app/` — cada archivo ahí es una pantalla, y los archivos `_layout.tsx` definen navegadores. Mantén el código que no sea de ruta (componentes, hooks, utils) fuera de `src/app/`.
- Importa `Link`, `router` y `useLocalSearchParams` desde `expo-router`.
- Docs: `https://docs.expo.dev/router/introduction.md`

### Stack raíz + grupo `(tabs)` (estructura obligatoria)

Las pestañas nativas (`expo-router/unstable-native-tabs`) **no pueden empujar pantallas** — no tienen stack ni cabecera propia. Por eso la raíz **debe** ser un `Stack` y las pestañas deben vivir dentro de un grupo de rutas `(tabs)`:

```text
src/app/
  _layout.tsx          → <Stack>            (raíz: empuja pantallas sobre las tabs)
  (tabs)/
    _layout.tsx        → <AppTabs />        (NativeTabs: secciones fijas)
    index.tsx           (tab Home)
    my-incidents.tsx    (tab Mis incidencias)
  incidents/
    new.tsx            → ruta /incidents/new (se empuja desde las tabs)
```

Reglas:

- **Las secciones de primer nivel** (siempre accesibles) van como tabs en `(tabs)/_layout.tsx` mediante `NativeTabs.Trigger`.
- **Las pantallas de detalle, formularios y flujos** van fuera de `(tabs)/` como carpetas/rutas propias (p. ej. `incidents/new.tsx`) y se abren con `router.push('/incidents/new')` o `<Link href="/incidents/new">`. Se apilan encima de la tab bar con botón de atrás.
- Registra las pantallas empujadas en el `Stack` raíz con `Stack.Screen name="..."` cuando necesites opciones (título, `presentation: 'modal'`, etc.).
- El grupo `(tabs)` no aparece en la URL; sí aparece el nombre de la carpeta de la ruta empujada (`/incidents/new`).
- No anides otro navegador de tabs dentro de las pestañas nativas.
