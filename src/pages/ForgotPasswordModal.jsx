import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, KeyRound, Lock, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { AppModal } from '../components/ui/AppModal'
import { sendOtp, resetPassword } from '../lib/auth'

export default function ForgotPasswordModal({ onClose }) {
  const { t } = useTranslation()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendOtp({ email, purpose: 'password_reset' })
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCodeSubmit(e) {
    e.preventDefault()
    setError('')
    if (code.trim().length !== 6) { setError(t('auth.forgot.invalidCode')); return }
    setStep('password')
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError(t('auth.forgot.passwordMismatch')); return }
    if (newPassword.length < 6) { setError(t('auth.forgot.passwordTooShort')); return }
    setLoading(true)
    try {
      await resetPassword({ email, code, new_password: newPassword })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = { email: 1, code: 2, password: 3, done: 4 }

  const headerByStep = {
    email: { eyebrow: t('auth.forgot.emailLabel'), title: t('auth.forgot.title') },
    code: { eyebrow: t('auth.2fa.title'), title: t('auth.2fa.subtitle', { email }) },
    password: { eyebrow: t('auth.forgot.newPassword'), title: t('auth.forgot.newPassword') },
    done: { eyebrow: t('auth.forgot.done'), title: t('auth.forgot.doneMsg') },
  }

  const footer = step === 'done' ? (
    <div className="flex justify-end">
      <Button onClick={onClose} className="bg-sky-600 hover:bg-sky-700">
        {t('auth.login')}
      </Button>
    </div>
  ) : step === 'email' ? (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={onClose}>{t('crud.cancel')}</Button>
      <Button type="submit" form="forgot-email-form" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
        {loading ? t('crud.loading') : t('auth.forgot.sendCode')}
      </Button>
    </div>
  ) : step === 'code' ? (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={() => { setError(''); setStep('email') }}>
        ← {t('auth.forgot.emailLabel')}
      </Button>
      <Button type="submit" form="forgot-code-form" className="bg-sky-600 hover:bg-sky-700">
        {t('auth.forgot.verifyCode')}
      </Button>
    </div>
  ) : (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={onClose}>{t('crud.cancel')}</Button>
      <Button type="submit" form="forgot-password-form" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
        {loading ? t('crud.saving') : t('auth.forgot.reset')}
      </Button>
    </div>
  )

  return (
    <AppModal
      open
      onClose={onClose}
      eyebrow={headerByStep[step].eyebrow}
      title={headerByStep[step].title}
      size="sm"
      footer={footer}
    >
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${steps[step] >= n ? 'bg-sky-600 dark:bg-sky-400' : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                <Mail className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <form id="forgot-email-form" onSubmit={handleSendOtp} className="space-y-4">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required className="h-12 rounded-xl" />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </form>
          </motion.div>
        )}

        {step === 'code' && (
          <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <form id="forgot-code-form" onSubmit={handleCodeSubmit} className="space-y-4">
              <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={t('auth.forgot.codePlaceholder')} maxLength={6} className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-mono" required />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </form>
          </motion.div>
        )}

        {step === 'password' && (
          <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <form id="forgot-password-form" onSubmit={handleResetPassword} className="space-y-4">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('auth.forgot.newPassword')} required className="h-12 rounded-xl" />
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('auth.forgot.confirmPassword')} required className="h-12 rounded-xl" />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </form>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppModal>
  )
}
