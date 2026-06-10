import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Lock, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  getRouteForRole,
  send2faOtpForLogin,
  storeAuth,
  decodeToken,
  extractRoleFromPayload,
  extractUserIdFromPayload,
} from '../lib/auth'
import ForgotPasswordModal from './ForgotPasswordModal'
import TwoFAModal from './TwoFAModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { WelcomeLoadingScreen } from '../components/auth/WelcomeLoadingScreen'
import logo from '../assets/logo_s.png'
import hero from '../assets/hero.png'

const LOGIN_REDIRECT_MS = 1800

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [twoFAData, setTwoFAData] = useState(null)
  const [welcomeData, setWelcomeData] = useState(null)

  const headlineLines = t('auth.landing.headline').split('\n')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await send2faOtpForLogin({ username, password })
      if (result.requires_2fa) {
        setTwoFAData({ username, emailHint: result.email_hint })
        setIsSubmitting(false)
        return
      }

      const decodedAccess = decodeToken(result.access)
      const userId = extractUserIdFromPayload(decodedAccess)
      const resolvedRole = result.role || extractRoleFromPayload(decodedAccess)

      if (!resolvedRole) {
        throw new Error(t('auth.roleMissing'))
      }

      storeAuth({
        access: result.access,
        refresh: result.refresh,
        role: resolvedRole,
        username: result.username || username,
        userId,
        exp: decodedAccess?.exp ?? null,
      })

      setWelcomeData({ username: result.username || username, role: resolvedRole })
      setTimeout(() => navigate(getRouteForRole(resolvedRole), { replace: true }), LOGIN_REDIRECT_MS)
    } catch (requestError) {
      setError(requestError.message)
      setIsSubmitting(false)
    }
  }

  const handle2faSuccess = (tokens) => {
    const decodedAccess = decodeToken(tokens.access)
    const userId = extractUserIdFromPayload(decodedAccess)
    const resolvedRole = tokens.role || extractRoleFromPayload(decodedAccess)

    if (!resolvedRole) {
      setError(t('auth.roleMissing'))
      setIsSubmitting(false)
      return
    }

    storeAuth({
      access: tokens.access,
      refresh: tokens.refresh,
      role: resolvedRole,
      username: tokens.username,
      userId,
      exp: decodedAccess?.exp ?? null,
    })

    setTwoFAData(null)
    setWelcomeData({ username: tokens.username || username, role: resolvedRole })
    setTimeout(() => navigate(getRouteForRole(resolvedRole), { replace: true }), LOGIN_REDIRECT_MS)
  }

  return (
    <>
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
      {twoFAData && (
        <TwoFAModal
          username={twoFAData.username}
          emailHint={twoFAData.emailHint}
          onSuccess={handle2faSuccess}
          onCancel={() => {
            setTwoFAData(null)
            setIsSubmitting(false)
          }}
        />
      )}

      <AnimatePresence>
        {welcomeData && (
          <WelcomeLoadingScreen
            username={welcomeData.username}
            role={welcomeData.role}
            durationMs={LOGIN_REDIRECT_MS}
          />
        )}
      </AnimatePresence>

      <main className="fixed inset-0 grid h-[100dvh] w-full overflow-hidden font-sans lg:grid-cols-2">
        {/* Left — full-height brand panel */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative hidden min-h-0 lg:flex lg:flex-col"
        >
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#071018]/95 via-[#0c2340]/88 to-[#1ea0d6]/45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(30,160,214,0.4),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(99,102,241,0.25),transparent_45%)]" />

          <motion.div
            className="absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-cyan-400/15"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute -left-16 bottom-1/4 h-64 w-64 rounded-full border border-indigo-400/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          />

          <div className="relative z-10 flex shrink-0 items-center justify-between px-8 py-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('Back to Website')}
            </Link>
            <img src={logo} alt="CondOri" className="h-10 object-contain brightness-0 invert" />
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-16">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300/90">
              {t('app.name')}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl 2xl:text-[3.25rem]">
              {headlineLines.map((line, i) => (
                <span key={i} className="block">
                  {i === 0 ? <span className="text-cyan-300">{line}</span> : line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 xl:text-lg">
              {t('auth.landing.subtitle')}
            </p>
          </div>

          <div className="relative z-10 shrink-0 px-10 py-6 text-sm text-white/40 xl:px-16">
            &copy; {new Date().getFullYear()} CondOri
          </div>
        </motion.section>

        {/* Right — full-height form panel */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative flex min-h-0 flex-col bg-white dark:bg-slate-950"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(30,160,214,0.06),transparent_40%)] dark:bg-[radial-gradient(circle_at_100%_0%,rgba(30,160,214,0.08),transparent_40%)]" />

          <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('Back to Website')}
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>

          <div className="relative z-10 flex flex-1 min-h-0 items-center justify-center px-5 sm:px-10">
            <div className="w-full max-w-[400px]">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1ea0d6] to-cyan-600 text-white shadow-lg shadow-cyan-500/25 lg:hidden">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {t('auth.welcomeBack')}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t('auth.loginSubtitle')}
                  </p>
                </div>
                <img src={logo} alt="" className="h-10 object-contain lg:hidden" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder={t('auth.username')}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 pr-11 text-sm dark:border-slate-700 dark:bg-slate-900"
                    placeholder={t('auth.password')}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#1ea0d6] focus:ring-[#1ea0d6]/30 dark:border-slate-600"
                    />
                    {t('auth.rememberMe')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setShowForgotPassword(true)
                    }}
                    className="font-semibold text-[#1ea0d6] hover:text-[#1580aa]"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#1ea0d6] to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40 disabled:opacity-70"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.login')
                    )}
                  </span>
                  <span
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                </Button>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 lg:hidden">
                &copy; {new Date().getFullYear()} CondOri
              </p>
            </div>
          </div>

          <div className="relative z-10 hidden shrink-0 px-10 py-5 text-center text-xs text-slate-400 lg:block">
            &copy; {new Date().getFullYear()} CondOri — {t('app.tagline')}
          </div>
        </motion.section>
      </main>
    </>
  )
}

export default LoginPage
