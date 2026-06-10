import { LayoutGrid, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ViewModeToggle({ value, onChange, className = '' }) {
  const { t } = useTranslation()

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/80 ${className}`}
      role="group"
      aria-label={t('common.viewMode')}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          value === 'list'
            ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-pressed={value === 'list'}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">{t('common.viewList')}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
          value === 'cards'
            ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        aria-pressed={value === 'cards'}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">{t('common.viewCards')}</span>
      </button>
    </div>
  )
}
