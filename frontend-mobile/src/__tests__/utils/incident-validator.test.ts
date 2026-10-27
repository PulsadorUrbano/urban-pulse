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
import type { CreateIncidentInput } from '@/types/incident';

// Construye un input válido base para reutilizarlo en cada caso.
function buildValidInput(overrides: Partial<CreateIncidentInput> = {}): CreateIncidentInput {
  return {
    title: 'Bache en la avenida',
    description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
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

  it('no marca error cuando la descripción es más corta que el mínimo (es opcional)', () => {
    const tooShort = 'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1);
    const errors = validateIncidentInput(buildValidInput({ description: tooShort }));

    expect(errors).toEqual({});
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

describe('validateIncidentInput (categoría opcional)', () => {
  it('no marca error cuando la categoría está ausente', () => {
    const errors = validateIncidentInput(buildValidInput());

    expect(errors.category).toBeUndefined();
  });

  it('no marca error cuando la categoría es null', () => {
    const errors = validateIncidentInput(buildValidInput({ category: null }));

    expect(errors.category).toBeUndefined();
  });

  it('marca error cuando la categoría está definida pero vacía', () => {
    const errors = validateIncidentInput(buildValidInput({ category: '' }));

    expect(errors.category).toBeDefined();
  });

  it('marca error cuando la categoría solo contiene espacios', () => {
    const errors = validateIncidentInput(buildValidInput({ category: '   ' }));

    expect(errors.category).toBeDefined();
  });

  it('no marca error cuando hay categoría personalizada aunque categoryId sea null', () => {
    const errors = validateIncidentInput(
      buildValidInput({ category: 'Vallado', categoryId: null }),
    );

    expect(errors.category).toBeUndefined();
  });

  it('no marca error cuando hay categoryId aunque la categoría personalizada sea null', () => {
    const errors = validateIncidentInput(
      buildValidInput({ categoryId: '2', category: null }),
    );

    expect(errors.category).toBeUndefined();
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
  // Descripción válida (supera el mínimo requerido).
  const validDescription = 'Hay un bache profundo en la vía.';

  it('avisa de descripción vacía cuando la ubicación está activada', () => {
    const warnings = getIncidentWarnings({ description: '', isLocationEnabled: true });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('description-empty');
  });

  it('avisa de descripción demasiado corta cuando la ubicación está activada', () => {
    const warnings = getIncidentWarnings({
      description: 'a'.repeat(INCIDENT_DESCRIPTION_MIN_LENGTH - 1),
      isLocationEnabled: true,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('description-too-short');
  });

  it('avisa de ubicación desactivada cuando la descripción es válida', () => {
    const warnings = getIncidentWarnings({
      description: validDescription,
      isLocationEnabled: false,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('location-disabled');
  });

  it('acumula los avisos de descripción y ubicación en ese orden', () => {
    const warnings = getIncidentWarnings({ description: '', isLocationEnabled: false });

    expect(warnings).toHaveLength(2);
    expect(warnings.map((warning) => warning.code)).toEqual([
      'description-empty',
      'location-disabled',
    ]);
  });

  it('no devuelve avisos con descripción válida y ubicación activada', () => {
    const warnings = getIncidentWarnings({
      description: validDescription,
      isLocationEnabled: true,
    });

    expect(warnings).toEqual([]);
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
    expect(hasValidationErrors({ category: 'Escribe una categoría.' })).toBe(true);
  });
});
