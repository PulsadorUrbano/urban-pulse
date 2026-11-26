import { cssInterop } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';
import MapView from 'react-native-maps';

import { IncidentClusterMarker } from '@/components/incident-cluster-marker';
import { IncidentMapMarker } from '@/components/incident-map-marker';
import type { MapIncident } from '@/types/incident-map';
import type { LocationCoordinates } from '@/types/location';
import {
  buildIncidentClusterIndex,
  getClusterExpansionZoom,
  getClustersForRegion,
  getRegionForZoom,
  type ClusterItem,
  type MapRegion,
} from '@/utils/map/incident-clusters';

export interface IncidentMapProps {
  incidents: MapIncident[];
  onSelectIncident: (incident: MapIncident) => void;
  focusCoordinates?: LocationCoordinates | null;
}

// Región inicial: centro de Málaga.
export const INITIAL_MAP_REGION: MapRegion = {
  latitude: 36.7213,
  longitude: -4.4214,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// NativeWind v4 solo aplica `className` a componentes registrados con cssInterop
// (los core de RN). MapView no lo está, así que sin esto ignoraría `className="flex-1"`
// y el mapa quedaría sin tamaño.
cssInterop(MapView, { className: 'style' });

const FOCUS_DELTA = 0.01;
const ANIMATION_DURATION_MS = 400;

// Mapa a pantalla completa con incidencias agrupadas en clusters.
export function IncidentMap({
  incidents,
  onSelectIncident,
  focusCoordinates = null,
}: IncidentMapProps) {
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(INITIAL_MAP_REGION);

  const clusterIndex = useMemo(() => buildIncidentClusterIndex(incidents), [incidents]);
  const mapItems = useMemo(
    () => getClustersForRegion(clusterIndex, currentRegion),
    [clusterIndex, currentRegion],
  );

  // Centra el mapa cuando cambian las coordenadas a enfocar.
  useEffect(() => {
    if (!focusCoordinates) return;
    mapRef.current?.animateToRegion(
      {
        latitude: focusCoordinates.latitude,
        longitude: focusCoordinates.longitude,
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA,
      },
      ANIMATION_DURATION_MS,
    );
  }, [focusCoordinates]);

  // Al pulsar un cluster se acerca hasta el zoom en que se separa en sus hijos.
  const handleClusterPress = (cluster: ClusterItem) => {
    const expansionZoom = getClusterExpansionZoom(clusterIndex, cluster.id);
    mapRef.current?.animateToRegion(
      getRegionForZoom(cluster, expansionZoom, currentRegion),
      ANIMATION_DURATION_MS,
    );
  };

  return (
    <MapView
      ref={mapRef}
      className="flex-1"
      initialRegion={INITIAL_MAP_REGION}
      onRegionChangeComplete={setCurrentRegion}
      showsUserLocation>
      {mapItems.map((item) =>
        item.type === 'cluster' ? (
          <IncidentClusterMarker
            key={`cluster-${item.id}`}
            cluster={item}
            onPress={handleClusterPress}
          />
        ) : (
          <IncidentMapMarker
            key={item.incident.id}
            incident={item.incident}
            onPress={onSelectIncident}
          />
        ),
      )}
    </MapView>
  );
}
