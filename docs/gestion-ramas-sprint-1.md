# Documentación primera subida de proyecto

**Fecha:** 2026-11-03
**Autora:** Sofía Villalba Jiménez
**Sprint:** Primer Sprint

## Contexto

De cara a la primera entrega del proyecto, se ha hecho un análisis de todas las ramas del repositorio para entender qué funcionalidades están repartidas entre ellas y cuáles de esas ramas realmente aportan trabajo que no está ya recogido en otra rama.

Para ello se ha comprobado, rama a rama, si el historial de commits de una rama está completamente contenido (es decir, es ancestro) en el historial de otra. Cuando el historial de una rama A es un subconjunto del historial de una rama B, significa que todo el trabajo de A ya forma parte de B (normalmente porque B nació de A y siguió avanzando, o porque A se integró en B en algún momento), así que A no aporta nada que B no tenga ya.

### ¿Qué es una "rama punta"?

Llamamos **rama punta** a aquella rama cuyo historial de commits **no** está contenido en el de ninguna otra rama del repositorio. Es decir, son las ramas que tienen al menos un commit propio que no ha sido incorporado todavía a ninguna otra rama. Son las que realmente hay que revisar y, en su caso, integrar, porque son las únicas que contienen trabajo "vivo" no recogido en otro sitio.

## Ramas punta (contienen trabajo no integrado en otra rama)

- `feat-imagenes-cloudinary`
- `feature-login`
- `feature/asignar-tecnico-flow`
- `feature/incident-cycle-backend`
- `feature/login-frontend-mobile`
- `feature/registro-ciudadano`
- `feature/registro-incidencia`

## Ramas contenidas (ya integradas en alguna de las anteriores)

Las siguientes ramas son ancestro de al menos una de las ramas punta de arriba, es decir, todo su contenido ya está incluido en ellas. No aportan nada adicional:

- `docs/creacion-adr`
- `docs/modularizar-documentacion`
- `feature/logout`
- `feature/registro-ciudadano-frontend-mobile`
- `feature/registro-incidencia-backend`
- `feature/token`
- `feature/token-frontend-mobile`
- `feature/ver-mis-incidencias`
- `fix-resolve-backend-conflicts`
- `fix/puerto-backend-movil`
- `fix/unificar-login`
- `main`

**Plan:** estas ramas están pendientes de eliminación una vez se revise y confirme que no se pierde ningún trabajo.

## Próximos pasos

1. Eliminar las ramas que no añaden funcionalidades nuevas (las listadas como "contenidas" arriba).
2. Mergear el resto de ramas punta en `dev`.

Ninguna de estas acciones (borrado de ramas, merges) se ejecutará hasta que el equipo revise este documento y dé su visto bueno en el issue abierto para ello.
