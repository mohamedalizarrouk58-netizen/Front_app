import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

const HEADER_CLASS = {
  default: 'bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900',
  success: 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800',
  danger: 'bg-gradient-to-r from-rose-800 via-rose-700 to-red-900',
  sky: 'bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900',
}

export function AppModal({
  open,
  onClose,
  eyebrow,
  title,
  size = 'md',
  headerVariant = 'default',
  children,
  footer,
  zIndex = 50,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex }}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative w-full ${SIZE_CLASS[size] ?? SIZE_CLASS.md} flex max-h-[min(90dvh,720px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative shrink-0 px-6 py-5 text-white ${HEADER_CLASS[headerVariant] ?? HEADER_CLASS.default}`}>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              {eyebrow ? (
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200/80">{eyebrow}</p>
              ) : null}
              {title ? <h2 className="mt-1 text-xl font-bold leading-snug">{title}</h2> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

            {footer ? (
              <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
