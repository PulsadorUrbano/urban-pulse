// Generador de UUID v4 sin dependencias externas. Solo para ids de datos de
// mock/desarrollo (p. ej. el civicId que genera el cliente al registrarse
// contra json-server); nunca debe usarse para nada que requiera aleatoriedad
// criptográficamente segura.
export function generateMockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = (Math.random() * 16) | 0;
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}
