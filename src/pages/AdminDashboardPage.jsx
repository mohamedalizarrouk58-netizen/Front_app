import {
  Activity,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  HardDrive,
  Inbox,
  LogOut,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCog,
  Users,
  Wrench,
  BarChart3,
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { api, extractApiErrorMessage } from '../lib/api'

const MODULES = [
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    endpoint: '/api/users/',
    columns: [
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', badge: true },
      { key: 'telephone', label: 'Phone' },
    ],
  },
  {
    key: 'departments',
    label: 'Departments',
    icon: Building2,
    endpoint: '/api/departments/',
    columns: [
      { key: 'nom_dept', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'date_creation', label: 'Created', type: 'date' },
    ],
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: UserCog,
    endpoint: '/api/clients/',
    columns: [
      { key: 'nom_complet', label: 'Client' },
      { key: 'email', label: 'Email' },
      { key: 'telephone', label: 'Phone' },
      { key: 'adresse', label: 'Address' },
    ],
  },
  {
    key: 'materiels',
    label: 'Materiels',
    icon: HardDrive,
    endpoint: '/api/materiels/',
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'marque', label: 'Brand' },
      { key: 'modele', label: 'Model' },
      { key: 'etat', label: 'Status', badge: true },
    ],
  },
  {
    key: 'demandes',
    label: 'Demande Maintenances',
    icon: ClipboardList,
    endpoint: '/api/demande-maintenances/',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'priorite', label: 'Priority', badge: true },
      { key: 'statut', label: 'Status', badge: true },
      { key: 'date_creation', label: 'Created', type: 'date' },
    ],
  },
  {
    key: 'interventions',
    label: 'Interventions',
    icon: Wrench,
    endpoint: '/api/interventions/',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'diagnostic', label: 'Diagnostic' },
      { key: 'solution_proposee', label: 'Proposed Solution' },
      { key: 'statut', label: 'Status', badge: true },
    ],
  },
  {
    key: 'pieces',
    label: 'Stock Pièce',
    icon: Boxes,
    endpoint: '/api/pieces/',
    columns: [
      { key: 'nom', label: 'Name' },
      { key: 'quantite_stock', label: 'Stock' },
      { key: 'prix_unitaire', label: 'Price', type: 'currency' },
    ],
  },
  {
    key: 'demandePieces',
    label: 'Pièce Demandée',
    icon: Inbox,
    endpoint: '/api/demande-pieces/',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'quantite', label: 'Qty' },
      { key: 'statut', label: 'Status', badge: true },
      { key: 'date_demande', label: 'Date', type: 'date' },
    ],
  },
  {
    key: 'factures',
    label: 'Factures',
    icon: CircleDollarSign,
    endpoint: '/api/factures/',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'montant_total', label: 'Amount', type: 'currency' },
      { key: 'est_payee', label: 'Paiement', type: 'boolean' },
      { key: 'date_facture', label: 'Date', type: 'date' },
    ],
  },
  {
    key: 'paiements',
    label: 'Paiements',
    icon: CircleDollarSign,
    endpoint: '/api/paiements/',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'montant', label: 'Amount', type: 'currency' },
      { key: 'mode_paiement', label: 'Method', badge: true },
      { key: 'date_paiement', label: 'Date', type: 'date' },
    ],
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: MessageCircle,
    endpoint: '/api/messages/',
    columns: [
      { key: 'objet', label: 'Subject' },
      { key: 'expediteur', label: 'From' },
      { key: 'destinataire', label: 'To' },
      { key: 'date_envoi', label: 'Sent', type: 'date' },
    ],
  },
]

function normalizeArrayPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

function getStatusTone(value) {
  const normalized = String(value ?? '').toLowerCase()

  if (
    normalized.includes('termine') ||
    normalized.includes('livree') ||
    normalized.includes('approuvee') ||
    normalized.includes('payee') ||
    normalized.includes('true')
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (
    normalized.includes('refuse') ||
    normalized.includes('non résolu') ||
    normalized.includes('false') ||
    normalized.includes('haute') ||
    normalized.includes('urgent')
  ) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  if (
    normalized.includes('en_cours') ||
    normalized.includes('en cours') ||
    normalized.includes('attente')
  ) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  return 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
}

function readByPath(row, path) {
  return path
    .split('.')
    .reduce((current, segment) => (current == null ? current : current[segment]), row)
}

function formatCellValue(value, columnType) {
  if (value == null || value === '') {
    return '-'
  }

  if (columnType === 'date') {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return String(value)
    }

    return parsed.toLocaleDateString()
  }

  if (columnType === 'currency') {
    const amount = Number(value)
    if (Number.isNaN(amount)) {
      return String(value)
    }

    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'en_cours') return 'En cours'
    if (lower === 'termine') return 'Terminé'
    if (lower === 'refuse') return 'Non résolu'
    if (lower === 'en_attente') return 'En attente'
  }

  if (columnType === 'boolean') {
    return value ? 'Oui' : 'Non'
  }

  if (typeof value === 'object') {
    if (value.username) {
      return value.username
    }

    if (value.nom_dept) {
      return value.nom_dept
    }

    if (value.nom_complet) {
      return value.nom_complet
    }

    if (value.id) {
      return `#${value.id}`
    }

    return JSON.stringify(value)
  }

  if (typeof value === 'string') {
    if (value === 'refuse') return 'Non résolu'
    if (value === 'termine') return 'Terminé'
    if (value === 'en_cours') return 'En cours'
    if (value === 'en_attente') return 'En attente'
  }

  return String(value)
}

function buildInitialDataMap() {
  return MODULES.reduce((accumulator, module) => {
    accumulator[module.key] = {
      rows: [],
      loading: false,
      error: '',
      fetchedAt: null,
    }

    return accumulator
  }, {})
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const auth = getStoredAuth()

  const [dataMap, setDataMap] = useState(() => buildInitialDataMap())
  const [activeModuleKey, setActiveModuleKey] = useState('users')
  const [globalLoading, setGlobalLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const activeModule = MODULES.find((module) => module.key === activeModuleKey) ?? MODULES[0]
  const activeData = dataMap[activeModule.key] ?? {
    rows: [],
    error: '',
    fetchedAt: null,
    loading: false,
  }

  const loadAllModules = useCallback(async () => {
    setGlobalLoading(true)

    setDataMap((prevMap) => {
      const nextMap = { ...prevMap }

      for (const module of MODULES) {
        nextMap[module.key] = {
          ...nextMap[module.key],
          loading: true,
          error: '',
        }
      }

      return nextMap
    })

    const requests = MODULES.map(async (module) => {
      try {
        const response = await api.get(module.endpoint)
        return {
          key: module.key,
          rows: normalizeArrayPayload(response.data),
          error: '',
          fetchedAt: new Date().toISOString(),
        }
      } catch (error) {
        return {
          key: module.key,
          rows: [],
          error: extractApiErrorMessage(error, 'Unable to load this module.'),
          fetchedAt: new Date().toISOString(),
        }
      }
    })

    const results = await Promise.all(requests)

    setDataMap((prevMap) => {
      const nextMap = { ...prevMap }

      for (const result of results) {
        nextMap[result.key] = {
          rows: result.rows,
          error: result.error,
          fetchedAt: result.fetchedAt,
          loading: false,
        }
      }

      return nextMap
    })

    setGlobalLoading(false)
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadAllModules()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [loadAllModules])

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const kpis = useMemo(() => {
    const users = dataMap.users?.rows ?? []
    const demandes = dataMap.demandes?.rows ?? []
    const interventions = dataMap.interventions?.rows ?? []
    const factures = dataMap.factures?.rows ?? []
    const messages = dataMap.messages?.rows ?? []
    const pieces = dataMap.pieces?.rows ?? []

    const pendingDemandes = demandes.filter((row) => row.statut === 'en_attente').length
    const activeInterventions = interventions.filter((row) => row.statut === 'en_cours').length
    const unpaidFactures = factures.filter((row) => !row.est_payee).length
    const totalRevenue = factures.reduce(
      (sum, row) => sum + (Number(row.montant_total) || 0),
      0,
    )
    const lowStockPieces = pieces.filter((row) => Number(row.quantite_stock) <= 5).length

    return [
      { label: 'Users', value: users.length, hint: 'All registered accounts', icon: Users, targetKey: 'users' },
      { label: 'Pending Requests', value: pendingDemandes, hint: 'Demande maintenance', icon: ClipboardList, targetKey: 'demande-maintenances' },
      { label: 'Interventions Live', value: activeInterventions, hint: 'Status en_cours', icon: Wrench, targetKey: 'interventions' },
      { label: 'Unpaid Factures', value: unpaidFactures, hint: 'Outstanding invoices', icon: CircleDollarSign, targetKey: 'factures' },
      {
        label: 'Revenue (Factures)',
        value: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
          totalRevenue,
        ),
        hint: 'Current total billed',
        icon: Activity,
        targetKey: 'factures'
      },
      { label: 'Stock Pièce (Bas)', value: lowStockPieces, hint: 'Qty <= 5', icon: ShieldAlert, targetKey: 'pieces' },
      { label: 'Messages', value: messages.length, hint: 'Internal communication', icon: MessageCircle, targetKey: 'messages' },
    ]
  }, [dataMap])

  const chartData = useMemo(() => {
    const interventions = dataMap.interventions?.rows ?? []
    const demands = dataMap.demandes?.rows ?? []
    
    return [
      { key: 'termine', name: 'Terminées', value: interventions.filter(i => i.statut === 'termine').length, color: '#10b981' },
      { key: 'en_cours', name: 'En cours', value: interventions.filter(i => i.statut === 'en_cours').length, color: '#3b82f6' },
      { key: 'en_attente', name: 'En attente', value: demands.filter(d => d.statut === 'en_attente').length, color: '#f59e0b' },
      { key: 'refuse', name: 'Annulées', value: interventions.filter(i => i.statut === 'refuse').length, color: '#ef4444' }
    ]
  }, [dataMap])

  const monthlyData = useMemo(() => {
    const interventions = dataMap.interventions?.rows ?? []
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const monthlyCounts = new Array(12).fill(0)
    
    interventions.forEach(i => {
      const date = new Date(i.date_debut || i.date_creation)
      if (!isNaN(date.getTime())) {
        monthlyCounts[date.getMonth()]++
      }
    })

    return monthNames.map((name, index) => ({ name, count: monthlyCounts[index] }))
  }, [dataMap])

  const totalInterventions = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData])


  const activityFeed = useMemo(() => {
    const demandes = (dataMap.demandes?.rows ?? []).map((row) => ({
      kind: 'Demande',
      label: `Maintenance request #${row.id}`,
      detail: `Priority ${row.priorite ?? '-'} | Status ${row.statut ?? '-'}`,
      date: row.date_creation,
    }))

    const interventions = (dataMap.interventions?.rows ?? []).map((row) => ({
      kind: 'Intervention',
      label: `Intervention #${row.id}`,
      detail: row.diagnostic ?? row.solution_proposee ?? 'No diagnostic yet',
      date: row.date_debut ?? row.date_fin,
    }))

    const messages = (dataMap.messages?.rows ?? []).map((row) => ({
      kind: 'Message',
      label: row.objet || `Message #${row.id}`,
      detail: row.contenu ? String(row.contenu).slice(0, 100) : 'No message body',
      date: row.date_envoi,
    }))

    return [...demandes, ...interventions, ...messages]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8)
  }, [dataMap])

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) {
      return activeData.rows
    }

    const keyword = searchText.toLowerCase()

    return activeData.rows.filter((row) => {
      const values = Object.values(row ?? {})
      return values.some((value) => String(value ?? '').toLowerCase().includes(keyword))
    })
  }, [activeData.rows, searchText])

  const availableModules = useMemo(
    () => MODULES.filter((module) => !(dataMap[module.key]?.error && dataMap[module.key]?.rows.length === 0)),
    [dataMap],
  )

  return (
    <main className="dashboard-grid min-h-screen px-3 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 xl:flex-row">
        <aside className="glass-panel hidden w-[280px] animate-rise p-4 xl:flex xl:flex-col xl:justify-between">
          <div className="space-y-5">
            <div className="rounded-xl border border-white/80 bg-white/80 dark:bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Signed in as</p>
              <p className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {auth?.username ?? 'Administrator'}
              </p>
              <Badge className="mt-2 border-[#145f7a]/20 bg-[#145f7a]/10 text-[#145f7a]">
                Admin
              </Badge>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Administration Modules
              </p>
              <div className="space-y-1.5">
                {MODULES.map((module) => {
                  const Icon = module.icon
                  const isActive = module.key === activeModuleKey
                  const hasError = Boolean(dataMap[module.key]?.error)

                  return (
                    <button
                      key={module.key}
                      type="button"
                      className={`sidebar-link justify-between ${isActive ? 'border-[#145f7a]/30 bg-slate-50 dark:bg-slate-900 text-[#145f7a]' : ''}`}
                      onClick={() => setActiveModuleKey(module.key)}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {module.label}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        {hasError ? (
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </aside>

        <section className="flex-1 space-y-4">
          <header className="glass-panel animate-rise p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
                  Admin Control Tower
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                  Complete operational interface for users, maintenance, inventory, billing,
                  and communication.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="bg-white/70 dark:bg-slate-900/70">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-300" />
                <input
                  className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 pl-9 pr-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
                  placeholder={`Search inside ${activeModule.label}`}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>

              <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">
                <CalendarClock className="h-4 w-4" />
                {activeData.fetchedAt
                  ? `Synced ${new Date(activeData.fetchedAt).toLocaleTimeString()}`
                  : 'Not synced yet'}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {MODULES.map((module) => {
                const Icon = module.icon
                const isActive = module.key === activeModuleKey

                return (
                  <button
                    key={module.key}
                    type="button"
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      isActive
                        ? 'border-[#145f7a]/30 bg-[#145f7a]/10 text-[#145f7a]'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                    onClick={() => setActiveModuleKey(module.key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {module.label}
                  </button>
                )
              })}
            </div>
          </header>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kpis.map((item, index) => {
              const Icon = item.icon

              return (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl cursor-pointer h-full"
                    onClick={() => {
                      if (item.targetKey) setActiveModuleKey(item.targetKey)
                    }}
                  >
                    {/* Accent line and background glow */}
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-80" />
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500 opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity" />
                    
                    <CardContent className="pt-6 pb-5 relative">
                      <div className="flex items-center justify-between mb-5">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {item.label}
                          </p>
                          <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {item.hint}
                          </h3>
                        </div>
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                            {item.value}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-wider">LIVE</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                          Click to view grid
                        </span>
                        <motion.div 
                          whileHover={{ x: 3 }}
                          className="text-slate-300 dark:text-slate-600 group-hover:text-red-500 transition-colors"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-white/5 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" /> Interventions par statut
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-center p-4 gap-6 min-h-[250px]">
                <div className="relative w-full max-w-[200px] aspect-square flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
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
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{totalInterventions}</span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto min-w-[150px]">
                  {chartData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-white/5 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Activité Mensuelle</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 px-2">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCountAdmin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCountAdmin)" dot={{ r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
            <Card className="animate-rise delay-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{activeModule.label}</CardTitle>
                  <CardDescription>
                    Showing {filteredRows.length} of {activeData.rows.length} records
                  </CardDescription>
                </div>

                {activeData.error ? (
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700">Load error</Badge>
                ) : (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Connected
                  </Badge>
                )}
              </CardHeader>

              <CardContent>
                {activeData.error ? (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {activeData.error}
                  </p>
                ) : null}

                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="max-h-[430px] overflow-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-400">
                        <tr>
                          {activeModule.columns.map((column) => (
                            <th key={column.key} className="px-3 py-2 font-semibold">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRows.slice(0, 120).map((row, rowIndex) => (
                          <tr
                            key={row.id ?? `${activeModule.key}-${rowIndex}`}
                            className="border-t border-slate-200 dark:border-slate-700/70 bg-white/75 dark:bg-slate-900/75 hover:bg-slate-50 dark:bg-slate-900"
                          >
                            {activeModule.columns.map((column) => {
                              const rawValue = readByPath(row, column.key)
                              const displayValue = formatCellValue(rawValue, column.type)

                              return (
                                <td key={`${column.key}-${rowIndex}`} className="px-3 py-2 align-top">
                                  {column.badge ? (
                                    <span
                                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusTone(
                                        displayValue,
                                      )}`}
                                    >
                                      {displayValue}
                                    </span>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300">{displayValue}</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!activeData.loading && filteredRows.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No records found for this module with the current filter.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="animate-rise delay-2">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Endpoint-level availability status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {MODULES.map((module) => {
                    const Icon = module.icon
                    const hasError = Boolean(dataMap[module.key]?.error)
                    const itemRows = dataMap[module.key]?.rows?.length ?? 0

                    return (
                      <div
                        key={module.key}
                        className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-3 py-2"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{module.label}</span>
                        </div>

                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{itemRows}</span>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${hasError ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="animate-rise delay-3">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest records across requests, interventions, and messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activityFeed.map((activity, index) => (
                    <div
                      key={`${activity.kind}-${activity.label}-${index}`}
                      className="rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activity.label}</p>
                        <Badge>{activity.kind}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{activity.detail}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {activity.date
                          ? new Date(activity.date).toLocaleString()
                          : 'No timestamp'}
                      </p>
                    </div>
                  ))}

                  {activityFeed.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity found yet.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="animate-rise delay-1">
                <CardHeader>
                  <CardTitle>Coverage</CardTitle>
                  <CardDescription>Loaded modules from your API scope</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {availableModules.length} / {MODULES.length} modules currently available.
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-900">
                    <div
                      className="h-2 rounded-full bg-[#145f7a]"
                      style={{
                        width: `${(availableModules.length / MODULES.length) * 100}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboardPage
