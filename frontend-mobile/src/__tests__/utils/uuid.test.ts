/// <reference types="jest" />
import { generateMockUuid } from '@/utils/uuid';

// Regex de un UUID v4 válido: 8-4-4-4-12 caracteres hexadecimales,
// con el nibble de versión fijo en "4" y el nibble de variante en 8/9/a/b.
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateMockUuid', () => {
  it('cumple el formato UUID v4 con guiones en las posiciones esperadas', () => {
    const uuid = generateMockUuid();

    expect(uuid).toMatch(UUID_V4_REGEX);
  });

  it('genera valores distintos en llamadas consecutivas', () => {
    const firstUuid = generateMockUuid();
    const secondUuid = generateMockUuid();

    expect(firstUuid).not.toBe(secondUuid);
  });

  it('genera valores razonablemente únicos en una muestra pequeña', () => {
    const sampleSize = 100;
    const generatedUuids = new Set(Array.from({ length: sampleSize }, () => generateMockUuid()));

    expect(generatedUuids.size).toBe(sampleSize);
  });
});
