# Roadmap

Orden y estado de las features de UrbanPulse (`frontend-mobile`). Cada entrada apunta a su carpeta en `spec/features/`

---

## Hecho ✅

1. **000 · Configuración base y entorno de agentes** — Estructura inicial del proyecto Expo con NativeWind, contratos tipados y flujo de orquestación autónoma en `AGENTS.md`
2. **001 · Registro de incidencia** — Formulario (título obligatorio, descripción opcional y **categoría opcional**) que registra una incidencia con estado `reported`, fecha automática y relaciones en `null`, persistida en el mock (`db.json`). La categoría se elige desde un control en la **esquina inferior del campo Descripción** ("Añadir categoría +") que abre una hoja inferior con la colección `categories` (`Transporte`, `Alumbrado público`, `Objetos urbanos`) o permite escribir texto libre vía **"Otros"**; una vez seleccionada muestra el nombre + "×" y es deseleccionable. Nunca bloquea el registro. **Ampliación implementada y verificada (ubicación):** toggle flotante activado por defecto (círculo grisáceo + `location_on` con línea diagonal en off) que, al enviar, captura la posición (`Accuracy.Balanced`), crea la `Location` en la colección `locations` y persiste `locationId`; pide permiso en primer plano (con "Abrir Ajustes"/"Enviar sin ubicación"/"Cancelar") y degrada a `locationId: null` si el GPS está apagado o falla la captura. La foto queda diferida. Ver `features/001-registro-incidencia/`.
3. **Infra · NativeWind configurado** — `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css` con directivas `@tailwind` y `nativewind-env.d.ts`. El estilado con `className` ya está operativo.
---

## Siguiente 🔜

_Sin feature en curso. Pendiente de planificar la siguiente._

---

## Backlog / ideas 💡

- **Detalle y seguimiento del reporte** — Pantalla para consultar la evolución y estado de una incidencia (pendiente, en revisión, resuelta...)
- **Gestión de sesión** — Login, Sigin y Logout en el dispositivo
- **Captura de foto** — Adjuntar evidencia fotográfica (`file://`) al registrar una incidencia (la ubicación se incorpora en 001).
- **Migrar componentes a NativeWind** — Los componentes existentes siguen usando `StyleSheet`; migrarlos a `className` ahora que NativeWind está configurado.
- **Categorías de solo lectura** — La gestión (alta/edición/borrado) de categorías queda fuera del alcance ciudadano; hoy se consumen del mock.

---

> Cada feature nueva se crea como `features/NNN-nombre-feature/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
