import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Box,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
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
import i18n from '../../../i18n'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { DEMANDE_PIECE_DASHBOARD_GROUPS } from '../../../lib/domainConstants'
import { roleModulePath } from '../../../lib/roleWorkspaces'
import { tModule } from '../../../lib/i18nLabels'
import { entityServices } from '../../../services/entities'
import { fetchEntityDataset } from '../../../services/entities/crudService'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

const colorMap = {
  emerald: {
    accent: 'bg-emerald-500',
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/40',
  },
  sky: {
    accent: 'bg-sky-500',
    icon: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200/40',
  },
  amber: {
    accent: 'bg-amber-500',
    icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/40',
  },
  violet: {
    accent: 'bg-violet-500',
    icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200/40',
  },
}

function formatTnd(value) {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 3,
  }).format(Number(value) || 0)
}

function ChefStockOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pieces, setPieces] = useState([])
  const [demandePieces, setDemandePieces] = useState([])
  const [moduleCounts, setModuleCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [piecesData, demandesData, categoriesData, fournisseursData] = await Promise.all([
        fetchEntityDataset(entityServices.pieces),
        fetchEntityDataset(entityServices['demande-pieces']),
        fetchEntityDataset(entityServices['categories-materiel']),
        fetchEntityDataset(entityServices.fournisseurs),
      ])

      setPieces(piecesData.items)
      setDemandePieces(demandesData.items)

      const achatTracking = demandesData.items.filter((d) =>
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(
          d.statut,
        ),
      ).length
      const facturesFournisseur = demandesData.items.filter((d) => d.statut === 'livree').length

      setModuleCounts({
        pieces: piecesData.count,
        'categories-materiel': categoriesData.count,
        'demande-pieces': demandesData.count,
        'achat-piece': achatTracking + facturesFournisseur,
        fournisseurs: fournisseursData.count,
      })
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const analytics = useMemo(() => {
    const totalPieces = pieces.length
    const totalQty = pieces.reduce((s, p) => s + (Number(p.quantite_stock) || 0), 0)
    const lowStockPieces = pieces.filter((p) => Number(p.quantite_stock) <= 5)
    const totalValue = pieces.reduce(
      (s, p) => s + (Number(p.quantite_stock) || 0) * (Number(p.prix_unitaire) || 0),
      0,
    )

    const demandesEnAttente = demandePieces.filter((d) =>
      DEMANDE_PIECE_DASHBOARD_GROUPS.pending.includes(d.statut),
    ).length
    const demandesApprouvees = demandePieces.filter((d) =>
      DEMANDE_PIECE_DASHBOARD_GROUPS.approved.includes(d.statut),
    ).length
    const demandesRefusees = demandePieces.filter((d) =>
      DEMANDE_PIECE_DASHBOARD_GROUPS.refused.includes(d.statut),
    ).length

    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2024, i, 1)),
    )
    const monthlyCounts = new Array(12).fill(0)
    pieces.forEach((p) => {
      const d = new Date(p.date_creation || p.created_at)
      if (!Number.isNaN(d.getTime())) monthlyCounts[d.getMonth()]++
    })
    const stockMonthlyData = monthNames.map((name, i) => ({ name, count: monthlyCounts[i] }))

    const demandePieStats = [
      { name: t('chefstock.chart.pending'), value: demandesEnAttente, color: '#f59e0b' },
      { name: t('chefstock.chart.approved'), value: demandesApprouvees, color: '#10b981' },
      { name: t('chefstock.chart.refused'), value: demandesRefusees, color: '#ef4444' },
    ]
    const totalDemandes = demandePieStats.reduce((s, d) => s + d.value, 0)

    return {
      totalPieces,
      totalQty,
      lowStockPieces,
      totalValue,
      demandesEnAttente,
      stockMonthlyData,
      demandePieStats,
      totalDemandes,
    }
  }, [pieces, demandePieces, t])

  const kpiCards = useMemo(
    () => [
      {
        label: t('chefstock.kpi.totalPieces'),
        value: analytics.totalPieces,
        icon: Package,
        color: 'emerald',
        hint: t('chefstock.piecesHint'),
      },
      {
        label: t('chefstock.kpi.totalQty'),
        value: analytics.totalQty,
        icon: Box,
        color: 'sky',
        hint: t('chefstock.kpi.unitsAvailable'),
      },
      {
        label: t('chefstock.kpi.lowStock'),
        value: analytics.lowStockPieces.length,
        icon: AlertTriangle,
        color: 'amber',
        hint: t('chefstock.kpi.needReorder'),
      },
      {
        label: t('chefstock.kpi.pendingDemandes'),
        value: analytics.demandesEnAttente,
        icon: Clock,
        color: 'violet',
        hint: t('chefstock.demandesHint'),
      },
    ],
    [analytics, t],
  )

  const quickLinks = [
    { key: 'pieces', label: tModule('pieces') },
    { key: 'demande-pieces', label: tModule('demande-pieces') },
    { key: 'categories-materiel', label: tModule('categories-materiel') },
    { key: 'achat-piece', label: t('nav.achatPiece') },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 relative"
    >
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-linear-to-br from-emerald-500/20 via-transparent to-transparent blur-3xl opacity-20 pointer-events-none -z-10" />

      <motion.header
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex p-4 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Box className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('chefstock.roleBadge')}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-800/50">
                  {t('chefstock.moduleCount', { count: Object.keys(moduleCounts).length })}
                </Badge>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                {t('chefstock.dashboardTitle')}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
                {t('chefstock.dashboardAnalyticsSubtitle')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('chefstock.syncing') : t('crud.refresh')}
          </Button>
        </div>
      </motion.header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <motion.div variants={containerVariants} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const c = colorMap[card.color]
          const Icon = card.icon
          return (
            <motion.div key={card.label} variants={itemVariants}>
              <Card
                className={`relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl ${c.border}`}
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${c.accent} opacity-80`} />
                <CardContent className="pt-6 pb-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {card.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{card.hint}</p>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${c.icon} shadow-inner group-hover:rotate-12 transition-transform duration-500`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                      {loading ? (
                        <span className="inline-block w-12 h-10 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                      ) : (
                        card.value
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      <span className={`${c.text} text-[9px] uppercase tracking-wider`}>
                        {t('dashboard.live')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {t('chefstock.chart.monthlyMovement')}
              </CardTitle>
              <CardDescription>{t('chefstock.chart.monthlyMovementDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-2">
            <div className="h-65 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.stockMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStockChef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorStockChef)"
                    dot={{ r: 3.5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {t('chefstock.chart.demandesTitle')}
            </CardTitle>
            <CardDescription>{t('chefstock.chart.demandesDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 pt-2">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.demandePieStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {analytics.demandePieStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {analytics.totalDemandes}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                  {t('overview.total')}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {analytics.demandePieStats.map((entry, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                    <span className="text-[10px] text-slate-400">
                      (
                      {analytics.totalDemandes > 0
                        ? Math.round((entry.value / analytics.totalDemandes) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {t('chefstock.inventorySummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('chefstock.kpi.totalQty')}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                {analytics.totalQty.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('chefstock.totalStockValue')}
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                {formatTnd(analytics.totalValue)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                {t('chefstock.kpi.lowStock')}
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {analytics.lowStockPieces.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('chefstock.kpi.totalPieces')}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {analytics.totalPieces}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('chefstock.reorderTable')}
              </CardTitle>
              <CardDescription>{t('chefstock.reorderTableDesc')}</CardDescription>
            </div>
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
              {analytics.lowStockPieces.length} {t('chefstock.articles')}
            </Badge>
          </CardHeader>
          <CardContent className="overflow-auto" style={{ maxHeight: '260px' }}>
            {analytics.lowStockPieces.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-sm font-medium">{t('chefstock.stockSufficient')}</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('columns.nom')}
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('columns.categorie')}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('chefstock.stock')}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t('chefstock.price')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {analytics.lowStockPieces.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                      onClick={() => navigate(roleModulePath('chefstock', 'pieces'))}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{p.nom}</td>
                      <td className="px-3 py-2 text-slate-500">{p.categorie?.nom ?? p.categorie ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                            Number(p.quantite_stock) === 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {p.quantite_stock}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                        {formatTnd(p.prix_unitaire)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex flex-wrap gap-3">
              {quickLinks.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => navigate(roleModulePath('chefstock', m.key))}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors"
                >
                  {m.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1">
              {analytics.totalPieces} {t('chefstock.piecesLabel')} · {analytics.totalQty} {t('chefstock.unitsLabel')}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default ChefStockOverviewPage
