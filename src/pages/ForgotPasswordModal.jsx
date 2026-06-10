import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, KeyRound, Lock, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { sendOtp, resetPassword } from '../lib/auth'

// step: 'email' | 'code' | 'password' | 'done'
export default function ForgotPasswordModal({ onClose }) {
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
    if (code.trim().length !== 6) { setError('Le code doit contenir 6 chiffres.'); return }
    setStep('password')
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (newPassword.length < 6) { setError('Minimum 6 caractères.'); return }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {[1,2,3].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${steps[step] >= n ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div key="email" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mot de passe oublié</h2>
                  <p className="text-xs text-slate-500">Entrez votre adresse email</p>
                </div>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" required className="h-12 rounded-xl" />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                  {loading ? 'Envoi...' : 'Envoyer le code'}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'code' && (
            <motion.div key="code" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Code de vérification</h2>
                  <p className="text-xs text-slate-500">Code envoyé à {email}</p>
                </div>
              </div>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" maxLength={6} className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-mono" required />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                  Vérifier le code
                </Button>
                <button type="button" onClick={()=>{setError('');setStep('email')}} className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  ← Changer d'email
                </button>
              </form>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div key="password" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nouveau mot de passe</h2>
                  <p className="text-xs text-slate-500">Choisissez un mot de passe sécurisé</p>
                </div>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" required className="h-12 rounded-xl" />
                <Input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" required className="h-12 rounded-xl" />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                  {loading ? 'Réinitialisation...' : 'Réinitialiser'}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Mot de passe modifié !</h2>
              <p className="text-sm text-slate-500 mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Button onClick={onClose} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                Retour à la connexion
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
