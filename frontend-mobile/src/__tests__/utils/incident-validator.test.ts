/// <reference types="jest" />
import {
  INCIDENT_DESCRIPTION_MIN_LENGTH,
  INCIDENT_TITLE_MAX_LENGTH,
  INCIDENT_TITLE_MIN_LENGTH,
  getDescriptionQuality,
  getIncidentWarnings,
  hasValidationErrors,
  validateIncidentInput,
} from '@/utils/incident-validator';
import type { IncidentFormValues } from '@/utils/incident-validator';

// Construye un input válido base para reutilizarlo en cada caso.
function buildValidInput(overrides: Partial<IncidentFormValues> = {}): IncidentFormValues {
  return {
    title: 'Bache en la avenida',
    description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
    categoryId: '2',
    isLocationEnabled: true,
    ...overrides,
  };
}

describe('validateIncidentInput', () => {
  it.each(['abc', '  abc  ', 'a'.repeat(36)])('rechaza un titulo fuera de 4-35: %s', (title) => {
    expect(validateIncidentInput(buildValidInput({ title })).title).toBeDefined();
  });

  it.each(['a'.repeat(4), 'a'.repeat(26), 'a'.repeat(35)])('acepta un titulo de 4-35 tras trim: %s', (title) => {
    expect(validateIncidentInput(buildValidInput({ title: `  ${title}  ` })).title).toBeUndefined();
  });

  it('limita el titulo del formulario a 35 caracteres', () => {
    expect(INCIDENT_TITLE_MAX_LENGTH).toBe(35);
  });

  it('marca error en title cuando el título está vacío', () => {
    const errors = validateIncidentInput(buildValidInput({ title: '' }));

    expect(errors.title).toBeDefined();
  });

  it('marca error en title cuando el título solo contiene espacios', () => {
    const errors = validateIncidentInput(buildValidInput({ title: '     ' }));

    expect(errors.title).toBeDefined();
  });

  it('marca error en title cuando es más largo que el máximo', () => {
    const tooLong = 'a'.repeat(INCIDENT_TITLE_MAX_LENGTH + 1);
    const errors = validateIncidentInput(buildValidInput({ title: tooLong }));

    expect(errors.title).toContain(String(INCIDENT_TITLE_MAX_LENGTH));
  });

  it('marca error en title cuando es más corto que el mínimo', () => {
    const tooShort = 'a'.repeat(INCIDENT_TITLE_MIN_LENGTH - 1);
    const errors = validateIncidentInput(buildValidInput({ title: tooShort }));

    expect(errors.title).toContain(String(INCIDENT_TITLE_MIN_LENGTH));
  });

  it('no marca error cuando la descripción está vacía (es opcional)', () => {
    const errors = validateIncidentInput(buildValidInput({ description: '' }));

    expect(errors).toEqual({});
  });

  it('marca error en description cuando se escribe pero es más corta que el mínimo', () => {
    const tooShort = 'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1);
    const errors = validateIncidentInput(buildValidInput({ description: tooShort }));

    expect(errors.description).toContain(String(INCIDENT_DESCRIPTION_MIN_LENGTH));
  });

  it('mide la longitud mínima de la descripción tras trim', () => {
    const paddedTooShort = `   ${'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1)}   `;

    expect(validateIncidentInput(buildValidInput({ description: paddedTooShort })).description).toBeDefined();
    expect(
      validateIncidentInput(buildValidInput({ description: 'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH) }))
        .description,
    ).toBeUndefined();
  });

  it('devuelve un objeto vacío para un input válido', () => {
    const errors = validateIncidentInput(buildValidInput());

    expect(errors).toEqual({});
  });

  it('acepta el título en el límite exacto de longitud', () => {
    const errors = validateIncidentInput(
      buildValidInput({ title: 'a'.repeat(INCIDENT_TITLE_MAX_LENGTH) }),
    );

    expect(errors).toEqual({});
  });
});

describe('validateIncidentInput (categoría del catálogo obligatoria)', () => {
  it('marca error cuando no hay categoría seleccionada', () => {
    const errors = validateIncidentInput(buildValidInput({ categoryId: null }));

    expect(errors.category).toBe('Elige una categoría del catálogo.');
  });

  it('marca error cuando el categoryId está vacío', () => {
    const errors = validateIncidentInput(buildValidInput({ categoryId: '  ' }));

    expect(errors.category).toBeDefined();
  });

  it('no marca error cuando hay una categoría del catálogo', () => {
    const errors = validateIncidentInput(buildValidInput({ categoryId: '2' }));

    expect(errors.category).toBeUndefined();
  });
});

describe('validateIncidentInput (ubicación obligatoria)', () => {
  it('marca error cuando la ubicación está desactivada', () => {
    const errors = validateIncidentInput(buildValidInput({ isLocationEnabled: false }));

    expect(errors.location).toContain('La ubicación es obligatoria');
  });

  it('no marca error cuando la ubicación está activada', () => {
    const errors = validateIncidentInput(buildValidInput({ isLocationEnabled: true }));

    expect(errors.location).toBeUndefined();
  });

  it('acumula los errores de varios campos a la vez', () => {
    const errors = validateIncidentInput({
      title: '',
      description: 'corta',
      categoryId: null,
      isLocationEnabled: false,
    });

    expect(Object.keys(errors).sort()).toEqual(['category', 'description', 'location', 'title']);
  });
});

describe('getDescriptionQuality', () => {
  it('devuelve empty cuando la descripción está vacía o solo tiene espacios', () => {
    expect(getDescriptionQuality('')).toBe('empty');
    expect(getDescriptionQuality('    ')).toBe('empty');
  });

  it('devuelve too_short cuando es más corta que el mínimo', () => {
    expect(getDescriptionQuality('a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1))).toBe('too_short');
  });

  it('devuelve ok cuando alcanza el mínimo', () => {
    expect(getDescriptionQuality('a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH))).toBe('ok');
  });
});

describe('getIncidentWarnings', () => {
  it('avisa de descripción vacía', () => {
    const warnings = getIncidentWarnings({ description: '' });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('description-empty');
  });

  it('avisa de descripción vacía cuando solo contiene espacios', () => {
    expect(getIncidentWarnings({ description: '   ' }).map((warning) => warning.code)).toEqual([
      'description-empty',
    ]);
  });

  it('no avisa de una descripción corta (ya es un error de validación)', () => {
    const warnings = getIncidentWarnings({
      description: 'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1),
    });

    expect(warnings).toEqual([]);
  });

  it('no devuelve avisos con una descripción válida', () => {
    expect(getIncidentWarnings({ description: 'Hay un bache profundo en la vía.' })).toEqual([]);
  });
});

describe('hasValidationErrors', () => {
  it('es false cuando no hay errores', () => {
    expect(hasValidationErrors({})).toBe(false);
  });

  it('es true cuando existe error de título', () => {
    expect(hasValidationErrors({ title: 'El título es obligatorio.' })).toBe(true);
  });

  it('es true cuando existe error de categoría', () => {
    expect(hasValidationErrors({ category: 'Elige una categoría del catálogo.' })).toBe(true);
  });

  it('es true cuando existe error de descripción', () => {
    expect(hasValidationErrors({ description: 'Muy corta.' })).toBe(true);
  });

  it('es true cuando existe error de ubicación', () => {
    expect(hasValidationErrors({ location: 'La ubicación es obligatoria.' })).toBe(true);
  });
});
