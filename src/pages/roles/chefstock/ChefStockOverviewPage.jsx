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
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { ROLE_WORKSPACES, roleModulePath } from '../../../lib/roleWorkspaces'
import { tModule } from '../../../lib/i18nLabels'
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
    hintKey: 'chefstock.piecesHint',
    descKey: 'chefstock.piecesDesc',
  },
  'categories-materiel': {
    icon: Tag,
    accent: 'from-violet-500 to-fuchsia-500',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    hintKey: 'chefstock.categoriesHint',
    descKey: 'chefstock.categoriesDesc',
  },
  'demande-pieces': {
    icon: ClipboardList,
    accent: 'from-amber-500 to-orange-500',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    hintKey: 'chefstock.demandesHint',
    descKey: 'chefstock.demandesDesc',
  },
  'achat-piece': {
    icon: Package,
    accent: 'from-emerald-500 to-teal-500',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    hintKey: 'chefstock.achatHint',
    descKey: 'chefstock.achatDesc',
  },
}

function ChefStockOverviewPage() {
  const { t } = useTranslation()
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
          
          if (key === 'demande-pieces') {
            nextCounts['prix-fournisseurs'] = Array.isArray(result.value) ? result.value.filter(d => d.statut === 'livree').length : 0
          }
        } else {
          nextCounts[key] = 0
          nextErrors[key] = extractApiErrorMessage(result.reason, 'Failed to load')
        }
      })

      // Count the active tracking commands for achat-piece
      const demandes = settled.find((s, i) => requests[i][0] === 'demande-pieces')?.value || []
      const piecesHorsStock = demandes.filter(d => 
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(d.statut)
      ).length

      nextCounts['achat-piece'] = (nextCounts.fournisseurs || 0) + piecesHorsStock + (nextCounts['prix-fournisseurs'] || 0)
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
        hintKey: 'module.defaultModuleHint',
        descKey: 'module.openModule',
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
                  {t('chefstock.roleBadge')}
                </Badge>
                <Badge className="border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  {syncedAt ? t('chefstock.syncedAt', { time: syncedAt }) : t('chefstock.syncing')}
                </Badge>
                <Badge className="border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  {t('chefstock.moduleCount', { count: visibleModules.length })}
                </Badge>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                {t('chefstock.dashboardTitle')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                {t('chefstock.dashboardSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('common.references')}</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{baseTotal}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('nav.achatPiece')}</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{primaryCount}</p>
            </div>
          </div>
        </div>
      </motion.header>

      {Object.values(errors).some(Boolean) && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 flex gap-3 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{t('common.syncPartialFail')}</p>
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
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{tModule(module.key)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.hintKey ? t(module.hintKey) : module.hint}</p>
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
                        {module.error ? t('module.syncIssue') : t('module.openModule', { module: tModule(module.key) })}
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>

                  {isPrimary ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: t('nav.fournisseurs'), value: counts.fournisseurs || 0 },
                        { label: t('chefstock.orders'), value: (counts['demande-pieces'] !== undefined) ? counts['demande-pieces'] : 0 },
                        { label: t('chefstock.invoices'), value: counts['prix-fournisseurs'] || 0 },
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


    </motion.div>
  )
}

export default ChefStockOverviewPage