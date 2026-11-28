import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { MapIncident } from '@/types/incident-map';
import type { LocationCoordinates } from '@/types/location';

export interface IncidentMapProps {
  incidents: MapIncident[];
  onSelectIncident: (incident: MapIncident) => void;
  focusCoordinates?: LocationCoordinates | null;
}

// Variante web: react-native-maps no está soportado, se muestra un aviso.
export function IncidentMap(_props: IncidentMapProps) {
  return (
    <ThemedView className="flex-1 items-center justify-center p-6">
      <ThemedText className="text-center">Mapa disponible solo en la app móvil</ThemedText>
    </ThemedView>
  );
}
