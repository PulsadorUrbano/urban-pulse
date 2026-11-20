import { Text, View } from 'react-native';

import { IncidentStatusColors } from '@/constants/theme';
import { type IncidentStatus } from '@/types/incident';

// Etiqueta en español exacta para cada estado de incidencia (ver spec.md).
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reportada',
  validated: 'Validada',
  rejected: 'Rechazada',
  assigned: 'Asignada',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  reopened: 'Reabierta',
  closed: 'Cerrada',
};

export interface IncidentStatusBadgeProps {
  status: IncidentStatus;
}

// Pastilla presentacional pura que muestra el estado de una incidencia.
// No depende de sesión, red ni alertas: solo pinta el `status` recibido.
export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps) {
  return (
    <View
      className="self-start rounded-full px-3 py-1"
      style={{ backgroundColor: IncidentStatusColors[status] }}>
      <Text className="text-xs font-semibold text-white">{STATUS_LABELS[status]}</Text>
    </View>
  );
}
