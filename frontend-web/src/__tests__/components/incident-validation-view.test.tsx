import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import { IncidentValidationView } from '../../components/incident-validation-view';
import type { IncidentDetail } from '../../types/incident';
import type { SessionUser } from '../../types/user';

const user: SessionUser = {
  id: 'usuario-prueba',
  username: 'admin',
  email: 'admin@example.test',
  role: 'admin',
  source: 'backend',
  phone: null,
};

const incident: Omit<IncidentDetail, 'status'> = {
  id: 'incidencia-prueba',
  title: 'Farola apagada',
  description: null,
  civicId: 'ciudadano-prueba',
  categoryId: null,
  category: null,
  urbanAssetId: null,
  departmentId: null,
  teamId: null,
  technicianId: null,
  location: { latitude: null, longitude: null, accuracy: null, createdAt: '2026-11-20T10:00:00Z' },
  images: [],
  priority: 'high',
  createdAt: '2026-11-20T10:00:00Z',
};

const useIncidentValidation = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-incident-validation', () => ({ useIncidentValidation }));
vi.mock('../../components/resolution-form', () => ({
  ResolutionForm: () => <button type="button">Validar incidencia</button>,
}));

function renderDetail(sessionUser: SessionUser = user): string {
  return renderToStaticMarkup(
    <IncidentValidationView
      incidentId={incident.id}
      user={sessionUser}
      token="token-prueba"
      isDarkMode={false}
      onToggleTheme={vi.fn()}
      onLogout={vi.fn()}
    />,
  );
}

it('muestra el estado y la prioridad guardada de una incidencia resuelta', () => {
  useIncidentValidation.mockReturnValue({ incident: { ...incident, status: 'resolved' }, loading: false });

  const detail = renderDetail();

  expect(detail).toMatch(/<dd[^>]*>Resuelta<\/dd>/);
  expect(detail).toMatch(/<dd[^>]*>Alta<\/dd>/);
  expect(detail).not.toContain('assignment-heading');
});

it('muestra la asignación de una reabierta solo al personal de administración', () => {
  useIncidentValidation.mockReturnValue({ incident: { ...incident, status: 'reopened' }, loading: false });

  expect(renderDetail()).toContain('id="assignment-heading"');
  expect(renderDetail({ ...user, role: 'administrative' })).toContain('id="assignment-heading"');
  expect(renderDetail({ ...user, role: 'department' })).not.toContain('assignment-heading');
});

it('conserva el detalle de un perfil de departamento y oculta el formulario de validación', () => {
  useIncidentValidation.mockReturnValue({ incident: { ...incident, status: 'reported' }, loading: false });

  const detail = renderDetail({ ...user, role: 'department' });

  expect(useIncidentValidation).toHaveBeenLastCalledWith(incident.id, 'token-prueba');
  expect(detail).toContain('Farola apagada');
  expect(detail).not.toContain('Validar incidencia');
  expect(renderDetail()).toContain('Validar incidencia');
});
