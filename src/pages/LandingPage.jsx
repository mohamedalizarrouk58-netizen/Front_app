import {
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  Monitor,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { AuthAmbientBackground } from '../components/auth/AuthAmbientBackground'
import logo from '../assets/logo_s.png'
import hero from '../assets/hero.png'

const SOLUTION_KEYS = [
  { icon: Cpu, titleKey: 'landing.sol.gmao', descKey: 'landing.sol.gmaoDesc' },
  { icon: Box, titleKey: 'landing.sol.erp', descKey: 'landing.sol.erpDesc' },
  { icon: Layers, titleKey: 'landing.sol.trade', descKey: 'landing.sol.tradeDesc' },
  { icon: Users, titleKey: 'landing.sol.hr', descKey: 'landing.sol.hrDesc' },
  { icon: Monitor, titleKey: 'landing.sol.reporting', descKey: 'landing.sol.reportingDesc' },
]

const STEP_KEYS = ['landing.step1', 'landing.step2', 'landing.step3', 'landing.step4']
const GOAL_KEYS = ['landing.goal1', 'landing.goal2', 'landing.goal3', 'landing.goal4']

const STATS = [
  { icon: Wrench, valueKey: 'landing.stat.gmao', labelKey: 'landing.sol.gmao' },
  { icon: TrendingUp, valueKey: 'landing.stat.efficiency', labelKey: 'common.efficiency' },
  { icon: ShieldCheck, valueKey: 'landing.stat.secure', labelKey: 'landing.badge' },
]

function htmlFromTranslation(text) {
  return text.replace(/<strong>/g, '<strong class="text-slate-900 dark:text-slate-100">')
}

export default function LandingPage() {
  const { t } = useTranslation()
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, 80])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.6])

  return (
    <div className="relative min-h-screen font-sans text-slate-600 dark:text-slate-300 selection:bg-[#1ea0d6] selection:text-white transition-colors duration-300">
      <AuthAmbientBackground />

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/70 lg:px-12"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="rounded-xl border border-white/60 bg-white/95 p-2.5 shadow-lg dark:border-white/10 dark:bg-slate-900/95">
            <img src={logo} alt="CondOri" className="h-8 object-contain" />
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#vision" className="text-slate-700 transition hover:text-[#1ea0d6] dark:text-slate-200">
              {t('landing.vision')}
            </a>
            <a href="#solutions" className="text-slate-700 transition hover:text-[#1ea0d6] dark:text-slate-200">
              {t('landing.solutions')}
            </a>
            <a href="#mission" className="text-slate-700 transition hover:text-[#1ea0d6] dark:text-slate-200">
              {t('landing.mission')}
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link to="/login">
              <Button className="rounded-full bg-gradient-to-r from-[#1ea0d6] to-cyan-600 px-5 font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-[1.02] hover:shadow-cyan-500/35 active:scale-[0.98] sm:px-6">
                {t('landing.workspace')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10">
        {/* Hero */}
        <section id="vision" className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-12 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#1ea0d6]/25 bg-[#1ea0d6]/10 px-4 py-1.5 text-sm font-semibold text-[#1ea0d6]"
              >
                <Sparkles className="h-4 w-4" />
                {t('landing.badge')}
              </motion.div>

              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                {t('landing.heroTitle')}{' '}
                <span className="auth-gradient-text">ConDori</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                {t('landing.heroSubtitle')}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-full bg-gradient-to-r from-[#1ea0d6] to-cyan-600 px-8 text-base font-semibold text-white shadow-xl shadow-cyan-500/25 sm:w-auto"
                  >
                    {t('landing.workspace')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#mission">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-full border-slate-300 px-8 text-base font-semibold dark:border-white/15 sm:w-auto"
                  >
                    {t('landing.discover')}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-6">
                {STATS.map(({ icon: Icon, valueKey, labelKey }, i) => (
                  <motion.div
                    key={valueKey}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/50"
                  >
                    <Icon className="mb-2 h-5 w-5 text-[#1ea0d6]" />
                    <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {t(valueKey)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t(labelKey)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-cyan-400/25 via-transparent to-indigo-400/20 blur-2xl" />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, rotate: -1 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.25, duration: 0.8, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/40 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-white/10 dark:bg-slate-900/40 dark:shadow-black/40"
              >
                <img src={hero} alt="" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                    {t('app.name')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/90">{t('app.tagline')}</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute right-6 top-6 rounded-xl border border-white/20 bg-white/90 px-4 py-3 shadow-lg dark:bg-slate-900/90"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.realtimeFlow')}</p>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white">24/7</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16 flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-slate-400"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{t('landing.discover')}</span>
              <ChevronRight className="h-4 w-4 rotate-90" />
            </motion.div>
          </motion.div>
        </section>

        {/* Approach card */}
        <section className="mx-auto max-w-7xl px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="rounded-[2rem] border border-slate-200/80 bg-white/70 p-8 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/50 lg:p-12"
          >
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                  {t('landing.approach')}
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('landing.approachText')}
                </p>
              </div>
              <div className="space-y-3">
                {STEP_KEYS.map((stepKey, i) => (
                  <motion.div
                    key={stepKey}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/5 dark:bg-white/5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1ea0d6]/30 bg-[#1ea0d6]/15">
                      <CheckCircle2 className="h-5 w-5 text-[#1ea0d6]" />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{t(stepKey)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Solutions */}
        <section id="solutions" className="mx-auto max-w-7xl px-6 py-28 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              {t('landing.techSolutions')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              {t('landing.techSolutionsDesc')}
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTION_KEYS.map((sol, index) => (
              <motion.div
                key={sol.titleKey}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -6 }}
                className="group rounded-3xl border border-slate-200/80 bg-white/75 p-8 shadow-sm backdrop-blur transition-shadow hover:border-[#1ea0d6]/30 hover:shadow-xl hover:shadow-cyan-500/5 dark:border-white/10 dark:bg-slate-900/50"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 transition group-hover:scale-110 group-hover:bg-[#1ea0d6]/15 dark:bg-white/5">
                  <sol.icon className="h-7 w-7 text-[#1ea0d6]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t(sol.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(sol.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <motion.section
          id="mission"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-7xl px-6 pb-24 lg:px-12"
        >
          <div className="relative overflow-hidden rounded-[3rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-10 shadow-xl dark:border-white/10 dark:from-slate-900/90 dark:to-[#0a1f33]/90 lg:p-16">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#1ea0d6]/10 blur-3xl" />

            <h2 className="font-display text-4xl font-bold text-slate-900 dark:text-white">
              {t('landing.missionTitle')}
            </h2>

            <div className="mt-10 space-y-12 max-w-3xl">
              <div>
                <h3 className="mb-4 flex items-center gap-3 text-2xl font-semibold text-slate-800 dark:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1ea0d6]/20 text-sm text-[#1ea0d6]">
                    1
                  </span>
                  {t('landing.mission1Title')}
                </h3>
                <p
                  className="rounded-2xl border border-slate-100 border-l-4 border-l-[#1ea0d6] bg-slate-50/80 p-6 text-lg leading-relaxed text-slate-600 dark:border-white/5 dark:bg-slate-950/50 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: htmlFromTranslation(t('landing.mission1Text')) }}
                />
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-3 text-2xl font-semibold text-slate-800 dark:text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1ea0d6]/20 text-sm text-[#1ea0d6]">
                    2
                  </span>
                  {t('landing.mission2Title')}
                </h3>
                <p className="mb-6 leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('landing.mission2Text')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {GOAL_KEYS.map((goalKey, i) => (
                    <motion.div
                      key={goalKey}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl border border-slate-100 bg-white/60 p-5 dark:border-white/5 dark:bg-slate-950/50"
                    >
                      <p
                        className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: htmlFromTranslation(t(goalKey)) }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 px-6 py-12 text-center backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto inline-block rounded-xl border border-slate-200/80 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-900">
          <img src={logo} alt="CondOri" className="h-8 object-contain" />
        </div>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} {t('landing.footer')}
        </p>
      </footer>
    </div>
  )
}
