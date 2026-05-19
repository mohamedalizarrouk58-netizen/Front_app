import { cn } from '../../lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'dashboard-card rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-800/85 text-slate-900 dark:text-slate-100 shadow-sm backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-1.5 p-6', className)} {...props} />
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('font-display text-lg font-semibold leading-none', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
