# 🏙️ Urban Pulse

Plataforma cloud para la gestión inteligente de incidencias urbanas en la ciudad de Málaga. 
Este repositorio contiene el código fuente, documentación y configuración para el despliegue del sistema.

## 📖 Visión del Producto
La idea es que UrbanPulse transforme un reporte aislado en una unidad de trabajo enriquecida con datos contextuales, trazable y susceptible de análisis. La plataforma apoya al ciudadano, al operador municipal y al responsable de planificación sin sustituir la decisión humana en actuaciones sensibles. 

* **Ciudadanía:** Permitirá comunicar una incidencia, aportar localización y evidencias y seguir su evolución. 
* **Personal municipal:** Ofrecerá validación, asignación, priorización y contexto. 
* **Responsables y analistas:** Aportará indicadores, modelos predictivos y consultas basadas en datos y en documentos.

## 🧠 Conceptos Core del Dominio
* **Incident:** Reporte central con descripción, categoría, localización, prioridad, estado y marcas temporales.
* **User:** Ciudadano o profesional que crea, consulta o modifica según sus permisos.
* **UrbanAsset:** Elemento físico identificable como semáforo, contenedor, fuente, parada, aparcamiento o zona verde.
* **UrbanContext:** Información contextual de clima, tráfico, movilidad, eventos, ambiente, demografía y entorno espacial.
* **Attachment:** Fotografía o documento almacenado fuera de la base relacional y referenciado por metadatos.

## 💻 Requirements
* Node.js 22 or newer
* npm 10 or newer

## 🚀 Getting Started

```bash
npm install
cp .env.example .env
npm run start:dev
```

## 📡 Endpoints Básicos

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/` | Starter response |
| GET | `/health` | Liveness check returning `{ "status": "ok" }` |

## ⚙️ Configuración y Seguridad
Las credenciales y valores dependientes del entorno no deben incluirse directamente en el código fuente.
El proyecto proporciona un fichero `.env.example` con los nombres de las variables necesarias.
El fichero local `.env` no debe versionarse y debe estar incluido en `.gitignore`.

## 🛠️ Ejecución y Pruebas
Con los servicios auxiliares en funcionamiento mediante Docker Compose, puedes ejecutar la aplicación Spring Boot:
```bash
mvn spring-boot:run
```
## Convención de Commits

Los mensajes de commit deben seguir la convención Conventional Commits para etiquetar claramente el objetivo de cada uno, facilitar la comprensión del historial y permitir la generación automática de changelogs. 

### Tipos permitidos
*   `feat`: nueva funcionalidad.
*   `fix`: corrección de error o bug.
*   `docs`: cambios en documentación.
*   `style`: formato, espacios, linting.
*   `refactor`: cambio interno o reorganización del código sin alterar su comportamiento.
*   `test`: añadir o modificar pruebas.
*   `chore`: tareas auxiliares o internas de mantenimiento.
*   `ci`: cambios en integración continua.
*   `build`: cambios de build.

### Estrategia de mensajes
Los commits deben ser pequeños y claros. Se debe evitar el uso de descripciones genéricas (como "cambios", "arreglos" o "cosas")[cite: 6].

**Ejemplos de buena estrategia:**
```bash
git commit -m "feat: add user registration endpoint"
git commit -m "fix: validate empty task title"
git commit -m "docs: update installation guide"
git commit -m "test: add unit tests for task service"
git commit -m "ci: add GitHub Actions workflow"
```