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
- **Frontend web:** React con Vite.
- **Frontend móvil:** React Native con Expo y TypeScript.

---

## 🚀 Instalación y Ejecución

**1. Clonar el repositorio y acceder a la carpeta:**
```bash
git clone https://github.com/PulsadorUrbano/urban-pulse.git
cd urban-pulse
```

### Frontend web — React y Vite

Desde la raíz del repositorio, en la terminal de VS Code:

```bash
cd frontend-web
npm ci
npm run dev
```

Abre la dirección que muestre Vite. Para comprobar el código y generar la versión de producción:

```bash
npm run lint
npm run build
```

### Frontend móvil — React Native y Expo

Desde la raíz del repositorio, instala las dependencias:

```bash
cd frontend-mobile
npm ci
```

#### Probar en el navegador del ordenador

```bash
npm run web
```

Abre la dirección que indique Expo en la terminal. También puedes ejecutar `npm run start` y pulsar `w` para abrir la versión web.

#### Probar en un dispositivo móvil con Expo Go

1. Crea una cuenta en [expo.dev](https://expo.dev/).
2. Inicia sesión desde la terminal:

   ```bash
   npx expo login
   ```

3. Instala **Expo Go** en el móvil e inicia sesión con la misma cuenta.
4. Desde `frontend-mobile/`, inicia el servidor:

   ```bash
   npm run start
   ```

5. Busca el proyecto `frontend` en la sección **Development servers** de Expo Go. Si no aparece, utiliza el código QR generado en la terminal.

En modo LAN, el ordenador y el móvil deben estar conectados a la misma red Wi-Fi. La versión de Expo Go debe ser compatible con el proyecto. Si se utilizan módulos nativos no disponibles en Expo Go, será necesaria una compilación de desarrollo (*development build*).

#### Otros comandos

| Comando | Uso |
| --- | --- |
| `npm run android` | Abrir la aplicación en Android, con un dispositivo o emulador configurado. |
| `npm run ios` | Abrir la aplicación en el simulador iOS; requiere macOS y Xcode. |
| `npx expo lint` | Comprobar el código con el linter de Expo. |

#### Estructura y funcionalidades

El código móvil vive en `frontend-mobile/src/`. Utiliza **Expo Router** para la navegación basada en archivos; las pantallas y los navegadores se encuentran en `src/app/`.

Las funcionalidades disponibles dependen de la rama. El registro de incidencias y el servidor simulado están en la rama de esa funcionalidad; consulta sus instrucciones específicas antes de probarlos.

#### Documentación de referencia

- [Documentación de Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Compilaciones de desarrollo](https://docs.expo.dev/develop/development-builds/introduction/)


### Backend — NestJS y TypeScript

Requisitos documentados: Node.js 22 o superior y npm 10 o superior. Configura la conexión a PostgreSQL antes de arrancar el backend.

Desde la raíz del repositorio, usando Git Bash:

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Completa `DATABASE_URL` y las variables necesarias en el archivo local `.env`.
La API usa el puerto 3000 por defecto; se puede modificar con `PORT`.
La documentación Swagger se publica en `/` y `GET /health` devuelve `{ "status": "ok" }`.

| Comando | Uso |
| --- | --- |
| `npm run start:dev` | Arrancar con recarga durante el desarrollo. |
| `npm run build` | Compilar el backend. |
| `npm run lint` | Comprobar el código. |
| `npm run test` | Ejecutar pruebas unitarias del backend. |
| `npm run test:e2e` | Ejecutar pruebas de extremo a extremo del backend. |
| `npm run start:prod` | Arrancar el resultado compilado. |

Las variables `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` se reservan para Nest Observe. Los archivos `.env` son locales y no deben subirse al repositorio.


### Base de datos — PostgreSQL y PostGIS

El modelo de referencia está en `database/diagram.dbml`; su representación SQL está en `docs/urbanPulse_diagram.sql`. El modelo documentado y el esquema
implementado deben contrastarse con la rama de backend correspondiente.

El servicio `database` de `docker-compose.yml` utiliza PostgreSQL con PostGIS.
Para iniciar solo la base de datos, desde la raíz del repositorio:

```bash
cp .env.example .env
# Completa DB_NAME, DB_USER y DB_PASSWORD en .env antes de continuar.
docker compose up -d database
```

El Compose también define el backend y lo expone en el puerto 4000. La base de datos no publica el puerto 5432 al ordenador anfitrión; un backend ejecutado
fuera de Docker necesita una conexión accesible configurada para ese entorno. El Compose no carga automáticamente el archivo SQL de documentación.

---

## 👥 Guía de Contribución y Flujo de Trabajo
Para asegurar la calidad del código, el equipo sigue una estrategia inspirada en GitHub Flow con un entorno de integración.

### 1. Gestión de Ramas
- **`main`:** Representa siempre una versión estable del proyecto. No se debe trabajar directamente sobre main.
- **`dev`:**  Rama principal de integración y desarrollo activo.
- **Ramas de Funcionalidad (`feature/nombre-issue`):** Rama integradora creada a partir de `dev` para coordinar una funcionalidad completa.
- **Ramas de Sub-equipo:** A partir de la rama de la funcionalidad, cada equipo creará su propia sub-rama:
  - `feature/nombre-issue-backend`
  - `feature/nombre-issue-frontend-web`
  - `feature/nombre-issue-frontend-mobile`
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

1. **Desarrollo:** Los desarrolladores trabajan en sus sub-ramas específicas (`...-backend`, `...-frontend-web`, etc.).
2. **Unificación local:** Cuando las partes están terminadas, las ramas de sub-equipo se fusionan ("merge") dentro de la rama padre de la funcionalidad (`feature/nombre-issue`).
3. **Pull Request a Dev:** Una vez que la rama `feature/nombre-issue` está completa y estable, se abre un Pull Request hacia la rama `dev`.
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
