import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import { IncidentAssignmentView } from '../../components/incident-assignment-view';
import { loadMockAssignment, MOCK_INCIDENT_ID } from '../../mocks/assignment-mock';

it('muestra indicaciones en los campos obligatorios y conserva la opción de quitar el técnico', () => {
  const { incident, options } = loadMockAssignment(MOCK_INCIDENT_ID);
  const form = renderToStaticMarkup(
    <IncidentAssignmentView incident={incident} mode={{ demoOptions: options }} onSaved={vi.fn()} />,
  );

  expect(form).toMatch(/<option[^>]*disabled=""[^>]*>Selecciona departamento<\/option>/);
  expect(form).toMatch(/<option[^>]*disabled=""[^>]*>Selecciona equipo<\/option>/);
  expect(form).toMatch(/<option value="" selected="">Sin asignar<\/option>/);
  expect(form).toMatch(/<button[^>]*disabled=""[^>]*>Guardar asignación<\/button>/);
});
