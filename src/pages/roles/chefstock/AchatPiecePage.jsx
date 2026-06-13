import {
  ArrowRight,
  ClipboardList,
  Package,
  RefreshCw,
  Tag,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { entityServices } from '../../../services/entities'
import { extractListItems } from '../../../services/entities/crudService'

function AchatPiecePage({ rolePath = 'chefstock' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({
    fournisseurs: 0,
    commandes: 0,
    prix: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCounts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
    const [fournisseursRes, demandesRes] = await Promise.all([
        entityServices.fournisseurs?.list?.() ?? { items: [] },
        entityServices['demande-pieces']?.list?.() ?? { items: [] },
      ])

      const fournisseurs = extractListItems(fournisseursRes)
      const demandesPieces = extractListItems(demandesRes)

      const piecesHorsStock = demandesPieces.filter((d) =>
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(
          d.statut,
        ),
      )

      const facturesCount = demandesPieces.filter((d) => d.statut === 'livree').length

      setCounts({
        fournisseurs: fournisseurs.length,
        commandes: piecesHorsStock.length,
        prix: facturesCount,
      })
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Impossible de charger les indicateurs Achat Pièce.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  const cards = useMemo(
    () => [
      {
        key: 'fournisseurs',
        title: t('achat.fournisseurs'),
        description: t('achat.fournisseursDesc'),
        value: counts.fournisseurs,
        icon: Truck,
        className: 'from-sky-600 to-cyan-500',
        action: () => navigate(`/${rolePath}/fournisseurs`),
      },
      {
        key: 'commandes',
        title: t('achat.suivi'),
        description: t('achat.suiviDesc'),
        value: counts.commandes,
        icon: ClipboardList,
        className: 'from-amber-500 to-orange-500',
        action: () => navigate(`/${rolePath}/suivi-achat`),
      },
      {
        key: 'prix',
        title: t('achat.factures'),
        description: t('achat.facturesDesc'),
        value: counts.prix,
        icon: Tag,
        className: 'from-emerald-500 to-teal-500',
        action: () => navigate(`/${rolePath}/prix`),
      },
    ],
    [counts, navigate, rolePath, t],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('nav.achatPiece')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('achat.subtitle')}
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

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon

          return (
            <Card
              key={card.key}
              className="group cursor-pointer overflow-hidden rounded-2xl border-slate-200/80 bg-white hover:shadow-xl transition-all"
              onClick={card.action}
            >
              <div className={`h-1.5 bg-linear-to-r ${card.className}`} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {card.title}
                  <span className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </span>
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <p className="text-4xl font-black tracking-tight text-slate-900">
                  {loading ? '...' : card.value}
                </p>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          )
        })}
      </section>


    </div>
  )
}

export default AchatPiecePage