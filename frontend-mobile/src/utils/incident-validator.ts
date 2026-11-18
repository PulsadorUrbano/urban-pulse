import { z } from 'zod';

export const INCIDENT_TITLE_MIN_LENGTH = 4;
export const INCIDENT_TITLE_MAX_LENGTH = 35;
export const INCIDENT_DESCRIPTION_MIN_LENGTH = 10;
export const INCIDENT_DESCRIPTION_MAX_LENGTH = 1000;

export interface IncidentValidationErrors {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
}

// Valores del formulario que se validan antes de enviar. La categoría debe
// venir del catálogo activo y la ubicación es obligatoria (contrato PR #185).
export interface IncidentFormValues {
  title: string;
  description: string;
  categoryId: string | null;
  isLocationEnabled: boolean;
}

// Esquema del título: normaliza con trim() y comprueba, por orden de prioridad,
// vacío > muy corto > muy largo.
const titleSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'El título es obligatorio.' });
    } else if (value.length < INCIDENT_TITLE_MIN_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `El título debe tener al menos ${INCIDENT_TITLE_MIN_LENGTH} caracteres.`,
      });
    } else if (value.length > INCIDENT_TITLE_MAX_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `El título no puede superar los ${INCIDENT_TITLE_MAX_LENGTH} caracteres.`,
      });
    }
  });

// Esquema de la descripción: es opcional (puede quedar vacía), pero si se
// escribe debe tener al menos INCIDENT_DESCRIPTION_MIN_LENGTH caracteres,
// porque el backend rechaza descripciones más cortas.
const descriptionSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value.length > 0 && value.length < INCIDENT_DESCRIPTION_MIN_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `La descripción debe tener al menos ${INCIDENT_DESCRIPTION_MIN_LENGTH} caracteres o quedar vacía.`,
      });
    }
  });

// Esquema de la categoría: obligatoria y siempre del catálogo (por id).
const categorySchema = z
  .string()
  .nullable()
  .superRefine((value, ctx) => {
    if (value == null || value.trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Elige una categoría del catálogo.' });
    }
  });

// Esquema de la ubicación: el interruptor debe estar activado para enviar.
const locationSchema = z.boolean().superRefine((value, ctx) => {
  if (!value) {
    ctx.addIssue({
      code: 'custom',
      message:
        'La ubicación es obligatoria para registrar la incidencia. Actívala e inténtalo de nuevo.',
    });
  }
});

const incidentValidationSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  category: categorySchema,
  location: locationSchema,
});

export type IncidentDescriptionQuality = 'empty' | 'too_short' | 'ok';

export type IncidentWarningCode = 'description-empty';

export interface IncidentWarning {
  code: IncidentWarningCode;
  message: string;
}

export interface IncidentWarningInput {
  description: string;
}

// Valida el formulario normalizando los valores con trim(). Título, categoría
// del catálogo y ubicación son obligatorios; la descripción es opcional, pero
// si se escribe debe alcanzar la longitud mínima.
// Es una función pura: no muta la entrada ni produce efectos secundarios.
// Traduce el resultado de los esquemas Zod a IncidentValidationErrors,
// conservando solo el primer error de cada campo.
export function validateIncidentInput(input: IncidentFormValues): IncidentValidationErrors {
  const result = incidentValidationSchema.safeParse({
    title: input.title,
    description: input.description,
    category: input.categoryId,
    location: input.isLocationEnabled,
  });

  if (result.success) {
    return {};
  }

  const errors: IncidentValidationErrors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    if (
      (field === 'title' || field === 'description' || field === 'category' || field === 'location') &&
      errors[field] === undefined
    ) {
      errors[field] = issue.message;
    }
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

// Reúne los avisos no bloqueantes del formulario: solo la descripción vacía
// (una descripción corta o la ubicación desactivada ya son errores de
// validación). Devuelve una lista vacía cuando no hay nada que avisar.
export function getIncidentWarnings(input: IncidentWarningInput): IncidentWarning[] {
  const warnings: IncidentWarning[] = [];

  if (getDescriptionQuality(input.description) === 'empty') {
    warnings.push({
      code: 'description-empty',
      message:
        'No has añadido una descripción. Es recomendable añadir una para que el sistema de incidencias mejore.',
    });
  }

  return warnings;
}

// Indica si el resultado de la validación contiene al menos un error.
export function hasValidationErrors(errors: IncidentValidationErrors): boolean {
  return Boolean(errors.title || errors.description || errors.category || errors.location);
}
