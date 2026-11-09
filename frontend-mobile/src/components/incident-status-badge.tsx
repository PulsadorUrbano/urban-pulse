import { Text, View } from 'react-native';

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

// Color de fondo por estado; decisión visual propia (sin requisito de la spec
// más allá de distinguir estados). Todos combinan con texto blanco.
export const STATUS_COLORS: Record<IncidentStatus, string> = {
  reported: '#6b7280', // gris: recién reportada, sin revisar todavía
  validated: '#2563eb', // azul: confirmada por el ayuntamiento
  rejected: '#dc2626', // rojo: descartada
  assigned: '#4f46e5', // índigo: asignada a un equipo/técnico
  in_progress: '#d97706', // ámbar: en curso de resolución
  resolved: '#16a34a', // verde: resuelta
  reopened: '#9333ea', // morado: reabierta tras una resolución previa
  closed: '#334155', // gris pizarra: cerrada definitivamente
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
      style={{ backgroundColor: STATUS_COLORS[status] }}>
      <Text className="text-xs font-semibold text-white">{STATUS_LABELS[status]}</Text>
    </View>
  );
}
