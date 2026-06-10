import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import logo from '../../assets/logo_s.png'

export function WelcomeLoadingScreen({ username, role, durationMs = 1800 }) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frameId

    const tick = (now) => {
      const elapsed = now - start
      const next = Math.min(100, (elapsed / durationMs) * 100)
      setProgress(next)
      if (next < 100) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [durationMs])

  const roleLabel = t(`role.${role}`, { defaultValue: role })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#071018]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,160,214,0.25),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.18),transparent_40%)]" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[min(90vw,520px)] w-[min(90vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/15"
          animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[min(70vw,380px)] w-[min(70vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
          className="relative mb-8"
        >
          <motion.div
            className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl"
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <div className="relative rounded-2xl border border-white/10 bg-white/95 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <img src={logo} alt="" className="h-14 w-auto object-contain" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          {t('Welcome, {{name}}!', { name: username })}
        </motion.h1>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/90"
        >
          {roleLabel}
        </motion.p>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="mt-4 text-base text-slate-400"
        >
          {t('Preparing your {{role}} dashboard...', { role: roleLabel })}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="mt-10 w-full"
        >
          <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>{t('crud.loading')}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="auth-progress-bar h-full rounded-full bg-gradient-to-r from-cyan-400 via-[#1ea0d6] to-indigo-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-8 flex gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-cyan-400/80"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
