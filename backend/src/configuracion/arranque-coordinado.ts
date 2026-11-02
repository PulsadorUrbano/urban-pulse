export function anunciarArranqueCoordinado(puerto: number): void {
  if (process.env.URBAN_PULSE_COORDINADO !== '1') {
    return;
  }

  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('El puerto real del backend debe ser un entero entre 1 y 65535.');
  }

  if (typeof process.send !== 'function') {
    throw new Error('No está disponible el canal IPC para anunciar el arranque coordinado.');
  }

  process.send({ tipo: 'backend-listo', puerto });
}
