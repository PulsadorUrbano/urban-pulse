import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIncidentList } from '../../hooks/use-incident-list';
import type { IncidentPageFilters, IncidentSummary } from '../../types/incident';
import { createHookHarness, deferred, flushPromises } from './hook-harness';

const mocks = vi.hoisted(() => ({
  useState: vi.fn(), useMemo: vi.fn(), useEffect: vi.fn(), fetchIncidentPage: vi.fn(),
}));
vi.mock('react', () => ({
  useState: mocks.useState, useMemo: mocks.useMemo, useEffect: mocks.useEffect,
}));
vi.mock('../../services/incident.service', () => ({ fetchIncidentPage: mocks.fetchIncidentPage }));

type Page = { items: IncidentSummary[]; nextCursor: string | null };
const incident = (id: string): IncidentSummary => ({
  id, title: id, status: 'reported', createdAt: '2026-11-25T10:00:00Z',
});
let harness: ReturnType<typeof createHookHarness>;

beforeEach(() => {
  vi.clearAllMocks();
  harness = createHookHarness();
  mocks.useState.mockImplementation(harness.useState);
  mocks.useMemo.mockImplementation(harness.useMemo);
  mocks.useEffect.mockImplementation(harness.useEffect);
});
afterEach(() => harness.unmount());

describe('consulta paginada por prioridad y categoría', () => {
  it('acumula páginas conservando criterios y no recarga por un objeto equivalente', async () => {
    const filters: IncidentPageFilters = { priority: 'high', categoryId: 'categoría-1' };
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'segunda' });
    let result = harness.render(() => useIncidentList('token', filters));
    expect(result.loading).toBe(true);
    await flushPromises();
    result = harness.render(() => useIncidentList('token', { ...filters }));
    expect(mocks.fetchIncidentPage).toHaveBeenCalledTimes(1);
    expect(result.items.map(({ id }) => id)).toEqual(['a']);

    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('b')], nextCursor: null });
    result.loadMore();
    result = harness.render(() => useIncidentList('token', filters));
    expect(result.loading).toBe(true);
    expect(result.items.map(({ id }) => id)).toEqual(['a']);
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', 'segunda', filters);
    await flushPromises();
    result = harness.render(() => useIncidentList('token', filters));
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(result.hasMore).toBe(false);
    result.loadMore();
    expect(mocks.fetchIncidentPage).toHaveBeenCalledTimes(2);
  });

  it('cambiar criterios reinicia cursor y oculta filas anteriores antes de recibir resultados', async () => {
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'otra' });
    harness.render(() => useIncidentList('token', { priority: 'high' }));
    await flushPromises();
    harness.render(() => useIncidentList('token', { priority: 'high' }));
    const pending = deferred<Page>();
    mocks.fetchIncidentPage.mockReturnValueOnce(pending.promise);
    let result = harness.render(() => useIncidentList('token', { priority: 'low' }));
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.loading).toBe(true);
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', undefined, {
      priority: 'low', categoryId: undefined,
    });
    pending.resolve({ items: [incident('b')], nextCursor: null });
    await flushPromises();
    result = harness.render(() => useIncidentList('token', { priority: 'low' }));
    expect(result.items.map(({ id }) => id)).toEqual(['b']);
  });

  it.each<[IncidentPageFilters, IncidentPageFilters]>([
    [{ status: 'reported' }, { status: 'assigned' }],
    [{ from: '2026-11-01' }, { from: '2026-11-01', to: '2026-11-15' }],
    [{}, { order: 'oldest' }],
  ])('cambiar estado, fechas u orden vuelve a pedir la primera página con el criterio nuevo: %j -> %j', async (
    before,
    after,
  ) => {
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'segunda' });
    harness.render(() => useIncidentList('token', before));
    await flushPromises();
    harness.render(() => useIncidentList('token', before));
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('b')], nextCursor: null });
    let result = harness.render(() => useIncidentList('token', after));
    expect(result.items).toEqual([]);
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', undefined, expect.objectContaining(after));
    await flushPromises();
    result = harness.render(() => useIncidentList('token', after));
    expect(result.items.map(({ id }) => id)).toEqual(['b']);
  });

  it('ignora una página anterior que llega después de cambiar los filtros', async () => {
    const oldPage = deferred<Page>();
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'otra' });
    harness.render(() => useIncidentList('token', { priority: 'high' }));
    await flushPromises();
    let result = harness.render(() => useIncidentList('token', { priority: 'high' }));
    mocks.fetchIncidentPage.mockReturnValueOnce(oldPage.promise);
    result.loadMore();
    harness.render(() => useIncidentList('token', { priority: 'high' }));
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('nueva')], nextCursor: null });
    harness.render(() => useIncidentList('token', { categoryId: 'categoría-2' }));
    await flushPromises();
    oldPage.resolve({ items: [incident('antigua')], nextCursor: 'obsoleto' });
    await flushPromises();
    result = harness.render(() => useIncidentList('token', { categoryId: 'categoría-2' }));
    expect(result.items.map(({ id }) => id)).toEqual(['nueva']);
    expect(result.hasMore).toBe(false);
  });

  it('un error de otra búsqueda no sustituye el resultado vigente', async () => {
    const oldPage = deferred<Page>();
    mocks.fetchIncidentPage.mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({ items: [incident('nueva')], nextCursor: null });
    harness.render(() => useIncidentList('token', { priority: 'high' }));
    harness.render(() => useIncidentList('token', { priority: 'low' }));
    await flushPromises();
    oldPage.reject(new Error('Error antiguo'));
    await flushPromises();
    const result = harness.render(() => useIncidentList('token', { priority: 'low' }));
    expect(result.error).toBeNull();
    expect(result.items.map(({ id }) => id)).toEqual(['nueva']);
  });

  it('reintenta la página fallida sin duplicar las páginas ya cargadas', async () => {
    const filters: IncidentPageFilters = { priority: 'medium' };
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'segunda' });
    harness.render(() => useIncidentList('token', filters));
    await flushPromises();
    let result = harness.render(() => useIncidentList('token', filters));
    mocks.fetchIncidentPage.mockRejectedValueOnce(new Error('Sin conexión'));
    result.loadMore();
    harness.render(() => useIncidentList('token', filters));
    await flushPromises();
    result = harness.render(() => useIncidentList('token', filters));
    expect(result.error).toBe('Sin conexión');
    expect(result.items.map(({ id }) => id)).toEqual(['a']);
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('b')], nextCursor: null });
    result.retry();
    harness.render(() => useIncidentList('token', filters));
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', 'segunda', {
      priority: 'medium', categoryId: undefined,
    });
    await flushPromises();
    result = harness.render(() => useIncidentList('token', filters));
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(result.error).toBeNull();
  });

  it('limpiar filtros pide la primera página y no reutiliza un cursor filtrado', async () => {
    mocks.fetchIncidentPage.mockResolvedValue({ items: [], nextCursor: null });
    harness.render(() => useIncidentList('token', { priority: 'high', categoryId: 'categoría-1' }));
    await flushPromises();
    harness.render(() => useIncidentList('token'));
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', undefined, {
      priority: undefined, categoryId: undefined,
    });
  });

  it('reiniciar vuelve a la primera página incluso con los mismos filtros de servidor', async () => {
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'segunda' });
    harness.render(() => useIncidentList('token'));
    await flushPromises();
    let result = harness.render(() => useIncidentList('token'));
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('b')], nextCursor: null });
    result.loadMore();
    harness.render(() => useIncidentList('token'));
    await flushPromises();
    result = harness.render(() => useIncidentList('token'));
    expect(result.items.map(({ id }) => id)).toEqual(['a', 'b']);
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('c')], nextCursor: null });
    result.reload();
    result = harness.render(() => useIncidentList('token'));
    expect(result.items).toEqual([]);
    expect(result.loading).toBe(true);
    expect(mocks.fetchIncidentPage).toHaveBeenLastCalledWith('token', undefined, {
      priority: undefined, categoryId: undefined,
    });
    await flushPromises();
    result = harness.render(() => useIncidentList('token'));
    expect(result.items.map(({ id }) => id)).toEqual(['c']);
  });

  it('cambiar sesión oculta filas y rechaza las respuestas de la sesión anterior', async () => {
    const oldPage = deferred<Page>();
    mocks.fetchIncidentPage.mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({ items: [incident('nueva-sesión')], nextCursor: null });
    harness.render(() => useIncidentList('token-anterior'));
    let result = harness.render(() => useIncidentList(null));
    expect(result.items).toEqual([]);
    expect(result.loading).toBe(false);
    result.loadMore();
    result.retry();
    expect(mocks.fetchIncidentPage).toHaveBeenCalledTimes(1);
    harness.render(() => useIncidentList('token-nuevo'));
    await flushPromises();
    oldPage.resolve({ items: [incident('privada-anterior')], nextCursor: 'antiguo' });
    await flushPromises();
    result = harness.render(() => useIncidentList('token-nuevo'));
    expect(result.items.map(({ id }) => id)).toEqual(['nueva-sesión']);
  });

  it('un fallo al reiniciar no restaura filas ni cursores de páginas anteriores', async () => {
    mocks.fetchIncidentPage.mockResolvedValueOnce({ items: [incident('a')], nextCursor: 'segunda' });
    harness.render(() => useIncidentList('token'));
    await flushPromises();
    let result = harness.render(() => useIncidentList('token'));
    mocks.fetchIncidentPage.mockRejectedValueOnce(new Error('Sin conexión'));
    result.reload();
    harness.render(() => useIncidentList('token'));
    await flushPromises();
    result = harness.render(() => useIncidentList('token'));
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.error).toBe('Sin conexión');
  });

  it('sin sesión no consulta y al desmontar descarta respuestas pendientes', async () => {
    harness.render(() => useIncidentList(null));
    expect(mocks.fetchIncidentPage).not.toHaveBeenCalled();
    const page = deferred<Page>();
    mocks.fetchIncidentPage.mockReturnValueOnce(page.promise);
    harness.render(() => useIncidentList('token'));
    harness.unmount();
    page.resolve({ items: [incident('tarde')], nextCursor: null });
    await flushPromises();
    const result = harness.render(() => useIncidentList('token'));
    expect(result.items).toEqual([]);
  });
});
