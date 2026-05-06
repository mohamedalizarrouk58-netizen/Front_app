import { cn } from '../../lib/utils'

function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600/80 bg-white/70 dark:bg-slate-900/70 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-200',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
