/// <reference types="jest" />
import { render, screen, userEvent } from '@testing-library/react-native';

import {
  IncidentMapFilterBar,
  type IncidentMapFilterBarProps,
} from '@/components/incident-map-filter-bar';
import type { Category } from '@/types/category';

const categories: Category[] = [
  { id: 'cat-1', name: 'Transporte' },
  { id: 'cat-2', name: 'Alumbrado público' },
];

// Construye las props por defecto del componente y permite sobreescribirlas.
async function renderFilterBar(overrides: Partial<IncidentMapFilterBarProps> = {}) {
  const props: IncidentMapFilterBarProps = {
    age: 'all',
    onAgeChange: jest.fn(),
    categories,
    selectedCategoryIds: [],
    onToggleCategory: jest.fn(),
    onClearCategories: jest.fn(),
    ...overrides,
  };

  await render(<IncidentMapFilterBar {...props} />);

  return { props };
}

// El chip "Todas" aparece dos veces: primero el de antigüedad (fila de chips) y
// después el de categorías (lista horizontal). Ambos son botones en ese orden.
function getAgeAllChip() {
  return screen.getAllByRole('button', { name: 'Todas' })[0];
}

function getCategoryAllChip() {
  return screen.getAllByRole('button', { name: 'Todas' })[1];
}

describe('IncidentMapFilterBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('chips de antigüedad', () => {
    it('muestra las opciones Todas, 7 días, 30 días y 90 días', async () => {
      await renderFilterBar();

      expect(screen.getAllByRole('button', { name: 'Todas' })).toHaveLength(2);
      expect(screen.getByRole('button', { name: '7 días' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '30 días' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '90 días' })).toBeOnTheScreen();
    });

    it.each([
      ['Todas', 'all'],
      ['7 días', '7d'],
      ['30 días', '30d'],
      ['90 días', '90d'],
    ] as const)('al pulsar "%s" llama a onAgeChange con "%s"', async (label, expectedAge) => {
      const user = userEvent.setup();
      // Parte de un filtro distinto al esperado para que la pulsación sea un cambio real.
      const initialAge = expectedAge === 'all' ? '30d' : 'all';
      const { props } = await renderFilterBar({ age: initialAge });

      const chip =
        label === 'Todas' ? getAgeAllChip() : screen.getByRole('button', { name: label });
      await user.press(chip);

      expect(props.onAgeChange).toHaveBeenCalledTimes(1);
      expect(props.onAgeChange).toHaveBeenCalledWith(expectedAge);
    });

    it.each([
      ['all', 'Todas'],
      ['7d', '7 días'],
      ['30d', '30 días'],
      ['90d', '90 días'],
    ] as const)('con age="%s" solo el chip "%s" está seleccionado', async (activeAge, activeLabel) => {
      await renderFilterBar({ age: activeAge });

      const ageLabels = ['Todas', '7 días', '30 días', '90 días'];
      const ageChips = ageLabels.map((label) =>
        label === 'Todas'
          ? getAgeAllChip()
          : screen.getByRole('button', { name: label }),
      );

      ageChips.forEach((chip, index) => {
        if (ageLabels[index] === activeLabel) {
          expect(chip).toBeSelected();
        } else {
          expect(chip).not.toBeSelected();
        }
      });
    });
  });

  describe('chips de categorías', () => {
    it('muestra el chip "Todas" seguido de una opción por cada categoría', async () => {
      await renderFilterBar();

      expect(screen.getByRole('button', { name: 'Transporte' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Alumbrado público' })).toBeOnTheScreen();
      expect(getCategoryAllChip()).toBeOnTheScreen();
    });

    it('al pulsar una categoría llama a onToggleCategory con su id', async () => {
      const user = userEvent.setup();
      const { props } = await renderFilterBar();

      await user.press(screen.getByRole('button', { name: 'Alumbrado público' }));

      expect(props.onToggleCategory).toHaveBeenCalledTimes(1);
      expect(props.onToggleCategory).toHaveBeenCalledWith('cat-2');
      expect(props.onClearCategories).not.toHaveBeenCalled();
    });

    it('al pulsar "Todas" de categorías llama a onClearCategories y no a onToggleCategory', async () => {
      const user = userEvent.setup();
      const { props } = await renderFilterBar({ selectedCategoryIds: ['cat-1'] });

      await user.press(getCategoryAllChip());

      expect(props.onClearCategories).toHaveBeenCalledTimes(1);
      expect(props.onToggleCategory).not.toHaveBeenCalled();
    });

    it('"Todas" de categorías está seleccionado solo cuando no hay categorías seleccionadas', async () => {
      await renderFilterBar({ selectedCategoryIds: [] });

      expect(getCategoryAllChip()).toBeSelected();
      expect(screen.getByRole('button', { name: 'Transporte' })).not.toBeSelected();
      expect(screen.getByRole('button', { name: 'Alumbrado público' })).not.toBeSelected();
    });

    it('"Todas" de categorías no está seleccionado si hay alguna categoría seleccionada', async () => {
      await renderFilterBar({ selectedCategoryIds: ['cat-1'] });

      expect(getCategoryAllChip()).not.toBeSelected();
      expect(screen.getByRole('button', { name: 'Transporte' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'Alumbrado público' })).not.toBeSelected();
    });

    it('marca como seleccionadas todas las categorías incluidas en selectedCategoryIds', async () => {
      await renderFilterBar({ selectedCategoryIds: ['cat-1', 'cat-2'] });

      expect(screen.getByRole('button', { name: 'Transporte' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'Alumbrado público' })).toBeSelected();
      expect(getCategoryAllChip()).not.toBeSelected();
    });

    it('sin categorías muestra solo el chip "Todas" de categorías', async () => {
      await renderFilterBar({ categories: [] });

      // Los chips de antigüedad siguen presentes; de categorías solo queda "Todas".
      expect(screen.getAllByRole('button', { name: 'Todas' })).toHaveLength(2);
      expect(screen.queryByRole('button', { name: 'Transporte' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Alumbrado público' })).toBeNull();
      expect(getCategoryAllChip()).toBeSelected();
    });
  });
});
