/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';

import { PasswordStrengthMeter, STRENGTH_LABELS } from '@/components/password-strength-meter';
import { getPasswordStrengthLevel, type PasswordStrengthLevel } from '@/utils/password-strength';

// El tema (vía ThemedText) importa `global.css` (Tailwind) que Jest no puede transformar.
jest.mock('@/global.css', () => ({}));

// Contraseñas de ejemplo para cada nivel. Su nivel se verifica con
// getPasswordStrengthLevel en cada test para no depender de un valor fijo.
const EXAMPLE_PASSWORD_BY_LEVEL: Record<PasswordStrengthLevel, string> = {
  invalid: 'abc',
  acceptable: 'Secreta123',
  strong: 'Secreta123!',
};

describe('PasswordStrengthMeter', () => {
  it('no renderiza nada cuando password es cadena vacía', async () => {
    const { toJSON } = await render(<PasswordStrengthMeter password="" />);

    expect(toJSON()).toBeNull();
  });

  it.each(['invalid', 'acceptable', 'strong'] as const)(
    'muestra la etiqueta de STRENGTH_LABELS para el nivel "%s"',
    async (expectedLevel) => {
      const examplePassword = EXAMPLE_PASSWORD_BY_LEVEL[expectedLevel];
      expect(getPasswordStrengthLevel(examplePassword)).toBe(expectedLevel);

      await render(<PasswordStrengthMeter password={examplePassword} />);

      expect(screen.getByText(STRENGTH_LABELS[expectedLevel])).toBeOnTheScreen();
    }
  );

  it('cambia la etiqueta mostrada al re-renderizar con una contraseña de otro nivel', async () => {
    const initialPassword = EXAMPLE_PASSWORD_BY_LEVEL.invalid;
    const updatedPassword = EXAMPLE_PASSWORD_BY_LEVEL.strong;
    expect(getPasswordStrengthLevel(initialPassword)).toBe('invalid');
    expect(getPasswordStrengthLevel(updatedPassword)).toBe('strong');

    const { rerender } = await render(<PasswordStrengthMeter password={initialPassword} />);
    expect(screen.getByText(STRENGTH_LABELS.invalid)).toBeOnTheScreen();

    await rerender(<PasswordStrengthMeter password={updatedPassword} />);

    expect(screen.getByText(STRENGTH_LABELS.strong)).toBeOnTheScreen();
    expect(screen.queryByText(STRENGTH_LABELS.invalid)).not.toBeOnTheScreen();
  });
});
