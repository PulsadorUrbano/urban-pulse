# Titulo de incidencia: 4-35 caracteres

- Fecha: 2026-10-20.
- Rama: feature/registro-incidencia.
- Decision del usuario: el rango correcto es 4-35, sustituyendo el limite remoto de 4-25 y la propuesta anterior de 4-50.
- Estado: implementado y verificado.

## Alcance

Actualizar validacion backend, DTO y esquema multipart Swagger, constante movil y documentacion vigente. Mantener trim, el minimo de 4, el conteo Unicode existente y todos los demas campos y flujos. El TextInput movil ya usa la constante de longitud maxima. Conservar la limpieza de emojis y no introducir nuevos emojis.

## Aceptacion

Se aceptan titulos de 4, 26 y 35 caracteres tras trim; se rechazan titulos vacios, de 3 y de 36. Swagger anuncia minLength 4 y maxLength 35.

## Verificacion

Backend: build y lint correctos (dos avisos Unicode existentes); 35 pruebas unitarias y 11 e2e correctas. Movil: 295 pruebas correctas, lint y typecheck correctos. Total: 341 pruebas. Los casos de 26 y 35 fallaron antes del cambio y pasan despues. Swagger multipart anuncia minLength 4 y maxLength 35. No se crearon commits ni se hizo push.
