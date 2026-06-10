import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const ACTION_ICON = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
}

export function OperationFeedbackOverlay({ phase, action, entity }) {
  const { t } = useTranslation()
  const ActionIcon = ACTION_ICON[action] ?? Plus

  const loadingKey =
    action === 'create' ? 'feedback.creating' : action === 'update' ? 'feedback.updating' : 'feedback.deleting'
  const successKey =
    action === 'create' ? 'feedback.createSuccess' : action === 'update' ? 'feedback.updateSuccess' : 'feedback.deleteSuccess'

  const loadingText = t(loadingKey, { entity })
  const successText = t(successKey, { entity })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      aria-live="polite"
      aria-busy={phase === 'loading'}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-sky-900/30"
      >
        <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-0 h-24 w-24 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          {phase === 'loading' ? (
            <>
              <motion.div
                className="absolute inset-0 rounded-2xl border border-sky-400/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-500/15"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Loader2 className="h-9 w-9 text-sky-400 animate-spin" />
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="absolute inset-0 rounded-full bg-emerald-500/20"
              />
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.05 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-400/40"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </motion.div>
            </>
          )}
        </div>

        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/90">
            <ActionIcon className="h-3.5 w-3.5" />
            {action === 'create' ? t('crud.create') : action === 'update' ? t('crud.edit') : t('crud.delete')}
          </div>

          <h2 className="text-xl font-bold text-white">
            {phase === 'loading' ? loadingText : successText}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {phase === 'loading' ? t('feedback.pleaseWait') : t('feedback.done')}
          </p>
        </motion.div>

        {phase === 'loading' ? (
          <div className="relative mt-6 h-1 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              animate={{ x: ['-100%', '320%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        ) : (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="mt-6 h-1 origin-left rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
          />
        )}
      </motion.div>
    </motion.div>
  )
}
