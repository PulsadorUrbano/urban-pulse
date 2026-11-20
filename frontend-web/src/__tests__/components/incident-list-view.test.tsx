import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

import { IncidentListView } from '../../components/incident-list-view';
import type { BackendUser } from '../../types/user';

const useIncidentList = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-incident-list', () => ({ useIncidentList }));

const user: BackendUser = {
  id: 'usuario-prueba',
  username: 'operador',
  email: 'operador@example.test',
  role: 'admin',
  source: 'backend',
  phone: null,
};

beforeEach(() => {
  useIncidentList.mockReset();
  useIncidentList.mockReturnValue({
    items: [{ id: 'incidencia-prueba', title: 'Farola apagada', status: 'reported', createdAt: '2026-11-20T10:00:00Z' }],
    hasMore: true,
    loading: false,
    error: null,
  });
});

function renderList(role: BackendUser['role']): string {
  return renderToStaticMarkup(
    <IncidentListView
      user={{ ...user, role }}
      token="token-prueba"
      isDarkMode={false}
      onToggleTheme={vi.fn()}
      onLogout={vi.fn()}
      onOpenIncident={vi.fn()}
    />,
  );
}

it.each(['admin', 'administrative'] as const)('carga el listado con el token para el rol %s', (role) => {
  const list = renderList(role);

  expect(useIncidentList).toHaveBeenCalledExactlyOnceWith('token-prueba');
  expect(list).toContain('Farola apagada');
});

it.each(['department', 'team', 'technician', 'analyst'] as const)(
  'restringe el listado global para el rol %s aunque tenga token',
  (role) => {
    const list = renderList(role);

    expect(useIncidentList).toHaveBeenCalledExactlyOnceWith(null);
    expect(list).toContain('El listado de incidencias está disponible para administración');
    expect(list).not.toContain('Farola apagada');
    expect(list).not.toContain('Cargar más');
  },
);
