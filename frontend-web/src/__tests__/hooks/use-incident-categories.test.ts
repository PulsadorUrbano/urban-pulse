import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useIncidentCategories } from '../../hooks/use-incident-categories';
import type { IncidentCategory } from '../../types/incident';
import { createHookHarness, deferred, flushPromises } from './hook-harness';

const mocks = vi.hoisted(() => ({
  useState: vi.fn(), useMemo: vi.fn(), useEffect: vi.fn(), fetchIncidentCategories: vi.fn(),
}));
vi.mock('react', () => ({
  useState: mocks.useState, useMemo: mocks.useMemo, useEffect: mocks.useEffect,
}));
vi.mock('../../services/incident.service', () => ({ fetchIncidentCategories: mocks.fetchIncidentCategories }));

let harness: ReturnType<typeof createHookHarness>;
beforeEach(() => {
  vi.clearAllMocks();
  harness = createHookHarness();
  mocks.useState.mockImplementation(harness.useState);
  mocks.useMemo.mockImplementation(harness.useMemo);
  mocks.useEffect.mockImplementation(harness.useEffect);
});
afterEach(() => harness.unmount());

it('carga el catálogo solo cuando está habilitado', async () => {
  const categories = [{ id: 'cat-1', name: 'Iluminación', createdAt: '2026-11-25T10:00:00Z' }];
  mocks.fetchIncidentCategories.mockResolvedValueOnce(categories);
  expect(harness.render(() => useIncidentCategories(false)).loading).toBe(false);
  expect(mocks.fetchIncidentCategories).not.toHaveBeenCalled();
  expect(harness.render(() => useIncidentCategories(true)).loading).toBe(true);
  await flushPromises();
  expect(harness.render(() => useIncidentCategories(true)).items).toEqual(categories);
  expect(mocks.fetchIncidentCategories).toHaveBeenCalledTimes(1);
});

it('un fallo permite reintentar el catálogo sin crear datos ficticios', async () => {
  mocks.fetchIncidentCategories.mockRejectedValueOnce(new Error('Sin catálogo'));
  harness.render(() => useIncidentCategories(true));
  await flushPromises();
  let result = harness.render(() => useIncidentCategories(true));
  expect(result.items).toEqual([]);
  expect(result.error).toBe('Sin catálogo');
  mocks.fetchIncidentCategories.mockResolvedValueOnce([]);
  result.retry();
  expect(harness.render(() => useIncidentCategories(true)).loading).toBe(true);
  await flushPromises();
  result = harness.render(() => useIncidentCategories(true));
  expect(result.error).toBeNull();
  expect(result.loading).toBe(false);
});

it('ignora la carga pendiente cuando se deshabilita', async () => {
  const response = deferred<IncidentCategory[]>();
  mocks.fetchIncidentCategories.mockReturnValueOnce(response.promise);
  harness.render(() => useIncidentCategories(true));
  harness.render(() => useIncidentCategories(false));
  response.resolve([{ id: 'cat-1', name: 'Iluminación', createdAt: '2026-11-25T10:00:00Z' }]);
  await flushPromises();
  expect(harness.render(() => useIncidentCategories(false)).items).toEqual([]);
});
