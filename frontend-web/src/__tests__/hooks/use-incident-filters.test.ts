import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useIncidentFilters } from '../../hooks/use-incident-filters';
import { DEFAULT_INCIDENT_FILTERS } from '../../utils/incident-filters';
import { createHookHarness } from './hook-harness';

const mocks = vi.hoisted(() => ({
  useState: vi.fn(), useMemo: vi.fn(), useEffect: vi.fn(), useIncidentList: vi.fn(),
}));
vi.mock('react', () => ({
  useState: mocks.useState, useMemo: mocks.useMemo, useEffect: mocks.useEffect,
}));
vi.mock('../../hooks/use-incident-list', () => ({ useIncidentList: mocks.useIncidentList }));

let harness: ReturnType<typeof createHookHarness>;
beforeEach(() => {
  vi.clearAllMocks();
  harness = createHookHarness();
  mocks.useState.mockImplementation(harness.useState);
  mocks.useMemo.mockImplementation(harness.useMemo);
  mocks.useEffect.mockImplementation(harness.useEffect);
  mocks.useIncidentList.mockReturnValue({
    items: [{ id: 'a', title: 'Farola', status: 'reported', createdAt: '2026-11-25T10:00:00Z' }],
    hasMore: true, loading: false, error: null, reload: vi.fn(),
  });
});
afterEach(() => harness.unmount());

it('envía prioridad/categoría al listado sin descartar resúmenes que no incluyen esos campos', () => {
  let result = harness.render(() => useIncidentFilters('token'));
  result.setPriority('high');
  result = harness.render(() => useIncidentFilters('token'));
  result.setCategory('categoría-1');
  result = harness.render(() => useIncidentFilters('token'));
  expect(mocks.useIncidentList).toHaveBeenLastCalledWith('token', { priority: 'high', categoryId: 'categoría-1' });
  expect(result.visibleItems.map(({ id }) => id)).toEqual(['a']);
  expect(result.isActive).toBe(true);
  expect(result.isPartial).toBe(false);
});

it('conserva estado/fecha/orden al cambiar prioridad y categoría y limpia todos los criterios', () => {
  let result = harness.render(() => useIncidentFilters('token'));
  result.setStatus('validated');
  result.setOrder('oldest');
  result.setFrom('2026-11-01');
  result.setTo('2026-11-30');
  result.setPriority('medium');
  result.setCategory('categoría-2');
  result = harness.render(() => useIncidentFilters('token'));
  expect(result.filters).toEqual({
    status: 'validated', order: 'oldest', from: '2026-11-01', to: '2026-11-30',
    priority: 'medium', categoryId: 'categoría-2',
  });
  expect(result.visibleItems).toEqual([]);
  expect(result.isPartial).toBe(true);
  result.reset();
  result = harness.render(() => useIncidentFilters('token'));
  expect(result.filters).toEqual(DEFAULT_INCIDENT_FILTERS);
  expect(result.isActive).toBe(false);
  expect(result.reload).toHaveBeenCalledTimes(1);
  expect(mocks.useIncidentList).toHaveBeenLastCalledWith('token', { priority: undefined, categoryId: undefined });
});

it('todas y prioridad desconocida omiten filtros del servidor', () => {
  let result = harness.render(() => useIncidentFilters('token'));
  result.setPriority('urgent');
  result.setCategory('');
  result = harness.render(() => useIncidentFilters('token'));
  expect(result.filters.priority).toBe('all');
  expect(result.filters.categoryId).toBeNull();
  expect(mocks.useIncidentList).toHaveBeenLastCalledWith('token', { priority: undefined, categoryId: undefined });
});
