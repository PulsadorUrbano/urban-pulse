- [] Android: confirm-action.ts, línea 50, onDismiss ejecuta la acción de cancelar incluso cuando se pulsa "enviar sin ubicación". En ese flujo
  cancelar libera el bloqueo antes de que se termine el envío, por lo que puede volver a pulsar "enviar" y crear otra incidencia. React Native indica que pulsar un botón tambnién cierra el dálogo.
  Conviene liberar el bloqueo al descartar el diálogo sin elegir una acción, y conservarlo hasta que termine la petición cuando se confirma.
