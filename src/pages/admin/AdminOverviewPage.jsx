import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { extractApiErrorMessage } from '../../lib/api'
import {
  ADMIN_DASHBOARD_ENDPOINTS,
  adminEntityPath,
} from '../../lib/adminEntities'
import { tEntity, tModule } from '../../lib/i18nLabels'
import { entityServices } from '../../services/entities'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#f8fafc',
  fontSize: '12px',
}

function adminModulePath(key) {
  if (key === 'messages') return '/admin/messages'
  if (key === 'achat-piece') return '/admin/achat-piece'
  if (key === 'users') return '/admin/entities/users'
  return adminEntityPath(key)
}

async function fetchEntityDataset(service) {
  if (!service?.list) {
    return { items: [], count: 0 }
  }

  try {
    const firstPage = await service.list({ page: 1, page_size: 100 })
    const total = Number(firstPage.count ?? firstPage.items?.length ?? 0)
    let items = firstPage.items ?? []

    if (firstPage.next && items.length < total && service.listAll) {
      items = await service.listAll()
    }

    return { items, count: total || items.length }
  } catch {
    return { items: [], count: 0 }
  }
}

function formatTnd(value) {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 3,
  }).format(Number(value) || 0)
}

function AdminOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState({
    users: 0,
    demandes: 0,
    interventions: 0,
    fiches: 0,
    factures: 0,
    revenue: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
  })
  const [moduleCounts, setModuleCounts] = useState({})
  const [interventionStats, setInterventionStats] = useState([])
  const [monthlyInterventions, setMonthlyInterventions] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [moduleBarData, setModuleBarData] = useState([])
  const [recentDemandes, setRecentDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncedAt, setSyncedAt] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [usersData, demandesData, interventionsData, fichesData, facturesData] =
        await Promise.all([
          fetchEntityDataset(entityServices.users),
          fetchEntityDataset(entityServices['demande-maintenances']),
          fetchEntityDataset(entityServices.interventions),
          fetchEntityDataset(entityServices['fiche-reparations']),
          fetchEntityDataset(entityServices.factures),
        ])

      const mDemandes = demandesData.items
      const mInterventions = interventionsData.items
      const mFactures = facturesData.items

      const revenue = mFactures.reduce((sum, f) => sum + (Number(f.montant_total) || 0), 0)
      const paidInvoices = mFactures.filter((f) => f.est_payee === true || f.est_payee === 'true').length
      const unpaidInvoices = mFactures.length - paidInvoices

      setAnalytics({
        users: usersData.count,
        demandes: demandesData.count,
        interventions: interventionsData.count,
        fiches: fichesData.count,
        factures: facturesData.count,
        revenue,
        paidInvoices,
        unpaidInvoices,
      })

      setInterventionStats([
        {
          key: 'termine',
          name: t('status.termine'),
          value: mInterventions.filter((i) => i.statut === 'termine').length,
          color: '#34d399',
        },
        {
          key: 'en_cours',
          name: t('status.en_cours'),
          value: mInterventions.filter((i) => i.statut === 'en_cours').length,
          color: '#60a5fa',
        },
        {
          key: 'en_attente',
          name: t('status.en_attente'),
          value: mDemandes.filter((d) => d.statut === 'en_attente').length,
          color: '#fbbf24',
        },
        {
          key: 'refuse',
          name: t('status.refuse'),
          value: mInterventions.filter((i) => i.statut === 'refuse').length,
          color: '#f87171',
        },
      ])

      const monthLabels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2024, i, 1)),
      )
      const interventionByMonth = new Array(12).fill(0)
      const revenueByMonth = new Array(12).fill(0)

      mInterventions.forEach((item) => {
        const date = new Date(item.date_debut || item.date_creation)
        if (!Number.isNaN(date.getTime())) interventionByMonth[date.getMonth()]++
      })

      mFactures.forEach((item) => {
        const date = new Date(item.date_facture)
        if (!Number.isNaN(date.getTime())) {
          revenueByMonth[date.getMonth()] += Number(item.montant_total) || 0
        }
      })

      setMonthlyInterventions(
        monthLabels.map((name, index) => ({ name, count: interventionByMonth[index] })),
      )
      setMonthlyRevenue(
        monthLabels.map((name, index) => ({ name, amount: revenueByMonth[index] })),
      )

      const moduleResults = await Promise.all(
        ADMIN_DASHBOARD_ENDPOINTS.map(async (endpoint) => {
          const service = entityServices[endpoint.serviceKey]
          const data = await fetchEntityDataset(service)
          return { key: endpoint.key, count: data.count }
        }),
      )

      const nextCounts = {}
      moduleResults.forEach((r) => {
        nextCounts[r.key] = r.count
      })
      setModuleCounts(nextCounts)

      setModuleBarData(
        moduleResults
          .map((r) => ({
            name: tEntity(r.key),
            count: r.count,
            key: r.key,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      )

      setRecentDemandes(
        [...mDemandes]
          .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
          .slice(0, 8),
      )

      setSyncedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const totalInterventions = interventionStats.reduce((sum, d) => sum + d.value, 0)
  const resolutionRate =
    totalInterventions > 0
      ? Math.round(
          ((interventionStats.find((d) => d.key === 'termine')?.value || 0) / totalInterventions) * 100,
        )
      : 0

  const heroStats = useMemo(
    () => [
      {
        label: t('dashboard.totalRecords'),
        value: Object.values(moduleCounts).reduce((s, v) => s + (Number(v) || 0), 0),
        sub: t('dashboard.activeModules'),
        icon: BarChart3,
        accent: 'from-cyan-400 to-blue-500',
      },
      {
        label: tModule('interventions'),
        value: analytics.interventions,
        sub: `${resolutionRate}% ${t('status.termine')}`,
        icon: Wrench,
        accent: 'from-emerald-400 to-teal-500',
      },
      {
        label: tModule('factures'),
        value: formatTnd(analytics.revenue),
        sub: `${analytics.paidInvoices} ${t('common.paid')}`,
        icon: Receipt,
        accent: 'from-violet-400 to-purple-500',
        isText: true,
      },
      {
        label: t('common.unpaidInvoices'),
        value: analytics.unpaidInvoices,
        sub: t('dashboard.pendingDemandes'),
        icon: Activity,
        accent: 'from-amber-400 to-orange-500',
      },
    ],
    [analytics, moduleCounts, resolutionRate, t],
  )

  const quickKpis = useMemo(
    () => [
      { label: t('User'), value: analytics.users, icon: Users, path: adminModulePath('users') },
      {
        label: t('dashboard.pendingDemandes'),
        value: analytics.demandes,
        icon: ClipboardList,
        path: adminModulePath('demande-maintenances'),
      },
      {
        label: tModule('interventions'),
        value: analytics.interventions,
        icon: Wrench,
        path: adminModulePath('interventions'),
      },
      {
        label: tModule('factures'),
        value: analytics.factures,
        icon: Receipt,
        path: adminModulePath('factures'),
      },
    ],
    [analytics, t],
  )

  const statusBadge = (statut) => {
    const map = {
      en_attente: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200/60',
      en_cours: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200/60',
      termine: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60',
      refuse: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200/60',
    }
    return map[statut] || 'bg-slate-500/10 text-slate-600 border-slate-200/60'
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 relative"
    >
      <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-violet-600/15 blur-[100px] pointer-events-none -z-10" />

      {/* Hero analytics banner */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0c4a6e] text-white shadow-2xl shadow-slate-900/40"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.2),transparent_40%)]" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200 gap-1.5">
                <Sparkles className="h-3 w-3" />
                {t('dashboard.realtime')}
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
                {t('Dashboard')}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {t('dashboard.adminAnalyticsSubtitle')}
              </p>
              {syncedAt ? (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t('chefstock.syncedAt', { time: syncedAt })}
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('crud.refresh')}
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-2 font-black tracking-tight text-white ${
                          stat.isText ? 'text-xl sm:text-2xl' : 'text-3xl'
                        }`}
                      >
                        {loading ? '—' : stat.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>
                    </div>
                    <div
                      className={`rounded-xl p-2.5 bg-gradient-to-br ${stat.accent} shadow-lg shadow-black/20`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {error ? (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
        >
          {error}
        </motion.div>
      ) : null}

      {/* Quick KPI row */}
      <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickKpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} variants={itemVariants}>
              <Card
                className="group cursor-pointer border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => navigate(kpi.path)}
              >
                <CardContent className="pt-5 pb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {loading ? '…' : kpi.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-[#145f7a]/10 text-[#145f7a] group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-[#145f7a] transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8 border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#1ea0d6]" />
              <CardTitle className="text-lg font-bold">{t('dashboard.interventionTrend')}</CardTitle>
            </div>
            <CardDescription>{t('dashboard.interventionTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthlyInterventions} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1ea0d6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1ea0d6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#1ea0d6"
                    strokeWidth={2.5}
                    fill="url(#adminArea)"
                    name={tModule('interventions')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">{t('dashboard.opsSplit')}</CardTitle>
            <CardDescription>{t('dashboard.opsSplitDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative h-44 w-44">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={interventionStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {interventionStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {totalInterventions}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                  Total
                </span>
              </div>
            </div>
            <div className="w-full space-y-2">
              {interventionStats.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-lg font-bold">{t('dashboard.moduleVolume')}</CardTitle>
            </div>
            <CardDescription>{t('dashboard.moduleVolumeDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={moduleBarData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} name={t('crud.records')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg font-bold">{t('dashboard.revenueTrend')}</CardTitle>
            </div>
            <CardDescription>{t('dashboard.revenueTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => formatTnd(value)}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} name={tModule('factures')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance + recent activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-emerald-600" />
              {t('dashboard.performance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">{t('dashboard.resolutionRate')}</span>
                <span className="font-bold text-emerald-600">{resolutionRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${resolutionRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  {t('status.en_cours')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {interventionStats.find((d) => d.key === 'en_cours')?.value || 0}
                </p>
              </div>
              <div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  {t('status.en_attente')}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {interventionStats.find((d) => d.key === 'en_attente')?.value || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">{t('dashboard.recentDemandes')}</CardTitle>
              <CardDescription>{t('dashboard.recentDemandesDesc')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#145f7a]"
              onClick={() => navigate(adminModulePath('demande-maintenances'))}
            >
              {t('module.openModule', { module: tModule('demande-maintenances') })}
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('columns.statut')}
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('columns.priorite')}
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('columns.date_creation')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentDemandes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        {t('common.noRecords')}
                      </td>
                    </tr>
                  ) : (
                    recentDemandes.map((demande) => (
                      <tr
                        key={demande.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => navigate(adminModulePath('demande-maintenances'))}
                      >
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          #{demande.id}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusBadge(demande.statut)}>
                            {demande.statut}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {demande.priorite || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">
                          {demande.date_creation
                            ? new Date(demande.date_creation).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Entity quick access */}
      <motion.div variants={itemVariants}>
        <Card className="border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl">
          <CardContent className="py-4 flex flex-wrap gap-2">
            {ADMIN_DASHBOARD_ENDPOINTS.map((endpoint) => (
              <button
                key={endpoint.key}
                type="button"
                onClick={() => navigate(adminModulePath(endpoint.key))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-[#1ea0d6]/40 hover:text-[#145f7a] dark:hover:text-[#1ea0d6] transition-colors"
              >
                {tEntity(endpoint.key)}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {moduleCounts[endpoint.key] ?? 0}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default AdminOverviewPage
