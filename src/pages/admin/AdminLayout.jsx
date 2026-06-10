import { LayoutDashboard, LogOut, Sparkles, ChevronRight } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { ThemeToggle } from '../../components/ThemeToggle'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { clearAuth, getStoredAuth } from '../../lib/auth'
import { ADMIN_ENTITIES, adminEntityPath } from '../../lib/adminEntities'
import { tEntity } from '../../lib/i18nLabels'
import { motion, AnimatePresence } from 'framer-motion'
import NavbarMessagesButton from '../../components/messaging/NavbarMessagesButton'
import MessengerDock from '../../components/messaging/MessengerDock'
import ConnectedUserCard from '../../components/ConnectedUserCard'

function AdminLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = getStoredAuth()

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  // Animation variants
  const sidebarVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { x: -10, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.2 } }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-[#1ea0d6]/30">
      {/* Mobile Compact Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col items-center gap-4 border-r border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 py-6 backdrop-blur-xl lg:hidden shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#145f7a] to-[#1ea0d6] text-xl font-bold text-white shadow-lg shadow-[#145f7a]/20">
          {String(auth?.username ?? 'A').slice(0, 1).toUpperCase()}
        </div>

        <nav className="flex flex-1 flex-col items-center gap-3 overflow-y-auto py-2 w-full px-3 custom-scrollbar">
          <NavLink
            to="/admin"
            end
            aria-label={t('Dashboard')}
            className={({ isActive }) =>
              `group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveNav"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#145f7a] to-[#1ea0d6] shadow-md shadow-[#145f7a]/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                )}
                <LayoutDashboard className="relative z-10 h-5 w-5" />
              </>
            )}
          </NavLink>

          {ADMIN_ENTITIES.map((entity) => {
            const Icon = entity.icon
            const targetPath = entity.key === 'messages'
              ? `/admin/messages`
              : entity.key === 'achat-piece'
                ? '/admin/achat-piece'
                : adminEntityPath(entity.key)

            return (
              <NavLink
                key={entity.key}
                to={targetPath}
                aria-label={tEntity(entity.key)}
                className={({ isActive }) =>
                  `group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="mobileActiveNav"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#145f7a] to-[#1ea0d6] shadow-md shadow-[#145f7a]/20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      />
                    )}
                    <Icon className="relative z-10 h-5 w-5" />
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="flex flex-col items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </aside>

      {/* Desktop Fluid Sidebar */}
      <motion.aside 
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
        className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl lg:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#145f7a] to-[#1ea0d6] font-display text-xl font-bold text-white shadow-inner">
              <Sparkles className="h-6 w-6 text-white/90" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 leading-tight">Admin<br/>Portal</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
          <div className="mb-4 ml-2 items-center flex gap-2 text-xs font-semibold uppercase tracking-widest text-[#145f7a] dark:text-[#1ea0d6]">
            <span>{t('Admin Navigation')}</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#145f7a]/20 to-transparent dark:from-[#1ea0d6]/20"></div>
          </div>
          
          <nav className="space-y-1.5 relative">
            <motion.div variants={itemVariants}>
              <NavLink 
                to="/admin" 
                end 
                className={({ isActive }) => `relative flex items-center justify-between px-3 py-3 rounded-xl transition-colors duration-200 group ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="desktopActiveNav"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#145f7a] to-[#1ea0d6] shadow-md shadow-[#145f7a]/20"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3 font-medium">
                      <LayoutDashboard className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#1ea0d6]'}`} />
                      {t('Dashboard')}
                    </span>
                    {isActive && <ChevronRight className="relative z-10 h-4 w-4 text-white/70" />}
                  </>
                )}
              </NavLink>
            </motion.div>

            {ADMIN_ENTITIES.map((entity) => {
              const Icon = entity.icon
              const targetPath =
                entity.key === 'messages'
                  ? `/admin/messages`
                  : entity.key === 'achat-piece'
                    ? '/admin/achat-piece'
                    : adminEntityPath(entity.key)
              
              return (
                <motion.div key={entity.key} variants={itemVariants}>
                  <NavLink
                    to={targetPath}
                    className={({ isActive }) => `relative flex items-center justify-between px-3 py-3 rounded-xl transition-colors duration-200 group ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="desktopActiveNav"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#145f7a] to-[#1ea0d6] shadow-md shadow-[#145f7a]/20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 font-medium">
                          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#1ea0d6]'}`} />
                          {tEntity(entity.key)}
                        </span>
                        {isActive && <ChevronRight className="relative z-10 h-4 w-4 text-white/70" />}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              )
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <section className="relative min-h-screen py-6 pl-24 pr-4 lg:pl-[300px] lg:pr-8 transition-all duration-300">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Header */}
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 p-4 backdrop-blur-xl shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <ConnectedUserCard />

              <div className="flex h-full items-center gap-3">
                <NavbarMessagesButton />
                <LanguageSwitcher />
                <ThemeToggle />
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout} 
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <MessengerDock />
    </main>
  )
}

export default AdminLayout
