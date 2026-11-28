import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { MapIncident } from '@/types/incident-map';
import { getCategoryColor } from '@/utils/map/category-colors';

export interface IncidentMapMarkerProps {
  incident: MapIncident;
  onPress: (incident: MapIncident) => void;
}

// Marcador circular coloreado según la categoría de la incidencia.
export function IncidentMapMarker({ incident, onPress }: IncidentMapMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
      onPress={() => onPress(incident)}
      // Vista estática: evita re-renderizar el marcador en cada frame del mapa.
      tracksViewChanges={false}
      accessibilityLabel={incident.title}>
      {/* El color es dinámico por categoría, por eso solo backgroundColor va en style. */}
      <View
        className="h-6 w-6 rounded-full border-2 border-white"
        style={{ backgroundColor: getCategoryColor(incident.category) }}
      />
    </Marker>
  );
}
