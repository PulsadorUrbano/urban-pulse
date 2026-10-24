/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';

import { IncidentListItem } from '@/components/incident-list-item';
import { STATUS_LABELS } from '@/components/incident-status-badge';
import { type IncidentSummary } from '@/types/incident';

const incidentSummaryFixture: IncidentSummary = {
  id: 'incident-42',
  title: 'Farola fundida en la calle Mayor',
  status: 'in_progress',
  createdAt: '2026-10-24T10:30:00.000Z',
};

describe('IncidentListItem', () => {
  it('muestra el título de la incidencia', async () => {
    await render(<IncidentListItem incident={incidentSummaryFixture} onPress={jest.fn()} />);

    expect(screen.getByText(incidentSummaryFixture.title)).toBeOnTheScreen();
  });

  it('muestra la etiqueta de estado exacta de STATUS_LABELS', async () => {
    await render(<IncidentListItem incident={incidentSummaryFixture} onPress={jest.fn()} />);

    expect(screen.getByText(STATUS_LABELS[incidentSummaryFixture.status])).toBeOnTheScreen();
  });

  it('muestra un texto de fecha no vacío derivado de createdAt', async () => {
    await render(<IncidentListItem incident={incidentSummaryFixture} onPress={jest.fn()} />);

    // Comprobación de presencia: no se valida el formato carácter a carácter.
    expect(screen.getByText(/\d{2}\/\d{2}\/\d{4}/)).toBeOnTheScreen();
  });

  it('al pulsar llama a onPress exactamente una vez con el id de la incidencia', async () => {
    const onPress = jest.fn();
    await render(<IncidentListItem incident={incidentSummaryFixture} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(incidentSummaryFixture.id);
  });
});
