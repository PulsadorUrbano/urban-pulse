import { Pressable, Text, View } from 'react-native';

import { IncidentStatusBadge } from '@/components/incident-status-badge';
import { type IncidentSummary } from '@/types/incident';

export interface IncidentListItemProps {
  incident: IncidentSummary;
  onPress: (id: string) => void;
}

// Formatea una fecha ISO como DD/MM/AAAA; no existe ningún formateador
// equivalente reutilizable en src/utils/, así que se define aquí mismo,
// mínimo y sin dependencias nuevas de fechas.
function formatIncidentDate(isoDate: string): string {
  const parsedDate = new Date(isoDate);
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();
  return `${day}/${month}/${year}`;
}

// Fila presentacional de una incidencia en el listado "Mis incidencias".
// No navega por sí misma: delega en onPress, igual que LogoutButton.
export function IncidentListItem({ incident, onPress }: IncidentListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(incident.id)}
      className="flex-row items-center justify-between rounded-xl bg-white px-4 py-3 active:opacity-70">
      <View className="flex-1 pr-3">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {incident.title}
        </Text>
        <Text className="mt-1 text-sm text-gray-500">{formatIncidentDate(incident.createdAt)}</Text>
      </View>
      <IncidentStatusBadge status={incident.status} />
    </Pressable>
  );
}
