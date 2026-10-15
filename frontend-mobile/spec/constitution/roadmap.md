# Roadmap

Orden y estado de las features de UrbanPulse (`frontend-mobile`). Cada entrada apunta a su carpeta en `spec/features/`

---

## Hecho ✅

1. **000 · Configuración base y entorno de agentes** — Estructura inicial del proyecto Expo con NativeWind, contratos tipados y flujo de orquestación autónoma en `AGENTS.md`
2. **001 · Registro de incidencia** — Formulario (título obligatorio, descripción opcional y **categoría opcional**) que registra una incidencia con estado `reported`, fecha automática y relaciones en `null`, persistida en el mock (`db.json`). La categoría se elige desde un control en la **esquina inferior del campo Descripción** ("Añadir categoría +") que abre una hoja inferior con la colección `categories` (`Transporte`, `Alumbrado público`, `Objetos urbanos`) o permite escribir texto libre vía **"Otros"**; una vez seleccionada muestra el nombre + "×" y es deseleccionable. Nunca bloquea el registro. **Ampliación implementada y verificada (ubicación):** toggle flotante activado por defecto (círculo negro con icono blanco + `location_on` con línea diagonal en off) que, al enviar, captura la posición (`Accuracy.Balanced`), crea la `Location` en la colección `locations` y persiste `locationId`; pide permiso en primer plano (con "Abrir Ajustes"/"Enviar sin ubicación"/"Cancelar") y degrada a `locationId: null` si el GPS está apagado o falla la captura. **Ampliación implementada y verificada (fotos):** sección bajo la Descripción; el título "Imágenes subidas (n):" (contador dinámico) **solo se muestra con n≥1**; **en vacío (0 imágenes)**, sin cabecera ni botón: un "+" grande centrado (`MaterialIcons add`, 48) con "¿Desea añadir imágenes?" debajo (todo táctil, abre la hoja Cámara/Galería); **con ≥1 foto**, fila horizontal de miniaturas con "×" que termina en un tile de añadir "+" (sin borde); ambos abren una hoja inferior Cámara/Galería (`expo-image-picker`); **límite de 8** (`MAX_SELECTED_PHOTOS`, guard en el hook): con 8 fotos desaparece el "+" y se muestra en rojo "El número máximo de imágenes son 8" bajo los previews; footer con Enviar (fondo blanco `#ffffff`, texto negro `#000000`) y el FAB de ubicación (fondo negro `#000000`, icono blanco `#ffffff`) fijos en capa superior; al enviar se persiste una `IncidentImage { id, url, incidentId }` (no anulables) por foto en la colección `images` (URI local `file://...`, sin nube), con envío degradado y aviso no bloqueante si fallan las imágenes. Ver `features/001-registro-incidencia/`.
3. **Infra · NativeWind configurado** — `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css` con directivas `@tailwind` y `nativewind-env.d.ts`. El estilado con `className` ya está operativo.
---

## Siguiente 🔜

_Sin feature en curso._

---

## Backlog / ideas 💡

- **Detalle y seguimiento del reporte** — Pantalla para consultar la evolución y estado de una incidencia (pendiente, en revisión, resuelta...)
- **Gestión de sesión** — Login, Sigin y Logout en el dispositivo
- **Gestión de imágenes de incidencias pasadas** — Ver, añadir o borrar fotos de reportes ya registrados (la captura al registrar ya está cubierta por la ampliación de fotos de la 001).
- **Migrar componentes a NativeWind** — Los componentes existentes siguen usando `StyleSheet`; migrarlos a `className` ahora que NativeWind está configurado. Seguimiento en [`spec/refactor/nativewind-migracion-pendiente.md`](../refactor/nativewind-migracion-pendiente.md). **Ya migrados (2026-10-14):** footer de `src/app/incidents/new.tsx`, `src/components/photo-picker.tsx` y `src/components/location-toggle.tsx`. **Pendientes:** `themed-text.tsx`, `category-picker.tsx`, `app-tabs.web.tsx` y `src/app/(tabs)/index.tsx`.
- **Categorías de solo lectura** — La gestión (alta/edición/borrado) de categorías queda fuera del alcance ciudadano; hoy se consumen del mock.

---

> Cada feature nueva se crea como `features/NNN-nombre-feature/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
