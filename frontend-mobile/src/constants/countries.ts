import type { Country } from '@/types/country';

export const COUNTRIES: Country[] = [
  { isoCode: 'ES', dialCode: '+34', flagEmoji: '🇪🇸', name: 'España' },
  { isoCode: 'FR', dialCode: '+33', flagEmoji: '🇫🇷', name: 'Francia' },
  { isoCode: 'PT', dialCode: '+351', flagEmoji: '🇵🇹', name: 'Portugal' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];
