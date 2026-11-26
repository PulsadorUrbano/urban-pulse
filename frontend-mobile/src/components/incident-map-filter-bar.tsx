import { FlatList, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/types/category';
import type { IncidentAgeFilter } from '@/types/incident-map';
import { getCategoryColor } from '@/utils/map/category-colors';

export interface IncidentMapFilterBarProps {
  age: IncidentAgeFilter;
  onAgeChange: (age: IncidentAgeFilter) => void;
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onClearCategories: () => void;
}

const AGE_OPTIONS: readonly { value: IncidentAgeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  dotColor?: string;
}

// Chip flotante reutilizable: resalta el seleccionado y admite un punto de color.
function FilterChip({ label, selected, onPress, dotColor }: FilterChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full px-3 py-2 active:opacity-70"
      style={{ backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement }}>
      {dotColor !== undefined ? (
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}
      <ThemedText type={selected ? 'smallBold' : 'small'}>{label}</ThemedText>
    </Pressable>
  );
}

// Barra de chips flotantes sobre el mapa: antigüedad y categorías.
export function IncidentMapFilterBar({
  age,
  onAgeChange,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onClearCategories,
}: IncidentMapFilterBarProps) {
  const categoryChips: (Category | null)[] = [null, ...categories];

  return (
    <View className="gap-2" testID="incident-map-filter-bar">
      <View className="flex-row flex-wrap gap-2 px-4">
        {AGE_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={age === option.value}
            onPress={() => onAgeChange(option.value)}
          />
        ))}
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categoryChips}
        keyExtractor={(item) => item?.id ?? 'all-categories'}
        contentContainerClassName="gap-2 px-4"
        renderItem={({ item }) =>
          item === null ? (
            <FilterChip
              label="Todas"
              selected={selectedCategoryIds.length === 0}
              onPress={onClearCategories}
            />
          ) : (
            <FilterChip
              label={item.name}
              selected={selectedCategoryIds.includes(item.id)}
              onPress={() => onToggleCategory(item.id)}
              dotColor={getCategoryColor(item.name)}
            />
          )
        }
      />
    </View>
  );
}
