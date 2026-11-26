import { RotateCcw } from 'lucide-react';

import { PRIORITY_LABELS, SORT_ORDER_LABELS, STATUS_FILTER_OPTIONS, STATUS_LABELS } from '../constants/incident-labels';
import type { useIncidentCategories } from '../hooks/use-incident-categories';
import type { useIncidentFilters } from '../hooks/use-incident-filters';
import type { IncidentPriority, IncidentSortOrder } from '../types/incident';

interface IncidentFiltersProps {
  controls: ReturnType<typeof useIncidentFilters>;
  categories: ReturnType<typeof useIncidentCategories>;
}

const SORT_ORDERS: readonly IncidentSortOrder[] = ['newest', 'oldest'];
const PRIORITIES: readonly IncidentPriority[] = ['low', 'medium', 'high'];

const LABEL_CLASS = 'flex flex-col gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400';
const INPUT_CLASS = 'w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 '
  + 'rounded-xl text-sm font-normal normal-case tracking-normal text-zinc-900 dark:text-zinc-100 '
  + 'focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent';

export function IncidentFilters({ controls, categories }: IncidentFiltersProps) {
  const { filters, isActive, setStatus, setOrder, setFrom, setTo, setPriority, setCategory, reset } = controls;
  const hasSelectedCategory = categories.items.some((category) => category.id === filters.categoryId);

  return (
    <form
      aria-label="Filtros del listado de incidencias"
      onSubmit={(event) => event.preventDefault()}
      className="mb-5 grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/40 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className={LABEL_CLASS}>
        Estado
        <select value={filters.status} onChange={(event) => setStatus(event.target.value)} className={INPUT_CLASS}>
          <option value="all">Todos los estados</option>
          {STATUS_FILTER_OPTIONS.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Prioridad
        <select value={filters.priority} onChange={(event) => setPriority(event.target.value)} className={INPUT_CLASS}>
          <option value="all">Todas las prioridades</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Categoría
        <select
          value={filters.categoryId ?? ''}
          onChange={(event) => setCategory(event.target.value)}
          disabled={categories.loading || (!categories.items.length && !filters.categoryId)}
          aria-busy={categories.loading}
          className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <option value="">Todas las categorías</option>
          {filters.categoryId && !hasSelectedCategory && (
            <option value={filters.categoryId}>Categoría seleccionada</option>
          )}
          {categories.items.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Orden
        <select value={filters.order} onChange={(event) => setOrder(event.target.value)} className={INPUT_CLASS}>
          {SORT_ORDERS.map((order) => (
            <option key={order} value={order}>{SORT_ORDER_LABELS[order]}</option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASS}>
        Desde
        <input
          type="date"
          value={filters.from ?? ''}
          max={filters.to ?? undefined}
          onChange={(event) => setFrom(event.target.value)}
          className={INPUT_CLASS}
        />
      </label>
      <label className={LABEL_CLASS}>
        Hasta
        <input
          type="date"
          value={filters.to ?? ''}
          min={filters.from ?? undefined}
          onChange={(event) => setTo(event.target.value)}
          className={INPUT_CLASS}
        />
      </label>
      {categories.loading && (
        <p role="status" className="text-xs text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
          Cargando categorías.
        </p>
      )}
      {categories.error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300 sm:col-span-2 lg:col-span-3">
          <p role="alert">{categories.error}</p>
          <button type="button" onClick={categories.retry} className="mt-2 font-semibold underline">
            Reintentar categorías
          </button>
        </div>
      )}
      {!categories.loading && !categories.error && categories.items.length === 0 && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:col-span-2 lg:col-span-3">
          No hay categorías disponibles.
        </p>
      )}
      {isActive && (
        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        </div>
      )}
    </form>
  );
}
