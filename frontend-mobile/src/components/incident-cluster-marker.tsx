import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { ClusterItem } from '@/utils/map/incident-clusters';

export interface IncidentClusterMarkerProps {
  cluster: ClusterItem;
  onPress: (cluster: ClusterItem) => void;
}

// Burbuja que agrupa varias incidencias cercanas y muestra cuántas son.
export function IncidentClusterMarker({ cluster, onPress }: IncidentClusterMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={false}
      accessibilityLabel={`${cluster.count} incidencias agrupadas`}>
      <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600">
        <Text className="text-sm font-bold text-white">{cluster.count}</Text>
      </View>
    </Marker>
  );
}
