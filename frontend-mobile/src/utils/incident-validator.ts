import type { CreateIncidentInput } from '@/types/incident';

export const INCIDENT_TITLE_MIN_LENGTH = 4;
export const INCIDENT_TITLE_MAX_LENGTH = 35;
export const INCIDENT_DESCRIPTION_MIN_LENGTH = 10;
export const INCIDENT_DESCRIPTION_MAX_LENGTH = 1000;

export interface IncidentValidationErrors {
  title?: string;
  category?: string;
}

export type IncidentDescriptionQuality = 'empty' | 'too_short' | 'ok';

export type IncidentWarningCode = 'description-empty' | 'description-too-short' | 'location-disabled';

export interface IncidentWarning {
  code: IncidentWarningCode;
  message: string;
}

export interface IncidentWarningInput {
  description: string;
  isLocationEnabled: boolean;
}

// Valida los campos obligatorios normalizando los valores con trim().
// Solo el título es obligatorio; la descripción y la categoría son opcionales,
// aunque si se envía una categoría personalizada no puede quedar vacía.
// Es una función pura: no muta la entrada ni produce efectos secundarios.
export function validateIncidentInput(input: CreateIncidentInput): IncidentValidationErrors {
  const errors: IncidentValidationErrors = {};
  const title = input.title.trim();

  if (title.length === 0) {
    errors.title = 'El título es obligatorio.';
  } else if (title.length < INCIDENT_TITLE_MIN_LENGTH) {
    errors.title = `El título debe tener al menos ${INCIDENT_TITLE_MIN_LENGTH} caracteres.`;
  } else if (title.length > INCIDENT_TITLE_MAX_LENGTH) {
    errors.title = `El título no puede superar los ${INCIDENT_TITLE_MAX_LENGTH} caracteres.`;
  }

  if (input.category != null && input.category.trim().length === 0) {
    errors.category = 'Escribe una categoría o quita la selección de "Otros".';
  }

  return errors;
}

// Clasifica la descripción para decidir si conviene avisar antes de enviar.
export function getDescriptionQuality(description: string): IncidentDescriptionQuality {
  const trimmed = description.trim();

  if (trimmed.length === 0) {
    return 'empty';
  }

  if (trimmed.length < INCIDENT_DESCRIPTION_MIN_LENGTH) {
    return 'too_short';
  }

  return 'ok';
}

// Reúne los avisos no bloqueantes del formulario: calidad de la descripción y
// ubicación desactivada. Devuelve una lista vacía cuando no hay nada que avisar.
export function getIncidentWarnings(input: IncidentWarningInput): IncidentWarning[] {
  const warnings: IncidentWarning[] = [];
  const descriptionQuality = getDescriptionQuality(input.description);

  if (descriptionQuality === 'empty') {
    warnings.push({
      code: 'description-empty',
      message:
        'No has añadido una descripción. Es recomendable añadir una para que el sistema de incidencias mejore.',
    });
  } else if (descriptionQuality === 'too_short') {
    warnings.push({
      code: 'description-too-short',
      message:
        'La descripción es muy corta. Añadir más detalle ayuda a que el sistema de incidencias mejore.',
    });
  }

  if (!input.isLocationEnabled) {
    warnings.push({
      code: 'location-disabled',
      message: 'La ubicación está desactivada. Si la envías así, no se podrá localizar la incidencia.',
    });
  }

  return warnings;
}

// Indica si el resultado de la validación contiene al menos un error.
export function hasValidationErrors(errors: IncidentValidationErrors): boolean {
  return Boolean(errors.title) || Boolean(errors.category);
}
