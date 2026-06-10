import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function DataPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className = '',
}) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
  const safePage = Math.min(page, totalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {t('pagination.range', { from, to, total })}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{t('pagination.perPage')}</span>
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2"
            onClick={() => onPageChange(safePage - 1)}
            disabled={disabled || safePage <= 1}
            aria-label={t('pagination.prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5rem] text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('pagination.pageOf', { page: safePage, totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2"
            onClick={() => onPageChange(safePage + 1)}
            disabled={disabled || safePage >= totalPages}
            aria-label={t('pagination.next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
