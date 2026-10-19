# Título de incidencia: entre 4 y 50 caracteres

- Rama: `feature/registro-incidencia`.
- Solicitud: 2026-10-19.
- Verificación: 2026-10-20.
- Solicitud: aplicar el rango inclusivo 4–50 al backend y frontend móvil.
- Estado: implementado y verificado.

## Cambio

Mantener trim antes de validar. Backend: ampliar máximo de 25 a 50 y actualizar Swagger/error. Móvil: reducir máximo de 100 a 50 y añadir mínimo de 4 con un mensaje claro; el TextInput ya usa la constante del validador para su máximo. Mantener los demás campos y flujos.

## Aceptación

- Se aceptan títulos de 4, 26 y 50 caracteres después de trim.
- Se rechazan títulos vacíos, de 3 y de 51 caracteres.
- El backend mantiene el conteo por puntos de código Unicode existente.
- El móvil mantiene el límite nativo del TextInput y valida el rango al enviar.
- Swagger, documentación del contrato y mensajes muestran 4–50.

## Verificación

- [x] Regresión demostrada antes del cambio: tres casos backend y cuatro casos móvil fallaban con los límites anteriores.
- [x] Backend: 34 pruebas unitarias y 10 e2e correctas; build correcto y lint correcto, con tres avisos ya existentes por conteo Unicode.
- [x] Móvil: 124 pruebas correctas; Expo lint y TypeScript sin errores.
- [x] Swagger multipart: la nueva aserción detectó el máximo antiguo de 25; tras corregirlo, las diez pruebas e2e pasaron.
- [x] Documentación del contrato y specs vigentes actualizadas.

## Informe de cambios

El backend acepta títulos de 4 a 50 puntos de código tras trim y describe ese rango en el DTO y en el esquema multipart de Swagger. La aplicación móvil mantiene su límite nativo del TextInput mediante la constante, ahora de 50, y muestra error al enviar un título de menos de 4 caracteres. Se conserva su conteo nativo/JavaScript existente. No se cambia el contrato de otros campos ni el modelo SQL de referencia.

Se restauraron dependencias móviles desde el lockfile con `npm ci --ignore-scripts` para ejecutar las pruebas; no se modificaron manifiestos ni lockfiles. No se crearon commits ni se hizo push.
