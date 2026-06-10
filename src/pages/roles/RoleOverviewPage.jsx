import { BarChart3, RefreshCw, Activity, ShieldCheck, Wrench, Users, Monitor, Box, TrendingUp, AlertTriangle, Package, CheckCircle2, Clock, XCircle, ArrowUpRight, ClipboardList } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
import { entityServices } from '../../services/entities'
import { roleModulePath } from '../../lib/roleWorkspaces'
import { DEMANDE_PIECE_DASHBOARD_GROUPS } from '../../lib/domainConstants'
import { tModule } from '../../lib/i18nLabels'
import i18n from '../../i18n'

// Animated shapes for different roles to give a "pro" specific feel
const RoleBackgrounds = {
  administrateur: "from-red-500/20 via-transparent to-transparent dark:from-red-900/20 dark:via-transparent dark:to-transparent",
  admin: "from-red-500/20 via-transparent to-transparent dark:from-red-900/20 dark:via-transparent dark:to-transparent",
  manager: "from-blue-500/20 via-transparent to-transparent dark:from-blue-900/20 dark:via-transparent dark:to-transparent",
  technicien: "from-emerald-500/20 via-transparent to-transparent dark:from-emerald-900/20 dark:via-transparent dark:to-transparent",
  chefstock: "from-amber-500/20 via-transparent to-transparent dark:from-amber-900/20 dark:via-transparent dark:to-transparent",
  receptioniste: "from-purple-500/20 via-transparent to-transparent dark:from-purple-900/20 dark:via-transparent dark:to-transparent",
}

const RoleIcons = {
  administrateur: ShieldCheck,
  admin: ShieldCheck,
  manager: Activity,
  technicien: Wrench,
  chefstock: Box,
  receptioniste: Users,
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

function RoleOverviewPage() {
  const { t } = useTranslation()
  const { role, workspace } = useOutletContext()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [interventionStats, setInterventionStats] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [stockData, setStockData] = useState({ pieces: [], demandePieces: [], loaded: false })
  const [recepData, setRecepData] = useState({ clients: [], materiels: [], demandes: [], factures: [], loaded: false })

  const loadData = useCallback(async () => {
    setLoading(true)

    const relevantModules = (workspace.modules || []).filter(m => m.key !== 'messages') 

    const requests = relevantModules.map(async (module) => {
      const serviceKeys = Array.isArray(module.serviceKeys) && module.serviceKeys.length
        ? module.serviceKeys
        : module.serviceKey
          ? [module.serviceKey]
          : []

      if (serviceKeys.length === 0) {
        return { key: module.key, count: 0, error: t('Service not configured') }
      }

      try {
        const rowsList = await Promise.all(
          serviceKeys.map(async (serviceKey) => {
            const service = entityServices[serviceKey]

            if (!service || typeof service.list !== 'function') {
              throw new Error(`${serviceKey} service not configured`)
            }

            const result = await service.list({ page: 1, page_size: 1 })
            return result.count ?? result.items?.length ?? 0
          }),
        )

        const count = rowsList.reduce((sum, value) => sum + (Number(value) || 0), 0)
        return { key: module.key, count, error: '' }
      } catch (error) {
        return {
          key: module.key,
          count: 0,
          error: extractApiErrorMessage(error, t('Load failed')),
        }
      }
    })

    const results = await Promise.all(requests)
    const nextCounts = {}
    const nextErrors = {}

    for (const result of results) {
      nextCounts[result.key] = result.count
      nextErrors[result.key] = result.error
    }

    setCounts(nextCounts)
    setErrors(nextErrors)

    // Specific logic for manager and technician interventions chart
    if (role === 'manager' || role === 'administrateur' || role === 'admin' || role === 'technicien') {
      try {
        let interventions = []
        if (role === 'technicien' && typeof entityServices.interventions.listMine === 'function') {
           interventions = await entityServices.interventions.listAll()
        } else {
           interventions = await entityServices.interventions.listAll()
        }
        
        const demands = await entityServices['demande-maintenances'].listAll()
        
        const stats = [
          { 
            key: 'termine', 
            name: 'Terminées', 
            value: interventions.filter(i => i.statut === 'termine').length,
            color: '#10b981' // Emerald 500
          },
          { 
            key: 'en_cours', 
            name: 'En cours', 
            value: interventions.filter(i => i.statut === 'en_cours').length,
            color: '#3b82f6' // Blue 500
          },
          { 
            key: 'en_attente', 
            name: 'En attente', 
            value: demands.filter(d => d.statut === 'en_attente').length,
            color: '#f59e0b' // Amber 500
          },
          { 
            key: 'refuse', 
            name: 'Annulées', 
            value: interventions.filter(i => i.statut === 'refuse').length,
            color: '#ef4444' // Red 500
          }
        ]
        setInterventionStats(stats)

        // Monthly data processing
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        const monthlyCounts = new Array(12).fill(0)
        
        interventions.forEach(i => {
          const date = new Date(i.date_debut || i.date_creation)
          if (!isNaN(date.getTime())) {
            monthlyCounts[date.getMonth()]++
          }
        })

        const formattedMonthlyData = monthNames.map((name, index) => ({
          name,
          count: monthlyCounts[index]
        }))
        setMonthlyData(formattedMonthlyData)
      } catch (err) {
        console.error(t('Failed to load intervention stats:'), err)
      }
    }

    setLoading(false)

    // Chef Stock specific data
    if (role === 'chefstock') {
      try {
        const [piecesData, demandePiecesData] = await Promise.all([
          entityServices.pieces.listAll(),
          entityServices['demande-pieces'].listAll(),
        ])
        setStockData({ pieces: piecesData, demandePieces: demandePiecesData, loaded: true })
      } catch (err) {
        console.error(t('Failed to load stock data:'), err)
      }
    }

    // Receptioniste specific data
    if (role === 'receptioniste') {
      try {
        const [clientsData, materielsData, demandesData, facturesData] = await Promise.all([
          entityServices.clients.listAll(),
          entityServices.materiels.listAll(),
          entityServices['demande-maintenances'].listAll(),
          entityServices.factures.listAll(),
        ])
        setRecepData({ clients: clientsData, materiels: materielsData, demandes: demandesData, factures: facturesData, loaded: true })
      } catch (err) {
        console.error(t('Failed to load receptioniste data:'), err)
      }
    }
  }, [workspace.modules, role, t])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadData()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [loadData])

  const totalRecords = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [counts],
  )

  const chartData = useMemo(() => interventionStats, [interventionStats])
  const totalInterventions = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData])

  const relevantModules = useMemo(() => (workspace.modules || []).filter(m => m.key !== 'messages'), [workspace.modules])
  const RoleHeroIcon = RoleIcons[role] || Monitor
  const bgGradient = RoleBackgrounds[role] || "from-slate-200 via-transparent to-transparent dark:from-slate-800 dark:via-transparent dark:to-transparent"

  // ── Receptioniste Dashboard ─────────────────────────────────────────────
  if (role === 'receptioniste') {
    const { clients, materiels, demandes, factures } = recepData

    const totalClients     = clients.length
    const totalMateriels   = materiels.length
    const pendingDemandes  = demandes.filter(d => d.statut === 'en_attente').length
    const revenue          = factures.reduce((s, f) => s + (Number(f.montant_total) || 0), 0)
    const unpaid           = factures.filter(f => !f.est_payee).length

    // Monthly demandes
    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2024, i, 1)),
    )
    const monthlyCounts = new Array(12).fill(0)
    demandes.forEach(d => {
      const dt = new Date(d.date_creation)
      if (!isNaN(dt)) monthlyCounts[dt.getMonth()]++
    })
    const monthlyDemandes = monthNames.map((name, i) => ({ name, count: monthlyCounts[i] }))

    // Materiel by etat
    const etatMap = {}
    materiels.forEach(m => { const e = m.etat || 'inconnu'; etatMap[e] = (etatMap[e] || 0) + 1 })
    const etatColors = { 'en_service': '#6366f1', 'en_panne': '#f59e0b', 'hors_service': '#ef4444', 'inconnu': '#94a3b8' }
    const materielStats = Object.entries(etatMap).map(([name, value]) => ({ name, value, color: etatColors[name] || '#94a3b8' }))
    const totalMaterielStats = materielStats.reduce((s, d) => s + d.value, 0)

    // Recent demandes for activity table
    const recentDemandes = [...demandes]
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
      .slice(0, 6)

    const kpiCards = [
      { label: tModule('clients'), value: totalClients, icon: Users, color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-400', hint: t('overview.kpi.totalRegistered'), key: 'clients' },
      { label: tModule('materiels'), value: totalMateriels, icon: Monitor, color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-400', hint: t('overview.kpi.equipment'), key: 'materiels' },
      { label: t('dashboard.pendingDemandes'), value: pendingDemandes, icon: ClipboardList, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-400', hint: t('overview.kpi.toProcess'), key: 'demande-maintenances' },
      { label: t('common.unpaidInvoices'), value: unpaid, icon: Activity, color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-400', hint: t('overview.kpi.awaitingPayment'), key: 'factures' },
    ]

    const statusLabel = { 'en_attente': 'En attente', 'approuvee': 'Approuvée', 'refuse': 'Refusée', 'en_cours': 'En cours', 'termine': 'Terminée' }
    const statusColor = { 'en_attente': 'bg-amber-100 text-amber-700', 'approuvee': 'bg-emerald-100 text-emerald-700', 'refuse': 'bg-rose-100 text-rose-700', 'en_cours': 'bg-sky-100 text-sky-700', 'termine': 'bg-slate-100 text-slate-600' }

    return (
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6 relative">
        {/* Subtle background */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-100/40 dark:bg-indigo-900/10 blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 -left-20 w-60 h-60 rounded-full bg-violet-100/30 dark:bg-violet-900/10 blur-3xl pointer-events-none -z-10" />

        {/* Header */}
        <motion.header variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">{t('Dashboard Overview')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('common.manageClients')}</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ key: 'clients' }, { key: 'materiels' }, { key: 'demande-maintenances' }, { key: 'factures' }].map(m => (
              <button
                key={m.key}
                onClick={() => navigate(roleModulePath(role, m.key))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
              >
                {tModule(m.key)} <ArrowUpRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </motion.header>

        {/* KPI Cards */}
        <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon
            const pct = loading ? 0 : Math.min(100, (card.value / Math.max(1, totalClients + totalMateriels + pendingDemandes + unpaid)) * 400)
            return (
              <motion.div key={card.label} variants={itemVariants}>
                <Card
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl cursor-pointer group"
                  onClick={() => navigate(roleModulePath(role, card.key))}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{card.hint}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${card.bg} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-4 w-4 ${card.text}`} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
                      {loading ? <span className="inline-block w-10 h-8 bg-slate-100 dark:bg-white/5 rounded animate-pulse" /> : card.value}
                    </p>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.1 }}
                        className={`h-full rounded-full ${card.bar}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart – demandes par mois */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">{tModule('demande-maintenances')}</CardTitle>
                <CardDescription>{t('overview.monthlyVolume')}</CardDescription>
              </div>
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2">{t('common.thisYear')}</Badge>
            </CardHeader>
            <CardContent className="pt-0 px-2">
              <div className="h-60 min-h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={monthlyDemandes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Bar dataKey="count" name="Demandes" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Donut – matériels par état */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">{t('common.materialState')}</CardTitle>
              <CardDescription>{t('common.byState')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 pt-2">
              <div className="relative h-36 w-36 min-h-[144px] min-w-[144px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={materielStats.length ? materielStats : [{ name: t('overview.none'), value: 1, color: '#e2e8f0' }]} cx="50%" cy="50%" innerRadius={46} outerRadius={65} paddingAngle={3} dataKey="value">
                      {(materielStats.length ? materielStats : [{ name: t('overview.none'), value: 1, color: '#e2e8f0' }]).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">{totalMateriels}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">{t('overview.total')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {materielStats.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{entry.name.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                      <span className="text-[10px] text-slate-400">({totalMaterielStats > 0 ? Math.round((entry.value/totalMaterielStats)*100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Demandes Table */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" /> {t('overview.recentActivity')}
                </CardTitle>
                <CardDescription>{t('common.recentRequests')}</CardDescription>
              </div>
              <button
                onClick={() => navigate(roleModulePath(role, 'demande-maintenances'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100 transition-colors"
              >
                {t('overview.viewAll')} <ArrowUpRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">ID</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('columns.priorite')}</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('columns.statut')}</th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('columns.date_creation')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {recentDemandes.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">{t('overview.noRequests')}</td></tr>
                    ) : recentDemandes.map(d => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => navigate(roleModulePath(role, 'demande-maintenances'))}
                      >
                        <td className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">#{d.id}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            d.priorite === 'haute' || d.priorite === 'urgent'
                              ? 'bg-rose-100 text-rose-700'
                              : d.priorite === 'moyenne'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>{d.priorite ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[d.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                            {statusLabel[d.statut] ?? d.statut ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">{d.date_creation ? new Date(d.date_creation).toLocaleDateString('fr-FR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom summary */}
        <motion.div variants={itemVariants}>
          <Card className="bg-linear-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-indigo-100 dark:border-indigo-800/30 shadow-sm rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap gap-3">
                <Badge className="border-indigo-200 bg-white/80 text-indigo-700 px-3 py-1 font-semibold">{totalClients} clients enregistrés</Badge>
                <Badge className="border-violet-200 bg-white/80 text-violet-700 px-3 py-1 font-semibold">{totalMateriels} matériels</Badge>
                <Badge className="border-amber-200 bg-white/80 text-amber-700 px-3 py-1 font-semibold">{pendingDemandes} demandes en attente</Badge>
              </div>
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                Revenu total : {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 }).format(revenue)}
              </span>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }
  // ── End Receptioniste Dashboard ─────────────────────────────────────────

  // ── Chef Stock Dashboard ────────────────────────────────────────────────
  if (role === 'chefstock') {
    const pieces = stockData.pieces
    const demandePieces = stockData.demandePieces

    const totalPieces = pieces.length
    const totalQty = pieces.reduce((s, p) => s + (Number(p.quantite_stock) || 0), 0)
    const lowStockPieces = pieces.filter(p => Number(p.quantite_stock) <= 5)
    const totalValue = pieces.reduce((s, p) => s + (Number(p.quantite_stock) || 0) * (Number(p.prix_unitaire) || 0), 0)

    const demandesEnAttente = demandePieces.filter(d => DEMANDE_PIECE_DASHBOARD_GROUPS.pending.includes(d.statut)).length
    const demandesApprouvees = demandePieces.filter(d => DEMANDE_PIECE_DASHBOARD_GROUPS.approved.includes(d.statut)).length
    const demandesRefusees = demandePieces.filter(d => DEMANDE_PIECE_DASHBOARD_GROUPS.refused.includes(d.statut)).length

    const demandePieStats = [
      { name: 'En attente', value: demandesEnAttente, color: '#f59e0b' },
      { name: 'Approuvées', value: demandesApprouvees, color: '#10b981' },
      { name: 'Refusées',   value: demandesRefusees,  color: '#ef4444' },
    ]
    const totalDemandes = demandePieStats.reduce((s, d) => s + d.value, 0)

    // Monthly stock movement by date_creation of pieces
    const monthNames = Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2024, i, 1)),
    )
    const monthlyCounts = new Array(12).fill(0)
    pieces.forEach(p => {
      const d = new Date(p.date_creation || p.created_at)
      if (!isNaN(d)) monthlyCounts[d.getMonth()]++
    })
    const stockMonthlyData = monthNames.map((name, i) => ({ name, count: monthlyCounts[i] }))

    const kpiCards = [
      { label: 'Total Pièces',      value: totalPieces,         icon: Package,       color: 'emerald', hint: 'Articles en catalogue' },
      { label: 'Quantité en stock', value: totalQty,            icon: Box,           color: 'sky',     hint: 'Unités disponibles' },
      { label: 'Stock faible (≤5)', value: lowStockPieces.length, icon: AlertTriangle, color: 'amber', hint: 'Nécessitent réapprovisionnement' },
      { label: 'Demandes en attente', value: demandesEnAttente, icon: Clock,          color: 'violet', hint: 'Pièces demandées' },
    ]

    const colorMap = {
      emerald: { accent: 'bg-emerald-500', icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/40' },
      sky:     { accent: 'bg-sky-500',     icon: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',                 dot: 'bg-sky-500',     text: 'text-sky-600 dark:text-sky-400',         border: 'border-sky-200/40' },
      amber:   { accent: 'bg-amber-500',   icon: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',         dot: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200/40' },
      violet:  { accent: 'bg-violet-500',  icon: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',     dot: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-400',   border: 'border-violet-200/40' },
    }

    return (
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6 relative">
        {/* Background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-linear-to-br from-emerald-500/20 via-transparent to-transparent blur-3xl opacity-20 pointer-events-none -z-10" />

        {/* Header */}
        <motion.header variants={itemVariants} className="glass-panel p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 hidden sm:flex">
                <Box className="w-8 h-8" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  Tableau de Bord — Stock
                  <Badge className="border-emerald-300/25 bg-emerald-100/10 text-emerald-600">Chef Stock</Badge>
                </h1>
                <p className="mt-1.5 text-base text-slate-600 dark:text-slate-400">Gestion des pièces, suivi des demandes et analyse du stock.</p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* KPI Cards */}
        <motion.div variants={containerVariants} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => {
            const c = colorMap[card.color]
            const Icon = card.icon
            return (
              <motion.div key={card.label} variants={itemVariants}>
                <Card className={`relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl cursor-pointer ${c.border}`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${c.accent} opacity-80`} />
                  <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-[0.04] group-hover:opacity-[0.09] transition-opacity bg-current" />
                  <CardContent className="pt-6 pb-5 relative">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{card.hint}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${c.icon} shadow-inner group-hover:rotate-12 transition-transform duration-500`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                        {loading ? <span className="inline-block w-12 h-10 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" /> : card.value}
                      </span>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        <span className={`${c.text} text-[9px] uppercase tracking-wider`}>{t('LIVE')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area chart – mouvement mensuel */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Mouvement Mensuel des Pièces
                </CardTitle>
                <CardDescription>Entrées de pièces par mois (année en cours)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2 px-2">
              <div className="h-65 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stockMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStockChef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStockChef)" dot={{ r: 3.5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Donut – répartition demandes */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Demandes de Pièces</CardTitle>
              <CardDescription>Répartition par statut</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-5 pt-2">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={demandePieStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                      {demandePieStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalDemandes}</span>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {demandePieStats.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                      <span className="text-[10px] text-slate-400">({totalDemandes > 0 ? Math.round((entry.value / totalDemandes) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Row: Résumé stock + Table pièces */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Résumé inventaire */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" /> Résumé de l'Inventaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantité disponible</span>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{totalQty.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valeur totale stock</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                  {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 }).format(totalValue)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Articles stock faible</span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{lowStockPieces.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total articles</span>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalPieces}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pièces à réapprovisionner */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Pièces à Réapprovisionner
                </CardTitle>
                <CardDescription>Articles dont le stock est ≤ 5 unités</CardDescription>
              </div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">{lowStockPieces.length} article{lowStockPieces.length !== 1 ? 's' : ''}</Badge>
            </CardHeader>
            <CardContent className="overflow-auto" style={{ maxHeight: '260px' }}>
              {lowStockPieces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium">Tous les stocks sont suffisants</p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Nom</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Catégorie</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Prix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {lowStockPieces.map(p => (
                      <tr
                        key={p.id}
                        className="hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors cursor-pointer"
                        onClick={() => navigate(roleModulePath(role, 'pieces'))}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{p.nom}</td>
                        <td className="px-3 py-2 text-slate-500">{p.categorie?.nom ?? p.categorie ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                            Number(p.quantite_stock) === 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>{p.quantite_stock}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          {Number(p.prix_unitaire).toLocaleString('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 3 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick access links */}
        <motion.div variants={itemVariants}>
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap gap-3">
                {[{key:'pieces',label:'Stock Pièce'},{key:'demande-pieces',label:'Pièces Demandées'},{key:'categories-materiel',label:'Catégories'}].map(m => (
                  <button
                    key={m.key}
                    onClick={() => navigate(roleModulePath(role, m.key))}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 transition-colors"
                  >
                    {m.label} <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1">
                {totalPieces} pièces · {totalQty} unités
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }
  // ── End Chef Stock Dashboard ─────────────────────────────────────────────

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-6 relative"
    >
      {/* Role specific abstract background glow */}
      <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full bg-linear-to-br ${bgGradient} blur-3xl opacity-20 pointer-events-none -z-10`} />

      <motion.header variants={itemVariants} className="glass-panel p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-linear-to-l from-current opacity-5 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${workspace.iconClass} hidden sm:flex`}>
              <RoleHeroIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 capitalize flex flex-wrap items-center gap-2 leading-tight">
                {workspace.title}
                <Badge className={workspace.badgeClass}>{role}</Badge>
              </h1>
              <p className="mt-1.5 text-base text-slate-600 dark:text-slate-400 max-w-xl">{workspace.subtitle}</p>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div variants={containerVariants} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {relevantModules.map((module) => {
          const Icon = module.icon
          const hasError = Boolean(errors[module.key])

          return (
            <motion.div key={module.key} variants={itemVariants}>
              <Card 
                className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => navigate(roleModulePath(role, module.key))}
              >
                {/* Accent line and background glow */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${workspace.badgeClass.split(' ')[0]} opacity-80`} />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity" />
                
                <CardContent className="pt-6 pb-5 relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {module.label}
                      </p>
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('Total Records')}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${workspace.iconClass} bg-opacity-10 dark:bg-opacity-20 shadow-inner group-hover:rotate-12 transition-transform duration-500`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                        {loading ? (
                          <span className="inline-block w-12 h-10 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                        ) : (
                          counts[module.key] ?? 0
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      {hasError ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-rose-600 dark:text-rose-400">{t('ERROR')}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-wider">{t('SYNCED')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                      {t('Real-time analytics')}
                    </span>
                    <motion.div 
                      whileHover={{ x: 3 }}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-current transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {(role === 'manager' || role === 'administrateur' || role === 'admin' || role === 'technicien') && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Interventions par statut</CardTitle>
              <CardDescription>Visualisation en temps réel du flux opérationnel</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center justify-center p-6 gap-8 min-h-75">
              <div className="relative w-full max-w-62.5 aspect-square flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
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
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full md:w-auto min-w-50">
                {chartData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({totalInterventions > 0 ? Math.round((entry.value / totalInterventions) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Performance Globale</CardTitle>
              <CardDescription>Efficacité et taux de résolution</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center gap-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500 font-medium">Taux de résolution</span>
                    <span className="text-emerald-600 font-bold">
                      {totalInterventions > 0 ? Math.round(((chartData.find(d => d.key === 'termine')?.value || 0) / totalInterventions) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${totalInterventions > 0 ? ((chartData.find(d => d.key === 'termine')?.value || 0) / totalInterventions * 100) : 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/30">
                    <p className="text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold mb-1">En Cours</p>
                    <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">{chartData.find(d => d.key === 'en_cours')?.value || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                    <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">En Attente</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{chartData.find(d => d.key === 'en_attente')?.value || 0}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(role === 'manager' || role === 'administrateur' || role === 'admin' || role === 'technicien') && (
        <motion.div variants={itemVariants}>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Interventions par mois</CardTitle>
                <CardDescription>Évolution du volume de travail annuel</CardDescription>
              </div>
              <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold outline-none ring-sky-500/30 focus:ring-2">
                <option>Cette année</option>
                <option>L'année dernière</option>
              </select>
            </CardHeader>
            <CardContent className="pt-4 px-2 sm:px-6">
              <div className="h-75 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                      fill="url(#colorCount)" 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-5 w-5" /> {t('Global Operations')}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              {t('Total operational volume tracked for {{role}}', { role })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`px-3 py-1 ${workspace.badgeClass}`}>
                {t('Total tracked records: {{count}}', { count: totalRecords })}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 border-slate-300 dark:border-white/10 dark:text-slate-800">
                {t('Active Modules: {{count}}', { count: relevantModules.length })}
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

export default RoleOverviewPage
