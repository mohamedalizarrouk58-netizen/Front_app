import {
  Bell,
  Boxes,
  ChartColumn,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Shield,
  TrendingUp,
  TriangleAlert,
  UserCog,
  Wrench,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { clearAuth, getStoredAuth } from '../lib/auth'

const ROLE_CONFIG = {
  admin: {
    title: 'Administration Command Center',
    subtitle: 'Control users, departments, and system-wide metrics.',
    accentClass: 'bg-[#145f7a]',
    badgeClass: 'text-[#145f7a] border-[#145f7a]/25',
    menu: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Users', icon: UserCog },
      { label: 'Settings', icon: Settings },
    ],
    stats: [
      { label: 'Total Users', value: '128', hint: '+12 this month', icon: CircleUserRound },
      { label: 'Open Tickets', value: '42', hint: '8 high priority', icon: ClipboardList },
      { label: 'Stock Items', value: '5483', hint: 'Across all stores', icon: Boxes },
      { label: 'Alerts', value: '7', hint: 'Requires attention', icon: TriangleAlert },
    ],
  },
  manager: {
    title: 'Manager Operations Hub',
    subtitle: 'Track interventions and team throughput in real time.',
    accentClass: 'bg-[#2b8ea9]',
    badgeClass: 'text-[#2b8ea9] border-[#2b8ea9]/25',
    menu: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Interventions', icon: Wrench },
      { label: 'Reports', icon: ChartColumn },
    ],
    stats: [
      { label: 'Active Requests', value: '93', hint: '31 in progress', icon: ClipboardList },
      { label: 'Completed Today', value: '24', hint: '+5 vs yesterday', icon: TrendingUp },
      { label: 'Assigned Techs', value: '16', hint: 'All online', icon: UserCog },
      { label: 'Pending Approval', value: '11', hint: 'Manager validation', icon: TriangleAlert },
    ],
  },
  technicien: {
    title: 'Technician Workbench',
    subtitle: 'Your assigned interventions and spare-part workflow.',
    accentClass: 'bg-[#2a6f8a]',
    badgeClass: 'text-[#2a6f8a] border-[#2a6f8a]/25',
    menu: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'My Tasks', icon: ClipboardList },
      { label: 'Diagnostics', icon: Wrench },
    ],
    stats: [
      { label: 'Assigned Jobs', value: '18', hint: '6 urgent', icon: ClipboardList },
      { label: 'In Progress', value: '9', hint: 'Avg 2.1h duration', icon: TrendingUp },
      { label: 'Parts Requested', value: '27', hint: '4 waiting delivery', icon: Boxes },
      { label: 'Completed', value: '54', hint: 'This week', icon: Shield },
    ],
  },
  chefstock: {
    title: 'Stock Supervisor Deck',
    subtitle: 'Monitor inventory health and movement across items.',
    accentClass: 'bg-[#2f7f67]',
    badgeClass: 'text-[#2f7f67] border-[#2f7f67]/25',
    menu: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Inventory', icon: Boxes },
      { label: 'Requests', icon: ClipboardList },
    ],
    stats: [
      { label: 'Total Pieces', value: '5483', hint: 'Distinct items', icon: Boxes },
      { label: 'Low Stock', value: '38', hint: 'Reorder needed', icon: TriangleAlert },
      { label: 'Outgoing Today', value: '219', hint: 'To interventions', icon: TrendingUp },
      { label: 'Delivered', value: '302', hint: 'This week', icon: Shield },
    ],
  },
  receptioniste: {
    title: 'Reception Desk',
    subtitle: 'Capture new requests and monitor customer pipeline.',
    accentClass: 'bg-[#9d6b3f]',
    badgeClass: 'text-[#9d6b3f] border-[#9d6b3f]/25',
    menu: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Clients', icon: CircleUserRound },
      { label: 'Requests', icon: ClipboardList },
    ],
    stats: [
      { label: 'New Clients', value: '14', hint: 'Today', icon: CircleUserRound },
      { label: 'Devices Received', value: '29', hint: 'Queued for triage', icon: Boxes },
      { label: 'Pending Follow-up', value: '8', hint: 'Call before 17:00', icon: Bell },
      { label: 'Messages', value: '33', hint: 'Unread notifications', icon: MessageCircle },
    ],
  },
}

const salesData = [
  { label: 'Gateway Store', value: 87 },
  { label: 'The Rustic Fox', value: 72 },
  { label: 'Velvet Vine', value: 59 },
  { label: 'Blue Harbor', value: 56 },
  { label: 'Nebula Novelties', value: 39 },
]

function RoleDashboardPage({ role }) {
  const navigate = useNavigate()
  const auth = getStoredAuth()

  const config = useMemo(() => ROLE_CONFIG[role] ?? ROLE_CONFIG.manager, [role])

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-grid min-h-screen px-3 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="glass-panel hidden animate-rise p-4 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/70 dark:bg-slate-900/70 p-3">
              <div className={`h-10 w-10 rounded-full ${config.accentClass}`} />
              <div>
                <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {auth?.username ?? 'User'}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{role}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {config.menu.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="sidebar-link"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </aside>

        <section className="space-y-4">
          <header className="glass-panel animate-rise p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
                  {config.title}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">{config.subtitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-300" />
                  <input
                    className="h-9 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 pl-9 pr-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
                    placeholder="Search"
                  />
                </div>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {config.menu.map((item) => {
                const Icon = item.icon
                return (
                  <Badge key={item.label} className="bg-white/80 dark:bg-slate-900/80">
                    <Icon className="mr-1 h-3.5 w-3.5" />
                    {item.label}
                  </Badge>
                )
              })}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {config.stats.map((item, index) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className={`animate-rise delay-${(index % 3) + 1}`}>
                  <CardContent className="pt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge className={config.badgeClass}>{item.label}</Badge>
                      <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <p className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {item.value}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.hint}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="animate-rise delay-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Values</CardTitle>
                  <CardDescription>Distribution of sold units vs total units</CardDescription>
                </div>
                <Badge className={config.badgeClass}>This month</Badge>
              </CardHeader>
              <CardContent className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
                <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[conic-gradient(#145f7a_0deg,#145f7a_248deg,#b7d4df_248deg,#b7d4df_360deg)]">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-lg font-semibold text-slate-700 dark:text-slate-300">
                    68%
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Total units</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">2,859</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sold units</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">1,932</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-rise delay-2">
              <CardHeader>
                <CardTitle>Top 10 Stores by Sales</CardTitle>
                <CardDescription>Live ranked by revenue contribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {salesData.map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{row.label}</span>
                      <span>{row.value}k</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-900">
                      <div
                        className="h-2 rounded-full bg-[#145f7a]"
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

export default RoleDashboardPage
