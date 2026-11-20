import { z } from 'zod';

export type PasswordStrengthLevel = 'invalid' | 'acceptable' | 'strong';

export function getPasswordStrengthLevel(password: string): PasswordStrengthLevel {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const meetsBasicRequirements = hasMinLength && hasUppercase && hasNumber;

  if (!meetsBasicRequirements) return 'invalid';
  // El carácter especial no es obligatorio para ser válida, pero eleva la
  // fortaleza de "aceptable" a "robusta".
  return hasSpecialChar ? 'strong' : 'acceptable';
}

// Se usa un regex propio en lugar de `z.string().email()`, cuyo criterio de
// formato es distinto y aceptaría/rechazaría otros emails.
const emailFormatSchema = z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

export function isEmailFormatValid(email: string): boolean {
  return emailFormatSchema.safeParse(email.trim()).success;
}
