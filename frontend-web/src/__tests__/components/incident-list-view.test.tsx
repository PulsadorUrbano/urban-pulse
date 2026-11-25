import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

import { IncidentListView } from '../../components/incident-list-view';
import type { BackendUser } from '../../types/user';

const useIncidentList = vi.hoisted(() => vi.fn());
const useIncidentCategories = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/use-incident-list', () => ({ useIncidentList }));
vi.mock('../../hooks/use-incident-categories', () => ({ useIncidentCategories }));

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
  useIncidentCategories.mockReset();
  useIncidentCategories.mockReturnValue({
    items: [{ id: 'cat-1', name: 'Iluminación', createdAt: '2026-11-25T10:00:00Z' }],
    loading: false, error: null, retry: vi.fn(),
  });
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

  expect(useIncidentList).toHaveBeenCalledExactlyOnceWith('token-prueba', {
    priority: undefined, categoryId: undefined,
  });
  expect(useIncidentCategories).toHaveBeenCalledExactlyOnceWith(true);
  expect(list).toContain('Farola apagada');
});

it.each(['department', 'team', 'technician', 'analyst'] as const)(
  'restringe el listado global para el rol %s aunque tenga token',
  (role) => {
    const list = renderList(role);

    expect(useIncidentList).toHaveBeenCalledExactlyOnceWith(null, {
      priority: undefined, categoryId: undefined,
    });
    expect(useIncidentCategories).toHaveBeenCalledExactlyOnceWith(false);
    expect(list).toContain('El listado de incidencias está disponible para administración');
    expect(list).not.toContain('Farola apagada');
    expect(list).not.toContain('Cargar más');
  },
);

it('muestra los selectores de prioridad y categoría con las opciones del catálogo', () => {
  const list = renderList('admin');
  expect(list).toContain('Todas las prioridades');
  expect(list).toContain('Todas las categorías');
  expect(list).toContain('Iluminación');
  expect(list).toContain('value="cat-1"');
  expect(list).not.toContain('Cargar más» para completar');
});

it('el fallo del catálogo mantiene el listado y ofrece un reintento independiente', () => {
  useIncidentCategories.mockReturnValue({ items: [], loading: false, error: 'Sin catálogo', retry: vi.fn() });
  const list = renderList('admin');
  expect(list).toContain('Sin catálogo');
  expect(list).toContain('Reintentar categorías');
  expect(list).toContain('Farola apagada');
  expect(list).toContain('Todas las prioridades');
  expect(list).toContain('Cargar más');
});

it('muestra la carga de categorías sin bloquear la lista de incidencias', () => {
  useIncidentCategories.mockReturnValue({ items: [], loading: true, error: null, retry: vi.fn() });
  const list = renderList('admin');
  expect(list).toContain('Cargando categorías');
  expect(list).toContain('aria-busy="true"');
  expect(list).toContain('Farola apagada');
});
