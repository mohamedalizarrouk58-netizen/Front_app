import { LayoutDashboard, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { ThemeToggle } from '../../components/ThemeToggle'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { clearAuth, getStoredAuth } from '../../lib/auth'
import { ROLE_WORKSPACES, roleDashboardPath, roleModulePath } from '../../lib/roleWorkspaces'
import { tModule } from '../../lib/i18nLabels'
import NavbarMessagesButton from '../../components/messaging/NavbarMessagesButton'
import MessengerDock from '../../components/messaging/MessengerDock'
import ConnectedUserCard from '../../components/ConnectedUserCard'

function linkClasses(isActive) {
  return `sidebar-link w-full justify-between ${
    isActive ? 'border-[#145f7a]/30 bg-slate-50 dark:bg-slate-900 text-[#145f7a] dark:text-[#1ea0d6]' : ''
  }`
}

function getModulePath(role, moduleKey) {
  if (moduleKey === 'messages') {
    return `/${role}/messages`
  }

  return roleModulePath(role, moduleKey)
}

function RoleLayout({ role }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = getStoredAuth()
  const workspace = ROLE_WORKSPACES[role]

  if (!workspace) {
    return null
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-grid min-h-screen font-sans selection:bg-[#1ea0d6] selection:text-white">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center gap-3 border-r border-slate-200 dark:border-slate-700/50 bg-[#dce8ee]/95 dark:bg-slate-900/95 py-4 backdrop-blur-xl shadow-xl lg:hidden">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white ${workspace.iconClass}`}>
          {String(role).slice(0, 1).toUpperCase()}
        </div>

        <nav className="flex flex-1 flex-col items-center gap-3 overflow-y-auto py-1">
          <NavLink
            to={roleDashboardPath(role)}
            end
            aria-label={t('Dashboard')}
            className={({ isActive }) =>
              `group relative flex h-11 w-11 items-center justify-center rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-900 ${
                isActive
                  ? 'border-[#145f7a]/30 bg-slate-50 dark:bg-slate-900 text-[#145f7a] dark:text-[#1ea0d6]'
                  : 'border-transparent text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <LayoutDashboard className="compact-sidebar-icon h-5 w-5" />
            <span className="compact-sidebar-pill">{t('Dashboard')}</span>
          </NavLink>

          {workspace.modules && workspace.modules.map((module) => {
            const Icon = module.icon
            const toPath = getModulePath(role, module.key)

            return (
              <NavLink
                key={module.key}
                to={toPath}
                aria-label={tModule(module.key)}
                className={({ isActive }) =>
                  `group relative flex h-11 w-11 items-center justify-center rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-900 ${
                    isActive
                      ? 'border-[#145f7a]/30 bg-slate-50 dark:bg-slate-900 text-[#145f7a] dark:text-[#1ea0d6]'
                      : 'border-transparent text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon className="compact-sidebar-icon h-5 w-5" />
                <span className="compact-sidebar-pill">{tModule(module.key)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex flex-col items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </aside>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-slate-200 dark:border-slate-700/50 bg-[#dce8ee]/95 dark:bg-slate-900/95 p-4 backdrop-blur-xl lg:block shadow-xl">
        <div className="glass-panel h-full flex flex-col gap-6 p-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1ea0d6] mb-1">
              {t(`role.${role}`, { defaultValue: role })}
            </p>
            <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-slate-100">{t('nav.workspace')}</h2>
          </motion.div>

          <nav className="space-y-2 flex-1">
            <NavLink to={roleDashboardPath(role)} end className={({ isActive }) => linkClasses(isActive)}>
              <span className="inline-flex items-center gap-3">
                <LayoutDashboard className="h-5 w-5" />
                {t('Dashboard Overview')}
              </span>
            </NavLink>

            <div className="pt-4 pb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-300 dark:text-slate-500 px-3">{t('nav.modules')}</p>
            </div>

            {workspace.modules && workspace.modules
              .map((module, idx) => {
              const Icon = module.icon
              const toPath = getModulePath(role, module.key)

              return (
                <motion.div key={module.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                  <NavLink
                    to={toPath}
                    className={({ isActive }) => linkClasses(isActive)}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {tModule(module.key)}
                    </span>
                  </NavLink>
                </motion.div>
              )
            })}
          </nav>
          
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 pb-2 px-3">
             <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-300 dark:text-slate-500">
                <span>&copy; {new Date().getFullYear()} CondOri</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">v2.1</span>
             </div>
          </div>
        </div>
      </aside>

      <section className="min-h-screen py-6 pl-20 pr-4 sm:pl-24 lg:pl-[19.5rem] lg:pr-8 relative overflow-hidden ">
        {/* Decorative background flare */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-slate-200/50 to-transparent dark:from-white/5 dark:to-transparent rounded-full blur-3xl -z-10 opacity-60 pointer-events-none" />

        <div className="mx-auto w-full max-w-[1400px]">
          <motion.header 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-8 p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/60 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <ConnectedUserCard roleLabel={t(`role.${role}`)} />

              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                <NavbarMessagesButton />
                <LanguageSwitcher />
                <ThemeToggle />
                <Button variant="outline" onClick={handleLogout} className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 shadow-sm rounded-xl">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet context={{ role, workspace }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <MessengerDock />
    </main>
  )
}

export default RoleLayout
