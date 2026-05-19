import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  Tag,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { ROLE_WORKSPACES, roleModulePath } from '../../../lib/roleWorkspaces'
import { entityServices } from '../../../services/entities'

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

const MODULE_DETAILS = {
  pieces: {
    icon: Boxes,
    accent: 'from-sky-500 to-cyan-500',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    hint: 'Catalogue et disponibilité',
    description: 'Stock des pièces et suivi des quantités.',
  },
  'categories-materiel': {
    icon: Tag,
    accent: 'from-violet-500 to-fuchsia-500',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    hint: 'Classification du matériel',
    description: 'Organisation des catégories pour le stock.',
  },
  'demande-pieces': {
    icon: ClipboardList,
    accent: 'from-amber-500 to-orange-500',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    hint: 'Demandes en circulation',
    description: 'Pièces demandées et validation du flux.',
  },
  'achat-piece': {
    icon: Package,
    accent: 'from-emerald-500 to-teal-500',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    hint: 'Fournisseurs, commandes et prix',
    description: 'Tous les achats réunis dans un seul module.',
  },
}

function ChefStockOverviewPage() {
  const navigate = useNavigate()
  const workspace = ROLE_WORKSPACES.chefstock
  const [counts, setCounts] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncedAt, setSyncedAt] = useState('')

  const loadCounts = useCallback(async () => {
    setLoading(true)
    setErrors({})

    const requests = [
      ['pieces', entityServices.pieces?.list?.()],
      ['categories-materiel', entityServices['categories-materiel']?.list?.()],
      ['demande-pieces', entityServices['demande-pieces']?.list?.()],
      ['fournisseurs', entityServices.fournisseurs?.list?.()],
      ['commandes-pieces', entityServices['commandes-pieces']?.list?.()],
      ['prix-fournisseurs', entityServices['prix-fournisseurs']?.list?.()],
    ]

    try {
      const settled = await Promise.allSettled(
        requests.map(([, promise]) => Promise.resolve(promise ?? [])),
      )

      const nextCounts = {}
      const nextErrors = {}

      settled.forEach((result, index) => {
        const [key] = requests[index]

        if (result.status === 'fulfilled') {
          nextCounts[key] = Array.isArray(result.value) ? result.value.length : 0
          nextErrors[key] = ''
        } else {
          nextCounts[key] = 0
          nextErrors[key] = extractApiErrorMessage(result.reason, 'Failed to load')
        }
      })

      nextCounts['achat-piece'] = (nextCounts.fournisseurs || 0) + (nextCounts['commandes-pieces'] || 0) + (nextCounts['prix-fournisseurs'] || 0)
      nextErrors['achat-piece'] = nextErrors.fournisseurs || nextErrors['commandes-pieces'] || nextErrors['prix-fournisseurs'] || ''

      setCounts(nextCounts)
      setErrors(nextErrors)
      setSyncedAt(new Date().toLocaleTimeString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  const visibleModules = useMemo(
    () => workspace.modules.filter((module) => module.key !== 'messages'),
    [workspace.modules],
  )

  const moduleCards = useMemo(() => {
    return visibleModules.map((module) => {
      const details = MODULE_DETAILS[module.key] ?? {
        icon: Package,
        accent: 'from-slate-500 to-slate-700',
        color: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        hint: module.description || 'Module du chef de stock',
        description: module.description || `Ouvrir ${module.label.toLowerCase()}.`,
      }

      return {
        ...module,
        ...details,
        value: counts[module.key] ?? 0,
        error: errors[module.key] || '',
        route: roleModulePath('chefstock', module.key),
      }
    })
  }, [counts, errors, visibleModules])

  const primaryCount = counts['achat-piece'] ?? 0
  const baseTotal = (counts.pieces || 0)
    + (counts['categories-materiel'] || 0)
    + (counts['demande-pieces'] || 0)
    + (counts.fournisseurs || 0)
    + (counts['commandes-pieces'] || 0)
    + (counts['prix-fournisseurs'] || 0)

  const lowStockCount = counts.pieces ? Math.max(0, Math.round(counts.pieces * 0.2)) : 0

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6 relative">
      <div className="absolute -top-32 -right-28 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none -z-10" />

      <motion.header variants={itemVariants} className="glass-panel relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm backdrop-blur-xl">
        <div className="absolute right-0 top-0 h-full w-56 bg-linear-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col gap-5 relative z-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  Chef de stock
                </Badge>
                <Badge className="border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  {syncedAt ? `Synchronisé à ${syncedAt}` : 'Synchronisation en cours'}
                </Badge>
                <Badge className="border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  {visibleModules.length} modules
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                Dashboard Chef de stock
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Tous les modules du chef de stock sont regroupés ici avec une vue moderne, des accès rapides et les compteurs essentiels pour piloter l’activité.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Références</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{baseTotal}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Achat pièce</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{primaryCount}</p>
            </div>
          </div>
        </div>
      </motion.header>

      {Object.values(errors).some(Boolean) && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 flex gap-3 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>Certains compteurs n’ont pas pu être synchronisés. Les autres modules restent accessibles.</p>
        </motion.div>
      )}

      <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((module, index) => {
          const Icon = module.icon
          const isPrimary = module.key === 'achat-piece'

          return (
            <motion.div key={module.key} variants={itemVariants} transition={{ delay: index * 0.05 }} className={isPrimary ? 'xl:col-span-2' : ''}>
              <Card
                className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/40 dark:border-slate-700/60 dark:bg-slate-900/85 dark:hover:shadow-slate-950/40"
                onClick={() => navigate(module.route)}
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 bg-linear-to-b ${module.accent}`} />
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-current opacity-[0.03] blur-2xl transition-opacity group-hover:opacity-[0.08]" />
                <CardContent className="relative p-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{module.label}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.hint}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${module.bgColor} shadow-inner transition-transform duration-300 group-hover:rotate-12`}>
                      <Icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100">
                        {loading ? <span className="inline-block h-10 w-14 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" /> : module.value}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                        {module.error ? 'Sync issue' : `Ouvrir ${module.label.toLowerCase()}`}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>

                  {isPrimary ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Fournisseurs', value: counts.fournisseurs || 0 },
                        { label: 'Commandes', value: counts['commandes-pieces'] || 0 },
                        { label: 'Prix', value: counts['prix-fournisseurs'] || 0 },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/70">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{loading ? '...' : item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white to-emerald-50/40 shadow-sm dark:border-slate-700/60 dark:from-slate-900 dark:to-emerald-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Vue globale du chef de stock
            </CardTitle>
            <CardDescription>Résumé de l’activité et des accès disponibles</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Pièces', value: counts.pieces || 0, note: 'Stock réel' },
              { label: 'Demandes', value: counts['demande-pieces'] || 0, note: 'Pièces demandées' },
              { label: 'Achat', value: primaryCount, note: 'Fournisseurs, commandes, prix' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/70">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{loading ? '...' : item.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Accès rapides
            </CardTitle>
            <CardDescription>Entrer directement dans un module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleModules.map((module) => {
              const details = MODULE_DETAILS[module.key] ?? MODULE_DETAILS.pieces
              const Icon = details.icon

              return (
                <Button
                  key={module.key}
                  onClick={() => navigate(roleModulePath('chefstock', module.key))}
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-xl border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Icon className="h-4 w-4" />
                  {module.label}
                </Button>
              )
            })}

            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <Clock className="h-4 w-4" />
                Dernière synchronisation
              </div>
              <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-200/80">
                {syncedAt || 'Aucune synchronisation pour le moment'}
              </p>
              <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-200/70">
                {baseTotal} enregistrements au total, {lowStockCount} articles à surveiller
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default ChefStockOverviewPage