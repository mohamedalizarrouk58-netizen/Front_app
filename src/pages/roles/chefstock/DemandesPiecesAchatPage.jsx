import { ArrowLeft, Check, RefreshCw, AlertCircle, ShoppingCart, Truck, Search, HandCoins } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { AppModal } from '../../../components/ui/AppModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import demandePiecesService from '../../../services/entities/demandePieces.service'
import { entityServices } from '../../../services/entities'

const STATUS_MAP = {
  demandee: { label: 'Demandée', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  hors_stock: { label: 'Hors Stock', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
  en_attente_fournisseur: { label: 'En attente Fournisseur', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  acceptee_fournisseur: { label: 'Acceptée par Fournisseur', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  refusee_fournisseur: { label: 'Refusée par Fournisseur', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  reaffectee: { label: 'Réaffectée', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  commandee: { label: 'Commandée', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  livree: { label: 'Livrée', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  annulee: { label: 'Annulée', color: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

export default function DemandesPiecesAchatPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [pieces, setPieces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // State for modals
  const [assignModal, setAssignModal] = useState({ open: false, demandeId: null, fournisseurId: '' })
  const [receiveModal, setReceiveModal] = useState({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })
  const [supplierResponseModal, setSupplierResponseModal] = useState({ open: false, demandeId: null, decision: '', prix: '', motif_refus: '' })
  const [createModal, setCreateModal] = useState({ open: false, pieceId: '', quantite: 1 })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dems, fours, pcs] = await Promise.all([
        demandePiecesService.listAll(),
        entityServices.fournisseurs.listAll(),
        entityServices.pieces.listAll(),
      ])
      // Only care about those that are hors stock or in supplier pipeline
      const filteredDems = dems.filter(d =>
        ['hors_stock', 'en_attente_fournisseur', 'acceptee_fournisseur', 'refusee_fournisseur'].includes(d.statut)
      )
      setDemandes(filteredDems)
      setFournisseurs(fours)
      setPieces(pcs)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors du chargement des données.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getPieceName = (id) => pieces.find(p => p.id === id)?.nom || `Pièce #${id}`
  const getFournisseurName = (id) => fournisseurs.find(f => f.id === id)?.nom || 'Non assigné'

  const handleAssignFournisseur = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await demandePiecesService.assignerFournisseur(assignModal.demandeId, assignModal.fournisseurId)
      setAssignModal({ open: false, demandeId: null, fournisseurId: '' })
      loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de l\'assignation du fournisseur.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSupplierResponse = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const payload = supplierResponseModal.decision === 'accepter'
        ? { prix: supplierResponseModal.prix }
        : { motif_refus: supplierResponseModal.motif_refus }

      await demandePiecesService.reponseFournisseur(supplierResponseModal.demandeId, supplierResponseModal.decision, payload)
      setSupplierResponseModal({ open: false, demandeId: null, decision: '', prix: '', motif_refus: '' })
      loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la soumission de la réponse du fournisseur.'))
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveDelivery = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await demandePiecesService.receptionLivraison(receiveModal.demandeId, {
        quantite_livree: receiveModal.quantite_livree,
        numero_facture: receiveModal.numero_facture
      })
      setReceiveModal({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })
      // Reload main page tracking, as it might no longer be 'en achat'
      loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la réception de la livraison.'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDemande = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await demandePiecesService.create({
        piece: parseInt(createModal.pieceId),
        quantite: parseInt(createModal.quantite),
        statut: 'hors_stock'
      })
      setCreateModal({ open: false, pieceId: '', quantite: 1 })
      loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la création de la demande.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-14 -right-14 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/chefstock/achat-piece')}
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl bg-white/10 border-white/20 hover:bg-white/20 text-white"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{t('achat.suivi')}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{t('achat.suiviDesc')}</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl">
                Gestion des pièces hors stock et workflows fournisseurs (Assignation &rarr; Réception &rarr; Facturation)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setCreateModal({ open: true, pieceId: '', quantite: 1 })} disabled={loading} className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md">
              <ShoppingCart className="h-4 w-4" />
              {t('achat.newDemande')}
            </Button>
            <Button onClick={loadData} disabled={loading} className="gap-2 rounded-xl bg-white/10 border-white/20 hover:bg-white/20 text-white border">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('crud.refresh')}
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-3 items-center shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Kanban Board / Flex Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Column 1: Hors Stock (Need Assignment) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-rose-500 pb-2">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('status.hors_stock')}</h3>
            <Badge variant="outline" className="ml-auto">{demandes.filter(d => d.statut === 'hors_stock' || d.statut === 'refusee_fournisseur').length}</Badge>
          </div>
          {demandes.filter(d => d.statut === 'hors_stock' || d.statut === 'refusee_fournisseur').map(dem => (
            <Card key={dem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{getPieceName(dem.piece)}</div>
                  <Badge variant="outline">{t('achat.qty')}: {dem.quantite}</Badge>
                </div>
                {dem.statut === 'refusee_fournisseur' && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-md">
                    Refusé par le fournisseur précédent. Besoin d'une ré-assignation.
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full mt-2 gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                  onClick={() => setAssignModal({ open: true, demandeId: dem.id, fournisseurId: '' })}
                >
                  <HandCoins className="h-4 w-4" />
                  {t('achat.assignSupplier')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Column 2: Waiting For Supplier */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('status.en_attente_fournisseur')}</h3>
            <Badge variant="outline" className="ml-auto">{demandes.filter(d => d.statut === 'en_attente_fournisseur').length}</Badge>
          </div>
          {demandes.filter(d => d.statut === 'en_attente_fournisseur').map(dem => (
            <Card key={dem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500 bg-amber-50/50">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-800">{getPieceName(dem.piece)}</div>
                  <Badge variant="outline" className="bg-white">Qte: {dem.quantite}</Badge>
                </div>
                <div className="text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-amber-100">
                  Fournisseur assigné: <span className="font-semibold">{getFournisseurName(dem.fournisseur)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-amber-200/50">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl text-xs h-9 px-2 shadow-sm"
                    onClick={() => setSupplierResponseModal({ open: true, demandeId: dem.id, decision: 'accepter', prix: '', motif_refus: '' })}
                  >
                    Saisir Accord
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded-xl text-xs h-9 px-2 shadow-sm"
                    onClick={() => setSupplierResponseModal({ open: true, demandeId: dem.id, decision: 'refuser', prix: '', motif_refus: '' })}
                  >
                    Saisir Refus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Column 3: Supplier Accepted (Wait Delivery) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-blue-500 pb-2">
            <Truck className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('status.commandee')}</h3>
            <Badge variant="outline" className="ml-auto">{demandes.filter(d => d.statut === 'acceptee_fournisseur').length}</Badge>
          </div>
          {demandes.filter(d => d.statut === 'acceptee_fournisseur').map(dem => (
            <Card key={dem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500 bg-blue-50/50">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-900">{getPieceName(dem.piece)}</div>
                  <Badge className="bg-blue-500">Qte: {dem.quantite}</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>{t('achat.price')}:</span>
                  <span className="text-emerald-600">{dem.prix_fournisseur || '0.00'} DT</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                  onClick={() => setReceiveModal({ open: true, demandeId: dem.id, quantite_livree: dem.quantite, numero_facture: '' })}
                >
                  <Check className="h-4 w-4" />
                  Réceptionner & Facture
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AppModal
        open={createModal.open}
        onClose={() => setCreateModal({ open: false, pieceId: '', quantite: 1 })}
        eyebrow={t('crud.create')}
        title={t('achat.newDemande')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setCreateModal({ open: false, pieceId: '', quantite: 1 })}>
              {t('crud.cancel')}
            </Button>
            <Button type="submit" form="create-demande-form" disabled={loading || !createModal.pieceId} className="bg-sky-600 hover:bg-sky-700">
              {t('crud.create')}
            </Button>
          </div>
        }
      >
        <form id="create-demande-form" onSubmit={handleCreateDemande} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.piece')}</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              value={createModal.pieceId}
              onChange={(e) => setCreateModal(prev => ({ ...prev, pieceId: e.target.value }))}
              required
            >
              <option value="">{t('achat.selectPiece')}</option>
              {pieces.map(p => (
                <option key={p.id} value={p.id}>{p.nom} (Stock: {p.quantite_stock})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.qty')}</label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              value={createModal.quantite}
              onChange={(e) => setCreateModal(prev => ({ ...prev, quantite: e.target.value }))}
              required
            />
          </div>
        </form>
      </AppModal>

      <AppModal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, demandeId: null, fournisseurId: '' })}
        eyebrow={t('crud.edit')}
        title={t('achat.assignSupplier')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAssignModal({ open: false, demandeId: null, fournisseurId: '' })}>
              {t('crud.cancel')}
            </Button>
            <Button type="submit" form="assign-fournisseur-form" disabled={loading || !assignModal.fournisseurId} className="bg-sky-600 hover:bg-sky-700">
              {t('crud.confirm')}
            </Button>
          </div>
        }
      >
        <form id="assign-fournisseur-form" onSubmit={handleAssignFournisseur} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.selectSupplier')}</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              value={assignModal.fournisseurId}
              onChange={(e) => setAssignModal(prev => ({ ...prev, fournisseurId: e.target.value }))}
              required
            >
              <option value="">{t('crud.select')}</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={supplierResponseModal.open}
        onClose={() => setSupplierResponseModal({ open: false, demandeId: null, decision: '', prix: '', motif_refus: '' })}
        eyebrow={t('achat.supplierResponse')}
        title={supplierResponseModal.decision === 'accepter' ? t('achat.accept') : t('achat.reject')}
        size="sm"
        headerVariant={supplierResponseModal.decision === 'accepter' ? 'success' : 'danger'}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSupplierResponseModal({ open: false, demandeId: null, decision: '', prix: '', motif_refus: '' })}>
              {t('crud.cancel')}
            </Button>
            <Button
              type="submit"
              form="supplier-response-form"
              disabled={loading}
              className={supplierResponseModal.decision === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {t('crud.save')}
            </Button>
          </div>
        }
      >
        <form id="supplier-response-form" onSubmit={handleSupplierResponse} className="space-y-4">
          {supplierResponseModal.decision === 'accepter' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.price')}</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                value={supplierResponseModal.prix}
                onChange={(e) => setSupplierResponseModal(prev => ({ ...prev, prix: e.target.value }))}
                required
                placeholder="Ex: 250.00"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.rejectReason')}</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[100px] dark:border-slate-700 dark:bg-slate-800"
                value={supplierResponseModal.motif_refus}
                onChange={(e) => setSupplierResponseModal(prev => ({ ...prev, motif_refus: e.target.value }))}
                required
                placeholder="Ex: Pièce indisponible chez le fabricant..."
              />
            </div>
          )}
        </form>
      </AppModal>

      <AppModal
        open={receiveModal.open}
        onClose={() => setReceiveModal({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })}
        eyebrow={t('achat.receive')}
        title={t('achat.receiveDelivery')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setReceiveModal({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })}>
              {t('crud.cancel')}
            </Button>
            <Button type="submit" form="receive-delivery-form" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
              {t('achat.receive')}
            </Button>
          </div>
        }
      >
        <form id="receive-delivery-form" onSubmit={handleReceiveDelivery} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.qtyDelivered')}</label>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              value={receiveModal.quantite_livree}
              onChange={(e) => setReceiveModal(prev => ({ ...prev, quantite_livree: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">{t('achat.invoiceNumber')}</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              value={receiveModal.numero_facture}
              onChange={(e) => setReceiveModal(prev => ({ ...prev, numero_facture: e.target.value }))}
              required
              placeholder="Ex: FF-2026-001"
            />
          </div>
          <div className="bg-sky-50 text-sky-800 text-xs p-3 rounded-lg border border-sky-100 flex gap-2 items-start dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{t('achat.receiveHint')}</p>
          </div>
        </form>
      </AppModal>

    </div>
  )
}
