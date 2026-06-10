import { motion } from 'framer-motion'

const ORBS = [
  { className: 'left-[8%] top-[12%] h-72 w-72 bg-cyan-400/25 dark:bg-cyan-500/20', delay: 0 },
  { className: 'right-[6%] top-[28%] h-56 w-56 bg-indigo-400/20 dark:bg-indigo-500/15', delay: 0.4 },
  { className: 'left-[35%] bottom-[8%] h-80 w-80 bg-sky-300/20 dark:bg-sky-500/10', delay: 0.8 },
]

export function AuthAmbientBackground({ intensity = 'normal' }) {
  const orbOpacity = intensity === 'strong' ? 'opacity-100' : 'opacity-70'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-sky-50/80 dark:from-[#0a1628] dark:via-[#0f172a] dark:to-[#0a1f33]" />

      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(30,160,214,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,160,214,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className={`auth-orb absolute rounded-full blur-3xl ${orb.className} ${orbOpacity}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: orb.delay, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full border border-cyan-500/10 dark:border-cyan-400/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute -left-24 bottom-[-120px] h-[400px] w-[400px] rounded-full border border-indigo-500/10 dark:border-indigo-400/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 56, repeat: Infinity, ease: 'linear' }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,160,214,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(30,160,214,0.12),transparent_55%)]" />
    </div>
  )
}
