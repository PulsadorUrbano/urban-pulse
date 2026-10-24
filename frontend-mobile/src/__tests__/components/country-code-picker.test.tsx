/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import { CountryCodePicker, type CountryCodePickerProps } from '@/components/country-code-picker';
import { COUNTRIES, DEFAULT_COUNTRY } from '@/constants/countries';
import type { Country } from '@/types/country';

// El tema importa `global.css` (Tailwind) que Jest no puede transformar;
// se sustituye por un módulo vacío solo en el entorno de test.
jest.mock('@/global.css', () => ({}));

const FRANCE_COUNTRY: Country = COUNTRIES[1];
const PORTUGAL_COUNTRY: Country = COUNTRIES[2];

// Construye las props por defecto del componente y permite sobreescribirlas.
async function renderCountryCodePicker(overrides: Partial<CountryCodePickerProps> = {}) {
  const props: CountryCodePickerProps = {
    selectedCountry: DEFAULT_COUNTRY,
    onSelectCountry: jest.fn(),
    ...overrides,
  };

  const renderResult = await render(<CountryCodePicker {...props} />);

  return { props, renderResult };
}

// Abre el modal pulsando el trigger con la etiqueta de accesibilidad indicada.
async function openSheet(user: ReturnType<typeof userEvent.setup>, triggerLabel: string) {
  await user.press(screen.getByRole('button', { name: triggerLabel }));
}

describe('CountryCodePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('muestra bandera, isoCode y dialCode del país seleccionado (España por defecto)', async () => {
    await renderCountryCodePicker();

    expect(screen.getByText('🇪🇸 ES +34')).toBeOnTheScreen();
  });

  it('muestra la bandera, isoCode y dialCode de otro país pasado por props', async () => {
    await renderCountryCodePicker({ selectedCountry: PORTUGAL_COUNTRY });

    expect(screen.getByText('🇵🇹 PT +351')).toBeOnTheScreen();
    expect(screen.queryByText('🇪🇸 ES +34')).not.toBeOnTheScreen();
  });

  it('el accessibilityLabel del trigger refleja el país y prefijo actuales', async () => {
    await renderCountryCodePicker({ selectedCountry: FRANCE_COUNTRY });

    expect(
      screen.getByRole('button', {
        name: 'Cambiar prefijo de país, actual: Francia +33',
      }),
    ).toBeOnTheScreen();
  });

  it('al pulsar el trigger se abre el modal listando España, Francia y Portugal', async () => {
    const user = userEvent.setup();
    await renderCountryCodePicker();

    await openSheet(user, 'Cambiar prefijo de país, actual: España +34');

    expect(screen.getByText('Elige un país')).toBeOnTheScreen();
    expect(screen.getByText('🇪🇸 España +34')).toBeOnTheScreen();
    expect(screen.getByText('🇫🇷 Francia +33')).toBeOnTheScreen();
    expect(screen.getByText('🇵🇹 Portugal +351')).toBeOnTheScreen();
  });

  it('al pulsar una fila llama a onSelectCountry con el país correcto y cierra el modal', async () => {
    const user = userEvent.setup();
    const { props } = await renderCountryCodePicker();

    await openSheet(user, 'Cambiar prefijo de país, actual: España +34');
    await user.press(screen.getByRole('button', { name: 'Prefijo de Portugal +351' }));

    expect(props.onSelectCountry).toHaveBeenCalledTimes(1);
    expect(props.onSelectCountry).toHaveBeenCalledWith(PORTUGAL_COUNTRY);
    expect(screen.queryByText('Elige un país')).not.toBeOnTheScreen();
  });

  it('al pulsar el backdrop cierra el modal sin llamar a onSelectCountry', async () => {
    const user = userEvent.setup();
    const { props } = await renderCountryCodePicker();

    await openSheet(user, 'Cambiar prefijo de país, actual: España +34');
    expect(screen.getByText('Elige un país')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cerrar selector de prefijo de país' }));

    expect(props.onSelectCountry).not.toHaveBeenCalled();
    expect(screen.queryByText('Elige un país')).not.toBeOnTheScreen();
  });

  it('pulsar dentro del panel sin tocar una fila no cierra el modal', async () => {
    const user = userEvent.setup();
    const { props } = await renderCountryCodePicker();

    await openSheet(user, 'Cambiar prefijo de país, actual: España +34');
    await user.press(screen.getByText('Elige un país'));

    expect(screen.getByText('Elige un país')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Prefijo de Francia +33' })).toBeOnTheScreen();
    expect(props.onSelectCountry).not.toHaveBeenCalled();
  });

  it('cada fila tiene accessibilityRole "button" y accessibilityLabel correcto', async () => {
    const user = userEvent.setup();
    await renderCountryCodePicker();

    await openSheet(user, 'Cambiar prefijo de país, actual: España +34');

    for (const country of COUNTRIES) {
      const row = screen.getByRole('button', {
        name: `Prefijo de ${country.name} ${country.dialCode}`,
      });
      expect(row).toBeOnTheScreen();
      expect(row.props.accessibilityRole).toBe('button');
      expect(row.props.accessibilityLabel).toBe(`Prefijo de ${country.name} ${country.dialCode}`);
    }
  });

  it('si selectedCountry cambia por props con el modal cerrado, el trigger refleja el nuevo valor', async () => {
    const { renderResult } = await renderCountryCodePicker();

    expect(screen.getByText('🇪🇸 ES +34')).toBeOnTheScreen();

    await renderResult.rerender(<CountryCodePicker selectedCountry={FRANCE_COUNTRY} onSelectCountry={jest.fn()} />);

    expect(screen.getByText('🇫🇷 FR +33')).toBeOnTheScreen();
    expect(screen.queryByText('🇪🇸 ES +34')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Cambiar prefijo de país, actual: Francia +33' }),
    ).toBeOnTheScreen();
  });
});
