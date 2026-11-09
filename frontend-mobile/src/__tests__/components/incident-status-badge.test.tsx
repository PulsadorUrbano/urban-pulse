/// <reference types="jest" />
import { render, screen } from '@testing-library/react-native';

import { IncidentStatusBadge, STATUS_LABELS } from '@/components/incident-status-badge';
import { type IncidentStatus } from '@/types/incident';

const ALL_INCIDENT_STATUSES: IncidentStatus[] = [
  'reported',
  'rejected',
  'validated',
  'assigned',
  'in_progress',
  'resolved',
  'reopened',
  'closed',
];

describe('IncidentStatusBadge', () => {
  it.each(ALL_INCIDENT_STATUSES)(
    'muestra la etiqueta exacta de STATUS_LABELS para el estado "%s"',
    async (status) => {
      await render(<IncidentStatusBadge status={status} />);

      expect(screen.getByText(STATUS_LABELS[status])).toBeOnTheScreen();
    }
  );

  it.each([
    ['reported', 'Reportada'],
    ['rejected', 'Rechazada'],
    ['validated', 'Validada'],
    ['assigned', 'Asignada'],
    ['in_progress', 'En curso'],
    ['resolved', 'Resuelta'],
    ['reopened', 'Reabierta'],
    ['closed', 'Cerrada'],
  ] as const)('el estado "%s" se muestra como texto "%s"', async (status, expectedLabel) => {
    await render(<IncidentStatusBadge status={status} />);

    expect(screen.getByText(expectedLabel)).toBeOnTheScreen();
  });
});
