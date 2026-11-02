# Contribuir a Urban Pulse

El equipo sigue una estrategia inspirada en GitHub Flow con una rama de integración. La preparación del entorno está en la [guía de desarrollo](docs/development.md).

## Ramas y bases

- `main` representa la versión estable. No se trabaja directamente sobre ella.
- `dev` concentra la integración y el desarrollo activo.
- Una funcionalidad completa se coordina en una rama integradora `feature/nombre-issue`, creada desde `dev`.
- Cuando intervienen varios componentes, sus subramas parten de esa integradora: `feature/nombre-issue-backend`, `feature/nombre-issue-frontend-web` y `feature/nombre-issue-frontend-mobile`.
- Los trabajos independientes parten de `dev` con el prefijo correspondiente.

| Prefijo | Uso | Ejemplo |
| --- | --- | --- |
| `feature/...` | Funcionalidades nuevas. | `feature/filtros-mapa` |
| `fix/...` | Correcciones de errores. | `fix/validacion-fechas` |
| `docs/...` | Documentación técnica, manuales y README. | `docs/api-documentation` |
| `refactor/...` | Reorganización interna sin cambiar el comportamiento. | `refactor/project-structure` |
| `test/...` | Trabajo exclusivo en pruebas. | `test/task-service` |
| `hotfix/...` | Corrección excepcional, urgente y crítica. | `hotfix/error-critico` |

Antes de cambiar de rama, revisa `git status` y conserva cualquier trabajo local. Por ejemplo, para crear una rama independiente desde una base `dev` ya comprobada:

```bash
git switch dev
git switch -c docs/nombre-cambio
```

Para una subrama, selecciona primero la integradora y crea la subrama desde ella. La norma existente no concreta una base ni un circuito especial para `hotfix`; hay que acordarlos para cada caso.

## Integración y revisión

1. Los desarrolladores trabajan en sus ramas o subramas de componente.
2. Para funcionalidades con subequipos, las partes terminadas se fusionan localmente en la rama integradora `feature/nombre-issue`.
3. Cuando el trabajo esté completo y estable, se abre una PR hacia `dev`. En trabajos independientes, la PR parte de la rama de trabajo.
4. El reviewer asignado revisa la PR y la aprueba si es correcta.
5. Tras la aprobación e integración en `dev`, el tester verifica el funcionamiento en el entorno de pruebas.
6. Al finalizar el sprint, o al disponer de una versión estable y probada, se abre una PR de `dev` a `main`.

La PR debe permitir entender el cambio y las comprobaciones realizadas. Diferencia las comprobaciones ejecutadas de las pendientes y las funcionalidades previstas de las integradas.

## Commits

Los commits deben ser atómicos, con mensajes breves y concretos en el formato `<tipo>: <descripción en minúsculas>`. Evita mensajes genéricos como «cambios» o «arreglos».

| Tipo | Uso |
| --- | --- |
| `feat` | Nueva funcionalidad. |
| `fix` | Corrección de un error. |
| `docs` | Documentación. |
| `style` | Formato, espacios o linting. |
| `refactor` | Cambio interno sin alterar el comportamiento. |
| `test` | Añadir o modificar pruebas. |
| `chore` | Mantenimiento y tareas auxiliares. |
| `ci` | Integración continua. |
| `build` | Construcción del proyecto. |

Ejemplos: `feat: añadir endpoint de registro` y `docs: actualizar guía de desarrollo`.

## Comprobaciones según el cambio

Consulta los comandos y sus limitaciones en cada componente:

- [Backend](backend/README.md): compilación, lint y pruebas unitarias; e2e solo cuando se soliciten expresamente, conforme a sus instrucciones.
- [Web](frontend-web/README.md): lint, compilación y pruebas con Vitest.
- [Móvil](frontend-mobile/README.md): lint, comprobación de tipos y pruebas con Jest; utiliza pnpm.
- Documentación: comprobar enlaces relativos, rutas, coherencia con el código y `git diff --check`. No hace falta instalar dependencias ni arrancar servicios para revisar texto.

Respeta las instrucciones `AGENTS.md` de cada carpeta y el alcance del trabajo. Mantén las credenciales en archivos locales, fuera del control de versiones. Las decisiones de arquitectura se consultan en [los ADR](backend/docs/adr/).
