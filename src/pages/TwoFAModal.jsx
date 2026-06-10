import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { AppModal } from '../components/ui/AppModal'
import { loginWith2fa } from '../lib/auth'

export default function TwoFAModal({ username, emailHint, onSuccess, onCancel }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (code.trim().length !== 6) { setError(t('auth.2fa.invalidCode')); return }
    setLoading(true)
    try {
      const data = await loginWith2fa({ username, code })
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal
      open
      onClose={onCancel}
      eyebrow={t('auth.2fa.title')}
      title={t('auth.2fa.subtitle', { email: emailHint })}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('crud.cancel')}
          </Button>
          <Button type="submit" form="two-fa-form" disabled={loading || code.length !== 6} className="bg-sky-600 hover:bg-sky-700">
            {loading ? t('auth.2fa.verifying') : t('auth.2fa.verify')}
          </Button>
        </div>
      }
    >
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-sky-600 dark:text-sky-400" />
        </div>
      </div>

      <form id="two-fa-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="h-14 rounded-xl text-center text-3xl tracking-[0.6em] font-mono border-2 focus-visible:ring-0 focus-visible:border-sky-500"
          autoFocus
          required
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 p-3 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}
      </form>
    </AppModal>
  )
}
