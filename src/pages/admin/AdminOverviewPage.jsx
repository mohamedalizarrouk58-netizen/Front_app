import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { tEntity } from '../../lib/i18nLabels'
import { entityServices } from '../../services/entities'
import { parseListResponse } from '../../services/entities/crudService'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

const KPI_COLORS = {
  blue: {
    icon: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500',
    border: 'border-sky-200/50',
  },
  indigo: {
    icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
    border: 'border-indigo-200/50',
  },
  amber: {
    icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    border: 'border-amber-200/50',
  },
  emerald: {
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    border: 'border-emerald-200/50',
  },
  violet: {
    icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
    border: 'border-violet-200/50',
  },
  rose: {
    icon: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    border: 'border-rose-200/50',
  },
}

function adminModulePath(key) {
  if (key === 'messages') return '/admin/messages'
  if (key === 'achat-piece') return '/admin/achat-piece'
  if (key === 'users') return '/admin/entities/users'
  return adminEntityPath(key)
}

function listItemsFromSettled(result) {
  if (result?.status !== 'fulfilled') {
    return []
  }
  return parseListResponse(result.value).items
}

function getCountFromSettled(result) {
  if (result?.status !== 'fulfilled') return 0
  return parseListResponse(result.value).count
}

function AdminOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dataCounts, setDataCounts] = useState({
    users: 0,
    departments: 0,
    demandes: 0,
    interventions: 0,
    fiches: 0,
    factures: 0,
  })
  const [moduleCounts, setModuleCounts] = useState({})
  const [moduleErrors, setModuleErrors] = useState({})
  const [interventionStats, setInterventionStats] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        usersRes,
        departmentsRes,
        demandesRes,
        interventionsRes,
        fichesRes,
        facturesRes,
      ] = await Promise.allSettled([
        entityServices.users.list(),
        entityServices.departments.list(),
        entityServices['demande-maintenances'].list(),
        entityServices.interventions.list(),
        entityServices['fiche-reparations'].list(),
        entityServices.factures.list(),
      ])

      setDataCounts({
        users: getCountFromSettled(usersRes),
        departments: getCountFromSettled(departmentsRes),
        demandes: getCountFromSettled(demandesRes),
        interventions: getCountFromSettled(interventionsRes),
        fiches: getCountFromSettled(fichesRes),
        factures: getCountFromSettled(facturesRes),
      })

      const mDemandes = listItemsFromSettled(demandesRes)
      const mInterventions = listItemsFromSettled(interventionsRes)

      const stats = [
        {
          key: 'termine',
          name: t('status.termine'),
          value: mInterventions.filter((i) => i.statut === 'termine').length,
          color: '#10b981',
        },
        {
          key: 'en_cours',
          name: t('status.en_cours'),
          value: mInterventions.filter((i) => i.statut === 'en_cours').length,
          color: '#3b82f6',
        },
        {
          key: 'en_attente',
          name: t('status.en_attente'),
          value: mDemandes.filter((d) => d.statut === 'en_attente').length,
          color: '#f59e0b',
        },
        {
          key: 'refuse',
          name: t('status.refuse'),
          value: mInterventions.filter((i) => i.statut === 'refuse').length,
          color: '#ef4444',
        },
      ]
      setInterventionStats(stats)

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      const monthlyCounts = new Array(12).fill(0)
      mInterventions.forEach((intervention) => {
        const date = new Date(intervention.date_debut || intervention.date_creation)
        if (!Number.isNaN(date.getTime())) {
          monthlyCounts[date.getMonth()]++
        }
      })
      setMonthlyData(monthNames.map((name, index) => ({ name, count: monthlyCounts[index] })))

      const moduleResults = await Promise.all(
        ADMIN_DASHBOARD_ENDPOINTS.map(async (endpoint) => {
          const service = entityServices[endpoint.serviceKey]
          if (!service?.list) {
            return { key: endpoint.key, count: 0, error: t('Service not configured') }
          }
          try {
            const result = await service.list({ page: 1, page_size: 1 })
            return {
              key: endpoint.key,
              count: result.count ?? result.items?.length ?? 0,
              error: '',
            }
          } catch (requestError) {
            return {
              key: endpoint.key,
              count: 0,
              error: extractApiErrorMessage(requestError, t('Load failed')),
            }
          }
        }),
      )

      const nextCounts = {}
      const nextErrors = {}
      moduleResults.forEach((result) => {
        nextCounts[result.key] = result.count
        nextErrors[result.key] = result.error
      })
      setModuleCounts(nextCounts)
      setModuleErrors(nextErrors)
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const kpiData = useMemo(
    () => [
      {
        title: t('User'),
        count: dataCounts.users,
        icon: Users,
        description: t('role.admin'),
        color: 'blue',
        path: adminModulePath('users'),
      },
      {
        title: t('Modules'),
        count: dataCounts.departments,
        icon: Building2,
        description: t('dashboard.activeModules'),
        color: 'indigo',
        path: adminModulePath('departments'),
      },
      {
        title: t('dashboard.pendingDemandes'),
        count: dataCounts.demandes,
        icon: ClipboardList,
        description: t('status.en_cours'),
        color: 'amber',
        path: adminModulePath('demande-maintenances'),
      },
      {
        title: t('nav.modules'),
        count: dataCounts.interventions,
        icon: Wrench,
        description: t('status.en_cours'),
        color: 'emerald',
        path: adminModulePath('interventions'),
      },
      {
        title: t('crud.records'),
        count: dataCounts.fiches,
        icon: FileText,
        description: t('status.termine'),
        color: 'violet',
        path: adminModulePath('fiche-reparations'),
      },
      {
        title: t('dashboard.totalRecords'),
        count: dataCounts.factures,
        icon: Receipt,
        description: t('common.paid'),
        color: 'rose',
        path: adminModulePath('factures'),
      },
    ],
    [dataCounts, t],
  )

  const chartData = interventionStats
  const totalInterventions = chartData.reduce((sum, entry) => sum + entry.value, 0)
  const totalRecords = Object.values(moduleCounts).reduce((sum, value) => sum + (Number(value) || 0), 0)

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 relative"
    >
      <div className="absolute -top-32 -right-28 h-72 w-72 rounded-full bg-[#1ea0d6]/15 blur-3xl pointer-events-none -z-10" />

      <motion.header
        variants={itemVariants}
        className="glass-panel p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900"
      >
        <div className="absolute right-0 top-0 h-full w-56 bg-linear-to-l from-[#145f7a]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#145f7a] to-[#1ea0d6] text-white shadow-lg shadow-[#145f7a]/20">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t('Dashboard')}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {t('dashboard.realtime')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-xl gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('crud.refresh')}
          </Button>
        </div>
      </motion.header>

      {error ? (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
        >
          {error}
        </motion.div>
      ) : null}

      <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          const colors = KPI_COLORS[kpi.color] ?? KPI_COLORS.blue
          return (
            <motion.div key={kpi.title} variants={itemVariants}>
              <Card
                className={`cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl border ${colors.border}`}
                onClick={() => navigate(kpi.path)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {kpi.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{kpi.description}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${colors.icon}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
                    {loading ? (
                      <span className="inline-block w-10 h-8 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                    ) : (
                      kpi.count
                    )}
                  </p>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: loading
                          ? '0%'
                          : `${Math.min(100, (kpi.count / Math.max(1, totalRecords)) * 100)}%`,
                      }}
                      transition={{ duration: 0.9, ease: 'easeOut', delay: index * 0.05 }}
                      className={`h-full rounded-full ${colors.bar}`}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div variants={containerVariants} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ADMIN_DASHBOARD_ENDPOINTS.map((endpoint) => {
          const Icon = endpoint.icon
          const hasError = Boolean(moduleErrors[endpoint.key])
          return (
            <motion.div key={endpoint.key} variants={itemVariants}>
              <Card
                className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => navigate(adminModulePath(endpoint.key))}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#145f7a] opacity-80" />
                <CardContent className="pt-6 pb-5 relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {tEntity(endpoint.key)}
                      </p>
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {t('Total Records')}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-[#145f7a]/10 text-[#145f7a] shadow-inner group-hover:rotate-12 transition-transform duration-500">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                      {loading ? (
                        <span className="inline-block w-12 h-10 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                      ) : (
                        moduleCounts[endpoint.key] ?? 0
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      {hasError ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-rose-600 dark:text-rose-400">{t('ERROR')}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-wider">
                            {t('SYNCED')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 italic">
                      {t('Real-time analytics')}
                    </span>
                    <BarChart3 className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#145f7a] transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Interventions par statut
            </CardTitle>
            <CardDescription>Visualisation en temps réel du flux opérationnel</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center justify-center p-6 gap-8 min-h-[300px]">
            <div className="relative w-full max-w-[250px] aspect-square flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {totalInterventions}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Total
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {entry.value}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      (
                      {totalInterventions > 0
                        ? Math.round((entry.value / totalInterventions) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Performance Globale
            </CardTitle>
            <CardDescription>Efficacité et taux de résolution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500 font-medium">Taux de résolution</span>
                <span className="text-emerald-600 font-bold">
                  {totalInterventions > 0
                    ? Math.round(
                        ((chartData.find((d) => d.key === 'termine')?.value || 0) /
                          totalInterventions) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      totalInterventions > 0
                        ? ((chartData.find((d) => d.key === 'termine')?.value || 0) /
                            totalInterventions) *
                          100
                        : 0
                    }%`,
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/30">
                <p className="text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold mb-1">
                  En Cours
                </p>
                <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">
                  {chartData.find((d) => d.key === 'en_cours')?.value || 0}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">
                  En Attente
                </p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {chartData.find((d) => d.key === 'en_attente')?.value || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Interventions par mois
              </CardTitle>
              <CardDescription>Évolution du volume de travail annuel</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-2 sm:px-6">
            <div className="h-[300px] w-full min-h-[240px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminColorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#adminColorCount)"
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5" /> {t('Global Operations')}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              {t('Total operational volume tracked for {{role}}', { role: t('role.admin') })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="px-3 py-1 border-[#145f7a]/25 bg-[#145f7a]/10 text-[#145f7a]">
                {t('Total tracked records: {{count}}', { count: totalRecords })}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 border-slate-300 dark:border-white/10">
                {t('Active Modules: {{count}}', { count: ADMIN_DASHBOARD_ENDPOINTS.length })}
              </Badge>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <BarChart3 className="h-4 w-4" />
              {t('Use the sidebar to explore data grids')}
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default AdminOverviewPage
