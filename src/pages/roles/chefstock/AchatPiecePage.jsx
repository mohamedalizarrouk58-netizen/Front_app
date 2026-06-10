import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Package,
  RefreshCw,
  Tag,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import { entityServices } from '../../../services/entities'

function AchatPiecePage({ rolePath = 'chefstock' }) {
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
    const [fournisseurs, commandes, demandesPieces] = await Promise.all([
        entityServices.fournisseurs?.list?.() ?? [],
        entityServices['commandes-pieces']?.list?.() ?? [],
        entityServices['demande-pieces']?.list?.() ?? [],
      ])

      const piecesHorsStock = demandesPieces.filter(d => 
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(d.statut)
      )
      
      const facturesCount = demandesPieces.filter(d => d.statut === 'livree').length

      setCounts({
        fournisseurs: Array.isArray(fournisseurs) ? fournisseurs.length : 0,
        commandes: piecesHorsStock.length, // tracking en cours
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

  const total = counts.fournisseurs + counts.commandes + counts.prix

  const cards = useMemo(
    () => [
      {
        key: 'fournisseurs',
        title: 'Fournisseurs',
        description: 'Partenaires, contacts et disponibilité.',
        value: counts.fournisseurs,
        icon: Truck,
        className: 'from-sky-600 to-cyan-500',
        action: () => navigate(`/${rolePath}/fournisseurs`),
      },
      {
        key: 'commandes',
        title: 'Suivi Achat Pièces',
        description: 'Demandes hors stock et attente de fournisseurs.',
        value: counts.commandes,
        icon: ClipboardList,
        className: 'from-amber-500 to-orange-500',
        action: () => navigate(`/${rolePath}/suivi-achat`),
      },
      {
        key: 'prix',
        title: 'Factures fournisseurs',
        description: 'Historique des factures et montants payés.',
        value: counts.prix,
        icon: Tag,
        className: 'from-emerald-500 to-teal-500',
        action: () => navigate(`/${rolePath}/prix`),
      },
    ],
    [counts, navigate, rolePath],
  )

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white p-6 sm:p-8">
        <div className="absolute -top-14 -right-14 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Module</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Achat Pièce</h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Espace dédié aux opérations d’achat: fournisseurs, commandes de pièces et gestion des prix.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Total achat</p>
              <p className="mt-1 text-3xl font-black">{loading ? '...' : total}</p>
            </div>
            <Button onClick={loadCounts} disabled={loading} className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Recharger
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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