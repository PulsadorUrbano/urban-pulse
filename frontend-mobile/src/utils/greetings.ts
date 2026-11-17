// Genera los saludos posibles para el usuario
export const buildGreetings = (name: string): string[] => [
  `¡Estás de vuelta, ${name}!`,
  `¿Alguna incidencia que reportar, ${name}?`,
  `Hola, ${name}`,
];
