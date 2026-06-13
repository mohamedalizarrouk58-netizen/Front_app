import { Boxes, ClipboardList, Package, RefreshCw, Tag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { ROLE_WORKSPACES, roleModulePath } from '../../../lib/roleWorkspaces'
import { tModule } from '../../../lib/i18nLabels'
import { entityServices } from '../../../services/entities'

const MODULE_ICONS = {
  pieces: Boxes,
  'categories-materiel': Tag,
  'demande-pieces': ClipboardList,
  'achat-piece': Package,
}

function ChefStockOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const workspace = ROLE_WORKSPACES.chefstock
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const visibleModules = workspace.modules.filter((module) => module.key !== 'messages')

  const loadCounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [pieces, categories, demandes] = await Promise.allSettled([
        entityServices.pieces?.list?.() ?? [],
        entityServices['categories-materiel']?.list?.() ?? [],
        entityServices['demande-pieces']?.list?.() ?? [],
      ])

      const getLen = (result) =>
        result.status === 'fulfilled' && Array.isArray(result.value) ? result.value.length : 0

      const demandesList =
        demandes.status === 'fulfilled' && Array.isArray(demandes.value) ? demandes.value : []
      const achatTracking = demandesList.filter((d) =>
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(
          d.statut,
        ),
      ).length
      const facturesFournisseur = demandesList.filter((d) => d.statut === 'livree').length

      setCounts({
        pieces: getLen(pieces),
        'categories-materiel': getLen(categories),
        'demande-pieces': demandesList.length,
        'achat-piece': achatTracking + facturesFournisseur,
      })
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('chefstock.dashboardTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('chefstock.dashboardSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCounts()}
          disabled={loading}
          className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('crud.refresh')}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleModules.map((module) => {
          const Icon = MODULE_ICONS[module.key] ?? Package
          const count = counts[module.key] ?? 0

          return (
            <Card
              key={module.key}
              className="cursor-pointer hover:border-emerald-300/60 transition-colors"
              onClick={() => navigate(roleModulePath('chefstock', module.key))}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {tModule(module.key)}
                </CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {loading ? '—' : count}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default ChefStockOverviewPage
