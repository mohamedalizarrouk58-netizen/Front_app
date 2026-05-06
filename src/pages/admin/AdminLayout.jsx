import { LayoutDashboard, LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { ThemeToggle } from '../../components/ThemeToggle'
import { clearAuth, getStoredAuth } from '../../lib/auth'
import { ADMIN_ENTITIES, adminEntityPath } from '../../lib/adminEntities'

function linkClasses(isActive) {
  return `sidebar-link w-full justify-between ${
    isActive ? 'border-[#145f7a]/30 bg-slate-50 dark:bg-slate-900 text-[#145f7a] dark:text-[#1ea0d6]' : ''
  }`
}

function AdminLayout() {
  const navigate = useNavigate()
  const auth = getStoredAuth()

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-grid min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto border-r border-white/50 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-900 p-4 backdrop-blur lg:block">
        <div className="glass-panel h-full p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Admin Navigation</p>
          <nav className="space-y-1.5">
            <NavLink to="/admin" end className={({ isActive }) => linkClasses(isActive)}>
              <span className="inline-flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </span>
            </NavLink>

            {ADMIN_ENTITIES.map((entity) => {
              const Icon = entity.icon
              const targetPath =
                entity.key === 'messages' ? `/admin/messages` : adminEntityPath(entity.key)
              return (
                <NavLink
                  key={entity.key}
                  to={targetPath}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {entity.label}
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </aside>

      <section className="min-h-screen px-3 py-4 sm:px-4 lg:pl-[19.5rem] lg:pr-6">
        <div className="mx-auto w-full max-w-[1320px]">
          <header className="glass-panel mb-4 animate-rise p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#145f7a]/10 text-[#145f7a]">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Connected User</p>
                  <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    {auth?.username ?? 'Admin'}
                  </p>
                </div>

                <Badge className="border-[#145f7a]/20 bg-[#145f7a]/10 text-[#145f7a]">
                  Admin
                </Badge>
              </div>

              <div className="inline-flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" onClick={handleLogout} className="dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Deconnexion
                </Button>
              </div>
            </div>
          </header>

          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default AdminLayout
