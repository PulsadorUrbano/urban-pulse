/// <reference types="jest" />
import {
  NEUTRAL_CATEGORY_COLOR,
  getCategoryColor,
} from '@/utils/map/category-colors';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// Nombres de categoría de muestra para comprobar la paleta sin depender de su contenido exacto.
const SAMPLE_CATEGORY_NAMES = [
  'Bache',
  'Alumbrado',
  'Limpieza',
  'Grafiti',
  'Señalización',
  'Mobiliario',
  'Fuga de agua',
  'Arbolado',
  'Ruido',
  'Contenedores',
  'Semáforos',
  'Vandalismo',
];

describe('getCategoryColor', () => {
  it('devuelve el mismo color para variantes de mayúsculas, espacios y tildes del mismo nombre', () => {
    const baseColor = getCategoryColor('Bache');

    expect(getCategoryColor('bache ')).toBe(baseColor);
    expect(getCategoryColor('BACHÉ')).toBe(baseColor);
    expect(getCategoryColor('  bache')).toBe(baseColor);
    expect(getCategoryColor('bache')).toBe(baseColor);
  });

  it('devuelve el mismo color en llamadas repetidas (determinista)', () => {
    expect(getCategoryColor('Alumbrado')).toBe(getCategoryColor('Alumbrado'));
  });

  it('devuelve siempre un color hexadecimal válido', () => {
    for (const categoryName of SAMPLE_CATEGORY_NAMES) {
      expect(getCategoryColor(categoryName)).toMatch(HEX_COLOR_PATTERN);
    }
  });

  it('devuelve colores de la paleta fija (nunca el neutro) para nombres reales', () => {
    const usedColors = new Set(
      SAMPLE_CATEGORY_NAMES.map((categoryName) => getCategoryColor(categoryName)),
    );

    expect(usedColors.size).toBeGreaterThan(1);
    expect(usedColors.size).toBeLessThanOrEqual(10);
    for (const color of usedColors) {
      expect(color).not.toBe(NEUTRAL_CATEGORY_COLOR);
    }
  });

  it('devuelve el color neutro cuando el nombre es null', () => {
    expect(getCategoryColor(null)).toBe(NEUTRAL_CATEGORY_COLOR);
  });

  it('devuelve el color neutro cuando el nombre es una cadena vacía', () => {
    expect(getCategoryColor('')).toBe(NEUTRAL_CATEGORY_COLOR);
  });

  it('devuelve el color neutro cuando el nombre solo contiene espacios', () => {
    expect(getCategoryColor('   ')).toBe(NEUTRAL_CATEGORY_COLOR);
  });

  it('define el color neutro como gris válido fuera de la paleta', () => {
    expect(NEUTRAL_CATEGORY_COLOR).toMatch(HEX_COLOR_PATTERN);
  });
});
