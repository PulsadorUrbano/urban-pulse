# 🏙️ Urban Pulse

Plataforma cloud para la gestión inteligente de incidencias urbanas en la ciudad de Málaga. 
Este repositorio contiene el código fuente, la documentación técnica y la configuración para el despliegue del sistema.

## 📖 Visión del Producto
La idea es que UrbanPulse transforme un reporte aislado en una unidad de trabajo enriquecida con datos contextuales, trazable y susceptible de análisis. La plataforma apoya al ciudadano, al operador municipal y al responsable de planificación sin sustituir la decisión humana en actuaciones sensibles. 

- **Ciudadanía:** Permitirá comunicar una incidencia, aportar localización y evidencias y seguir su evolución. 
- **Personal municipal:** Ofrecerá validación, asignación, priorización y contexto. 
- **Responsables y analistas:** Aportará indicadores, modelos predictivos y consultas basadas en datos y en documentos.

## 🧠 Conceptos Core del Dominio
- **Incident:** Reporte central con descripción, categoría, localización, prioridad, estado y marcas temporales.
- **User:** Ciudadano o profesional que crea, consulta o modifica según sus permisos.
- **UrbanAsset:** Elemento físico identificable como semáforo, contenedor, fuente, parada, aparcamiento o zona verde.
- **UrbanContext:** Información contextual de clima, tráfico, movilidad, eventos, ambiente, demografía y entorno espacial.

---

## 💻 Stack Tecnológico
El sistema está construido utilizando las siguientes tecnologías:
- **Base de Datos:** PostgreSQL
- **Backend:** NestJS con TypeScript
- **Frontend:** React Native con TypeScript (Soporte para plataformas Web y Mobile)

---

## 🚀 Instalación y Ejecución

**1. Clonar el repositorio y acceder a la carpeta:**
```bash
git clone [https://github.com/PulsadorUrbano/urban-pulse.git]
cd urban-pulse
```

(FALTA POR COMPLETAR)

---

## 👥 Guía de Contribución y Flujo de Trabajo
Para asegurar la calidad del código, el equipo sigue una estrategia inspirada en GitHub Flow con un entorno de integración.

### 1. Gestión de Ramas
- **`main`:** Representa siempre una versión estable del proyecto. No se debe trabajar directamente sobre main.
- **`dev`:**  Rama principal de integración y desarrollo activo.
- **Ramas de Funcionalidad (`feature/nombre-issue`):** Rama integradora creada a partir de `dev` para coordinar una funcionalidad completa.
- **Ramas de Sub-equipo:** A partir de la rama de la funcionalidad, cada equipo creará su propia sub-rama:
  - `feature/nombre-issue/backend`
  - `feature/nombre-issue/frontendWeb`
  - `feature/nombre-issue/frontendMobile`
- **Ramas de Trabajo:** Para cada nueva funcionalidad o corrección, crea una rama a partir de dev usando el prefijo adecuado:
```bash
- git switch -c feature/nombre-funcionalidad
- git checkout -b feature/nombre-funcionalidad
```
**Tipos de Ramas Permitidas:**
- **`feature/...`**: Cuando se va a desarrollar una nueva funcionalidad para el sistema. *(Ejemplo: `feature/login` o `feature/filtros-mapa`)*.
- **`fix/...`**: Cuando se va a realizar la corrección de un bug o error. *(Ejemplo: `fix/validacion-fechas`)*.
- **`docs/...`**: Para añadir o modificar cambios de documentación técnica, manuales o el README. *(Ejemplo: `docs/api-documentation`)*.
- **`refactor/...`**: Cuando se va a realizar una refactorización (reorganizar o limpiar el código interno sin alterar su comportamiento final). *(Ejemplo: `refactor/project-structure`)*.
- **`test/...`**: Cuando tu trabajo consista únicamente en crear o modificar pruebas (unitarias, e2e, etc.). *(Ejemplo: `test/task-service`)*.
- **`hotfix/...`**: Se usa de forma excepcional para una corrección urgente y crítica en el sistema.


### 2. Flujo de Trabajo y Pull Requests (PRs)
El ciclo de vida de una nueva funcionalidad sigue estos pasos estrictos:

1. **Desarrollo:** Los desarrolladores trabajan en sus sub-ramas específicas (`.../backend`, `.../frontendWeb`, etc.).
2. **Unificación local:** Cuando las partes están terminadas, las ramas de sub-equipo se fusionan ("merge") dentro de la rama padre de la funcionalidad (`feat/nombre-issue`).
3. **Pull Request a Dev:** Una vez que la rama `feat/nombre-issue` está completa y estable, se abre un Pull Request hacia la rama `dev`.
4. **Revisión y Aprobación:** El *Reviewer* asignado revisará el código de la PR y, si es correcto, la aprobará.
5. **Testing:** Una vez aprobada e integrada en `dev`, el *Tester* verificará el funcionamiento en el entorno de pruebas.
6. **Pase a Producción (Main):** Al finalizar cada sprint, o cuando se tenga una versión completamente estable y probada en `dev`, se creará una PR final para fusionar `dev` con `main`.

### 3. Convención de Commits
Los Commits se harán de la forma más atómica posible para facilitar la revisión del mismo. Los mensajes de commit deben ser pequeños y claros, evitando descripciones genéricas como "cambios" o "arreglos".
El formato es: `<tipo>: <descripción en minúsculas>`

**Tipos permitidos:**
- `feat`: nueva funcionalidad.
- `fix`: corrección de error o bug.
- `docs`: cambios en documentación.
- `style`: formato, espacios, linting.
- `refactor`: reestructuración. Cambio interno sin alterar comportamiento.
- `test`: añadir o modificar tests.
- `chore`: tareas auxiliares o internas de mantenimiento.
- `ci`: cambios en integración continua.
- `build`: cambios de build.

**Ejemplo de buena estrategia:**
```bash
git commit -m "feat: añadir endpoint de registro"
```

---

## 📚 Documentación Adicional
- **ADRs (Architecture Decision Records):** Las decisiones importantes sobre el diseño del sistema se documentan en la carpeta `/docs/adr/`.
- **Changelog:** Los cambios entre versiones se gestionarán automáticamente basándose en el historial de commits.