/// <reference types="jest" />
import { COUNTRIES, DEFAULT_COUNTRY } from '@/constants/countries';

describe('countries constants', () => {
  it('DEFAULT_COUNTRY es España con prefijo +34', () => {
    expect(DEFAULT_COUNTRY).toEqual({
      isoCode: 'ES',
      dialCode: '+34',
      flagEmoji: '🇪🇸',
      name: 'España',
    });
  });

  it('COUNTRIES tiene exactamente 3 entradas con isoCode, dialCode y flagEmoji esperados', () => {
    expect(COUNTRIES).toHaveLength(3);
    expect(
      COUNTRIES.map(({ isoCode, dialCode, flagEmoji }) => ({ isoCode, dialCode, flagEmoji })),
    ).toEqual([
      { isoCode: 'ES', dialCode: '+34', flagEmoji: '🇪🇸' },
      { isoCode: 'FR', dialCode: '+33', flagEmoji: '🇫🇷' },
      { isoCode: 'PT', dialCode: '+351', flagEmoji: '🇵🇹' },
    ]);
  });

  it('DEFAULT_COUNTRY es la primera entrada de COUNTRIES', () => {
    expect(DEFAULT_COUNTRY).toBe(COUNTRIES[0]);
  });
});
