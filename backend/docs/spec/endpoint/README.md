# Catálogo de endpoints del backend

Este directorio contiene la documentación de los contratos HTTP. No contiene controladores ni crea rutas.

## Endpoints de autenticación

| Carpeta | Método y ruta | Estado |
| --- | --- | --- |
| [post-auth-register](post-auth-register/README.md) | `POST /auth/register` | Implementado, verificación pendiente |
| [post-auth-login](post-auth-login/README.md) | `POST /auth/login` | Implementado, verificación pendiente |
| [get-auth-me](get-auth-me/README.md) | `GET /auth/me` | Implementado, verificación pendiente |
| [post-auth-token](post-auth-token/README.md) | `POST /auth/token` | Retirado |

## Organización

Una carpeta por método y ruta, en minúsculas y kebab-case: método seguido de la ruta sin la barra inicial, con las barras sustituidas por guiones y los parámetros por nombres legibles. Cada carpeta contiene un `README.md` con estado, entrada, respuesta, errores, almacenamiento y referencias.
