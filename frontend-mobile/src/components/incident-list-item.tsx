import { Pressable, View } from 'react-native';

import { IncidentStatusBadge } from '@/components/incident-status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
      className="active:opacity-70">
      <ThemedView type="backgroundElement" className="flex-row items-center justify-between rounded-xl px-4 py-3">
        <View className="flex-1 pr-3">
          <ThemedText type="default" style={{ fontWeight: '600' }} numberOfLines={1}>
            {incident.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '400' }} className="mt-1">
            {formatIncidentDate(incident.createdAt)}
          </ThemedText>
        </View>
        <IncidentStatusBadge status={incident.status} />
      </ThemedView>
    </Pressable>
  );
}
