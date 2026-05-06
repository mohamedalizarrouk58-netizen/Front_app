import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { getRouteForRole, loginWithCredentials } from '../lib/auth'

import logo from '../assets/logo_s.png'

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [welcomeData, setWelcomeData] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const auth = await loginWithCredentials({ username, password })
      setWelcomeData({ username: auth.username || username, role: auth.role })
      setTimeout(() => {
        navigate(getRouteForRole(auth.role), { replace: true })
      }, 3000)
    } catch (requestError) {
      setError(requestError.message)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {welcomeData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a192f]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl p-4 shadow-2xl mb-8"
              >
                <img src={logo} alt="Condori Logo" className="h-16 object-contain" />
              </motion.div>
              
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight capitalize"
              >
                Welcome, {welcomeData.username}!
              </motion.h1>
              
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="h-1 bg-gradient-to-r from-transparent via-[#1ea0d6] to-transparent max-w-xs w-full mb-6"
              />
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="text-slate-400 dark:text-slate-300 text-lg uppercase tracking-widest text-center"
              >
                Preparing your {welcomeData.role} dashboard...
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="mt-8 flex justify-center"
              >
                <svg className="animate-spin h-8 w-8 text-[#1ea0d6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex h-screen w-full bg-white dark:bg-slate-950 p-4 lg:p-6 overflow-hidden relative font-sans transition-colors duration-300">
      {/* Background with abstract geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-gradient-to-b dark:from-[#0a192f] dark:to-[#0d2a45] opacity-90" />
         <div className="absolute -left-[20%] top-[-10%] w-[70%] h-[120%] bg-slate-200 dark:bg-[#113a5d] rounded-[100px] rotate-[-15deg] opacity-40 blur-3xl" />
         <div className="absolute right-[10%] bottom-[-20%] w-[50%] h-[80%] bg-slate-100 dark:bg-[#0a1f33] rounded-[50px] rotate-[25deg] opacity-70" />
         <div className="absolute left-[30%] top-[40%] w-[40%] h-[40%] bg-[#1ea0d6] rounded-full opacity-10 blur-[120px]" />
         
         {/* Grid lines */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-30" />
      </div>

      {/* Left Content Area */}
      <div className="hidden lg:flex flex-1 flex-col justify-between relative z-10 px-8 py-4 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between w-full">
           <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl p-3 shadow-lg inline-flex items-center gap-3">
              <img src={logo} alt="Condori Logo" className="h-10 object-contain" />
           </div>
           
           <a href="/" className="flex items-center gap-2 text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium">
              <span>←</span> Back to Website
           </a>
        </div>

        <div className="max-w-2xl mb-8">
           <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-[1.1] tracking-tight">
              Conseil, Développement.<br/>Organisation Intégrée.
           </h1>
           <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed max-w-xl">
              From quick maintenance requests to full-length interventions, our powerful platform lets you work seamlessly across your organization.
           </p>
           
           <div className="flex gap-2 mt-10">
              <div className="h-1.5 w-8 bg-slate-900 dark:bg-white rounded-full"></div>
              <div className="h-1.5 w-2 bg-slate-200 dark:bg-white/30 rounded-full"></div>
              <div className="h-1.5 w-2 bg-slate-200 dark:bg-white/30 rounded-full"></div>
              <div className="h-1.5 w-2 bg-slate-200 dark:bg-white/30 rounded-full"></div>
           </div>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="w-full lg:w-[500px] bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 flex flex-col justify-center relative z-20 shadow-2xl h-full overflow-y-auto">
         <div className="lg:hidden flex justify-center mb-10">
            <img src={logo} alt="Condori Logo" className="h-14 object-contain" />
         </div>

         <div className="mb-10">
            <h2 className="text-[32px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Welcome Back!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text[15px]">Connectez-vous pour commencer à gérer vos opérations en toute simplicité.</p>
         </div>

         <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
               <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">User / Email</label>
               <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-14 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-base px-4 transition-all"
                  placeholder="Input your username"
                  autoComplete="username"
                  required
               />
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Password</label>
               <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-14 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 text-base pl-4 pr-12 transition-all"
                    placeholder="Input your password"
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:text-slate-400 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
               </div>
            </div>

            <div className="flex items-center justify-between pt-1">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                     <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-[4px] checked:bg-slate-900 checked:border-slate-900 transition-colors cursor-pointer" />
                     <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                       <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                  </div>
                  <span className="text-[14px] text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-700 dark:text-slate-300 transition-colors">Remember Me</span>
               </label>
               
               <a href="#" className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 transition-colors">
                  Forgot Password?
               </a>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-[14px] text-red-600 flex items-start gap-2.5">
                <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 bg-slate-900 hover:bg-[#1a1a1a] text-white rounded-[16px] text-base font-semibold mt-4 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                 <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                 </div>
              ) : "Login"}
            </Button>
         </form>

         <div className="mt-10 relative">
            <div className="absolute inset-0 flex items-center">
               <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            
         </div>
      </div>
    </main>
    </>
  )
}

export default LoginPage
