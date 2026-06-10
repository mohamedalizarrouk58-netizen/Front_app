import { Outlet } from 'react-router-dom'
import { LogOut, Package, MessageSquare, UserCircle2 } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearAuth, getProfilePath, getStoredAuth } from '../../../lib/auth'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { LanguageSwitcher } from '../../../components/LanguageSwitcher'
import NavbarMessagesButton from '../../../components/messaging/NavbarMessagesButton'
import MessengerDock from '../../../components/messaging/MessengerDock'

export default function FournisseurLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const auth = getStoredAuth()
  const profilePath = getProfilePath(auth?.role)

  const navItems = [
    { name: t('nav.dashboard'), path: '/fournisseur', icon: Package },
    { name: t('nav.messages'), path: '/fournisseur/messages', icon: MessageSquare },
    { name: t('profile.title'), path: profilePath, icon: UserCircle2 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors">
      <nav className="w-full md:w-64 bg-slate-900 dark:bg-slate-900/95 text-white flex flex-col h-auto md:h-screen sticky top-0 shrink-0 border-r border-slate-800">
        <div className="p-6">
          <h2 className="text-2xl font-black text-white capitalize tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            {t('role.fournisseur')}
          </h2>
        </div>

        <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-x-hidden p-4 md:p-8 bg-slate-50/50 dark:bg-slate-950/80">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex justify-end">
            <NavbarMessagesButton />
          </div>
          <Outlet />
        </div>
      </main>

      <MessengerDock />
    </div>
  )
}
