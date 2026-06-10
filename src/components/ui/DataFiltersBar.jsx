import { Filter, RotateCcw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ViewModeToggle } from './ViewModeToggle'

const selectClass =
  'h-10 min-w-[9rem] rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm text-slate-700 outline-none ring-sky-500/30 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200'

export function DataFiltersBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  shown,
  total,
  viewMode,
  onViewModeChange,
  onClearFilters,
  hasActiveFilters = false,
  className = '',
}) {
  const { t } = useTranslation()

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none ring-sky-500/30 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof shown === 'number' && typeof total === 'number' ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {t('common.resultsCount', { shown, total })}
            </span>
          ) : null}

          {onViewModeChange ? (
            <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
          ) : null}
        </div>
      </div>

      {filters.length > 0 || onClearFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            {t('common.filters')}
          </span>

          {filters.map((filter) => (
            <select
              key={filter.id}
              className={selectClass}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              aria-label={filter.label}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}

          {onClearFilters && hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('common.clearFilters')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
