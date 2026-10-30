# Desarrollo

## Requisitos y gestores de paquetes

Cada aplicación tiene su propio manifiesto y lockfile. No hay instalación ni suite común en la raíz.

| Componente | Gestor | Lockfile | Instalación |
| --- | --- | --- | --- |
| Backend | npm | `package-lock.json` | `npm ci` |
| Web | npm | `package-lock.json` | `npm ci` |
| Móvil | pnpm | `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` |

Se necesita Git, Node.js y el gestor de cada componente. El backend declara Node.js ≥22 y npm ≥10. Las restricciones de Node de las dependencias se encuentran en los lockfiles; conserva el gestor y el lockfile de cada aplicación al instalar.

Docker con el complemento Compose es necesario para ejecutar la infraestructura en contenedores. Los requisitos de dispositivos, emuladores y Expo están en el [README móvil](../frontend-mobile/README.md).

## Obtención del código

```bash
git clone https://github.com/PulsadorUrbano/urban-pulse.git
cd urban-pulse
git switch dev
```

Para contribuir, crea la rama adecuada según [CONTRIBUTING.md](../CONTRIBUTING.md). En una copia existente, revisa primero el estado local y conserva los cambios pendientes antes de actualizarla.

## Elegir el flujo

| Trabajo | Entorno | Procedimiento principal |
| --- | --- | --- |
| API y autenticación | Backend y PostgreSQL accesible. | [Backend](../backend/README.md). |
| Interfaz web | Vite y navegador; API para las solicitudes de autenticación. | [Web](../frontend-web/README.md). |
| Aplicación ciudadana | Expo, navegador o dispositivo, y backend o mock para los flujos de datos. | [Móvil](../frontend-mobile/README.md). |
| Infraestructura en contenedores | Docker Compose con PostgreSQL/PostGIS y backend. | [Despliegue](deployment.md). |

Cada README contiene los comandos de instalación, arranque y calidad de su componente. Prepara PostgreSQL y las tablas usadas por autenticación antes del backend; después abre los consumidores. Para el flujo simulado móvil, inicia su servidor mock antes de utilizarlo. Compose espera a que la base de datos esté saludable para iniciar la API.

## Configuración local

| Archivo o entorno | Alcance | Referencia |
| --- | --- | --- |
| `backend/.env` | Variables del backend local, a partir de su ejemplo. | [Configuración del backend](../backend/README.md). |
| `.env` de la raíz | Credenciales de base de datos y entorno del backend en Compose. | [Despliegue](deployment.md). |
| Entorno de Vite | URL base de autenticación web mediante `VITE_BACKEND_URL`. | [Web](../frontend-web/README.md). |
| Entorno de Expo | URL del backend y del mock móvil. | [Móvil](../frontend-mobile/README.md). |

Conserva cualquier archivo local existente y no versiones credenciales. Los valores de los ejemplos son de desarrollo. La lista completa de variables y sus valores predeterminados se mantiene en el documento del componente correspondiente.

## Local frente a contenedores

En local, cada aplicación utiliza las herramientas y el entorno de su proceso. Compose construye y ejecuta backend y base de datos dentro de su red, con los puertos y volúmenes definidos en [despliegue](deployment.md).

Para combinar una aplicación local con un servicio en contenedor, utiliza una dirección accesible desde el consumidor. Los nombres internos de Compose no son direcciones del anfitrión; en un teléfono, `localhost` se refiere al propio dispositivo.

## Comprobaciones

- Comprueba `node --version` y la versión de npm o pnpm antes de instalar.
- Utiliza el lockfile del componente y la instalación de la tabla inicial.
- Para comprobar la API, consulta Swagger y `/health` según el [README del backend](../backend/README.md).
- Para probar en un teléfono, sigue la preparación de red y dispositivo del [README móvil](../frontend-mobile/README.md).
- Ejecuta las comprobaciones de calidad del componente según [contribución](../CONTRIBUTING.md).

Los procedimientos se han contrastado por lectura de manifiestos, scripts y configuración. No se han ejecutado instalaciones, servicios ni suites de aplicación durante esta revisión documental.
