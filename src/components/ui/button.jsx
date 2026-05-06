import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#145f7a]/40',
  {
    variants: {
      variant: {
        default: 'bg-[#145f7a] text-white hover:bg-[#0f4e64] dark:bg-[#1a7a9c] dark:hover:bg-[#145f7a]',
        secondary: 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80',
        ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800',
        outline:
          'border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button }
