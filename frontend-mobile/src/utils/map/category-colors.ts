// Color neutro para incidencias sin categoría.
export const NEUTRAL_CATEGORY_COLOR = '#6B7280';

// Paleta fija de colores distinguibles sobre el mapa.
const CATEGORY_COLOR_PALETTE: readonly string[] = [
  '#E53935',
  '#1E88E5',
  '#43A047',
  '#FB8C00',
  '#8E24AA',
  '#00ACC1',
  '#D81B60',
  '#7CB342',
  '#5E35B1',
  '#F4511E',
];

// Normaliza el nombre: minúsculas, sin tildes y sin espacios en los extremos.
function normalizeCategoryName(categoryName: string): string {
  return categoryName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Hash djb2 determinista y sin signo.
function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// Devuelve siempre el mismo color para el mismo nombre normalizado.
export function getCategoryColor(categoryName: string | null): string {
  if (categoryName === null) return NEUTRAL_CATEGORY_COLOR;
  const normalizedName = normalizeCategoryName(categoryName);
  if (normalizedName === '') return NEUTRAL_CATEGORY_COLOR;
  return CATEGORY_COLOR_PALETTE[
    hashString(normalizedName) % CATEGORY_COLOR_PALETTE.length
  ];
}
