import { Check, X, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { AppModal } from '../../../components/ui/AppModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import demandePiecesService from '../../../services/entities/demandePieces.service'
import { entityServices } from '../../../services/entities'

export default function FournisseurDashboardPage() {
  const { t } = useTranslation()
  const [demandes, setDemandes] = useState([])
  const [pieces, setPieces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal
  const [responseModal, setResponseModal] = useState({ open: false, demandeId: null, pieceName: '', decision: '', prix: '', motif_refus: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Due to the permission class, listing demandes should ideally return only the supplier's demands
      const [dems, pcs] = await Promise.all([
        demandePiecesService.listAll(),
        entityServices.pieces.listAll(),
      ])

      setDemandes(dems)
      setPieces(pcs)
    } catch (err) {
          setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getPieceName = (id) => pieces.find(p => p.id === id)?.nom || `Pièce #${id}`

  const handleSubmitResponse = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = responseModal.decision === 'accepter'
        ? { prix: responseModal.prix }
        : { motif_refus: responseModal.motif_refus }

      await demandePiecesService.reponseFournisseur(responseModal.demandeId, responseModal.decision, payload)
      setResponseModal({ open: false, demandeId: null, pieceName: '', decision: '', prix: '', motif_refus: '' })
      loadData()
    } catch (err) {
          setError(extractApiErrorMessage(err, t('error.saveFailed')))
    } finally {
      setLoading(false)
    }
  }

  // Filter demands for the dashboard
  const enAttente = demandes.filter(d => d.statut === 'en_attente_fournisseur')
  const acceptees = demandes.filter(d => d.statut === 'acceptee_fournisseur' || d.statut === 'livree')

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{t('fournisseur.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('fournisseur.subtitle')}</p>
        </div>
        <Button onClick={loadData} disabled={loading} className="gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('crud.refresh')}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-3 items-center">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* EN ATTENTE */}
        <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="h-2 bg-amber-500 w-full" />
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              {t('fournisseur.pendingDemandes')}
              <Badge className="ml-auto bg-amber-100 text-amber-800 hover:bg-amber-200">{enAttente.length}</Badge>
            </CardTitle>
            <CardDescription>{t('fournisseur.respond')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {enAttente.length === 0 ? (
              <div className="p-8 text-center text-slate-500">{t('fournisseur.noDemandes')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {enAttente.map((dem) => (
                  <li key={dem.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-lg">{getPieceName(dem.piece)}</div>
                        <div className="text-sm text-slate-500 mt-1">{t('achat.qty')}: <span className="font-bold text-slate-700">{dem.quantite}</span></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button
                        onClick={() => setResponseModal({ open: true, demandeId: dem.id, pieceName: getPieceName(dem.piece), decision: 'accepter', prix: '', motif_refus: '' })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {t('achat.accept')}
                      </Button>
                      <Button
                        onClick={() => setResponseModal({ open: true, demandeId: dem.id, pieceName: getPieceName(dem.piece), decision: 'refuser', prix: '', motif_refus: '' })}
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl gap-2"
                      >
                        <X className="h-4 w-4" />
                        {t('achat.reject')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ACCEPTEES */}
        <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="h-2 bg-blue-500 w-full" />
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-blue-500" />
              {t('fournisseur.myDemandes')}
              <Badge className="ml-auto bg-blue-100 text-blue-800 hover:bg-blue-200">{acceptees.length}</Badge>
            </CardTitle>
            <CardDescription>{t('status.acceptee_fournisseur')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {acceptees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">{t('fournisseur.noDemandes')}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {acceptees.map((dem) => (
                  <li key={dem.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900">{getPieceName(dem.piece)}</div>
                      <Badge className={dem.statut === 'livree' ? 'bg-green-500' : 'bg-blue-500'}>
                        {dem.statut === 'livree' ? t('status.livree') : t('status.commandee')}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-slate-600 flex justify-between bg-slate-50 p-2 rounded-lg">
                      <span>{t('achat.qty')}: {dem.quantite}</span>
                      <span className="text-emerald-600">{dem.prix_fournisseur} DT</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AppModal
        open={responseModal.open}
        onClose={() => setResponseModal({ open: false, demandeId: null, pieceName: '', decision: '', prix: '', motif_refus: '' })}
        eyebrow={responseModal.pieceName}
        title={responseModal.decision === 'accepter' ? t('achat.accept') : t('achat.reject')}
        size="sm"
        headerVariant={responseModal.decision === 'accepter' ? 'success' : 'danger'}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setResponseModal({ open: false, demandeId: null, pieceName: '', decision: '', prix: '', motif_refus: '' })}>
              {t('crud.cancel')}
            </Button>
            <Button
              type="submit"
              form="fournisseur-response-form"
              disabled={loading || (responseModal.decision === 'accepter' && !responseModal.prix) || (responseModal.decision === 'refuser' && !responseModal.motif_refus)}
              className={responseModal.decision === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {t('crud.confirm')}
            </Button>
          </div>
        }
      >
        <form id="fournisseur-response-form" onSubmit={handleSubmitResponse} className="space-y-4">
          {responseModal.decision === 'accepter' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.price')} *</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                value={responseModal.prix}
                onChange={(e) => setResponseModal(prev => ({ ...prev, prix: e.target.value }))}
                required
                placeholder="Ex: 125.00"
              />
              <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">{t('achat.acceptCommitment')}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.rejectReason')} *</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[100px] dark:border-slate-700 dark:bg-slate-800"
                value={responseModal.motif_refus}
                onChange={(e) => setResponseModal(prev => ({ ...prev, motif_refus: e.target.value }))}
                required
                placeholder="Rupture de stock complète, etc..."
              />
            </div>
          )}
        </form>
      </AppModal>
    </div>
  )
}
