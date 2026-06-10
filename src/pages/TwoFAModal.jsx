import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { loginWith2fa } from '../lib/auth'

export default function TwoFAModal({ username, emailHint, onSuccess, onCancel }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (code.trim().length !== 6) { setError('Le code doit contenir 6 chiffres.'); return }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
          Vérification en 2 étapes
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Code envoyé à <span className="font-semibold text-slate-700 dark:text-slate-300">{emailHint}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="h-14 rounded-xl text-center text-3xl tracking-[0.6em] font-mono border-2 focus-visible:ring-0 focus-visible:border-indigo-500"
            autoFocus
            required
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 p-3 text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || code.length !== 6} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50">
            {loading ? 'Vérification...' : 'Confirmer'}
          </Button>

          <button type="button" onClick={onCancel} className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Annuler et retourner à la connexion
          </button>
        </form>
      </motion.div>
    </div>
  )
}
