/**
 * A continuación se muestran los colores que se usan en la app. Los colores están definidos para el modo claro y el modo oscuro.
 * Los estilos de la app se aplican con NativeWind (`className`); estos tokens se usan donde hace falta un valor en JS (p. ej. `style` dinámico).
 */

import '@/global.css';

import { Platform } from 'react-native';

import { type IncidentStatus } from '@/types/incident';
import { type PasswordStrengthLevel } from '@/utils/password-strength';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Color de error: fijo, no depende del tema claro/oscuro
    error: '#d92d20',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    // Mismo valor que en claro: el color de error no distingue tema
    error: '#d92d20',
  },
} as const;

// Paleta fija por estado de incidencia (no depende del tema claro/oscuro).
export const IncidentStatusColors: Record<IncidentStatus, string> = {
  reported: '#6b7280', // gris: recién reportada, sin revisar todavía
  validated: '#2563eb', // azul: confirmada por el ayuntamiento
  rejected: '#dc2626', // rojo: descartada
  assigned: '#4f46e5', // índigo: asignada a un equipo/técnico
  in_progress: '#d97706', // ámbar: en curso de resolución
  resolved: '#16a34a', // verde: resuelta
  reopened: '#9333ea', // morado: reabierta tras una resolución previa
  closed: '#334155', // gris pizarra: cerrada definitivamente
};

// Paleta fija por nivel de fortaleza de contraseña.
export const PasswordStrengthColors: Record<PasswordStrengthLevel, string> = {
  invalid: '#d92d20',
  acceptable: '#d97706',
  strong: '#16a34a',
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
