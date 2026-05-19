import { ArrowLeft, Check, X, RefreshCw, AlertCircle, ShoppingCart, Truck, Search, HandCoins } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import demandePiecesService from '../../../services/entities/demandePieces.service'
import { entityServices } from '../../../services/entities'

const STATUS_MAP = {
  demandee: { label: 'Demandée', color: 'bg-slate-100 text-slate-800' },
  approuvee: { label: 'Approuvée', color: 'bg-emerald-100 text-emerald-800' },
  hors_stock: { label: 'Hors Stock', color: 'bg-rose-100 text-rose-800' },
  en_attente_fournisseur: { label: 'En attente Fournisseur', color: 'bg-amber-100 text-amber-800' },
  acceptee_fournisseur: { label: 'Acceptée par Fournisseur', color: 'bg-blue-100 text-blue-800' },
  refusee_fournisseur: { label: 'Refusée par Fournisseur', color: 'bg-red-100 text-red-800' },
  livree: { label: 'Livrée', color: 'bg-green-100 text-green-800' }
}

export default function DemandesPiecesAchatPage() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [pieces, setPieces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // State for modals
  const [assignModal, setAssignModal] = useState({ open: false, demandeId: null, fournisseurId: '' })
  const [receiveModal, setReceiveModal] = useState({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dems, fours, pcs] = await Promise.all([
        demandePiecesService.list(),
        entityServices.fournisseurs.list(),
        entityServices.pieces.list(),
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/chefstock/achat-piece')}
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Suivi Demandes Achat</h1>
            <p className="text-slate-500 mt-1">Gestion des pièces hors stock et workflows fournisseurs (Assignation &rarr; Facturation)</p>
          </div>
        </div>
        <Button onClick={loadData} disabled={loading} className="gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-3 items-center">
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
            <h3 className="font-bold text-slate-800">Hors Stock</h3>
            <Badge variant="outline" className="ml-auto">{demandes.filter(d => d.statut === 'hors_stock' || d.statut === 'refusee_fournisseur').length}</Badge>
          </div>
          {demandes.filter(d => d.statut === 'hors_stock' || d.statut === 'refusee_fournisseur').map(dem => (
            <Card key={dem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-rose-500">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{getPieceName(dem.piece)}</div>
                  <Badge variant="outline">Qte: {dem.quantite}</Badge>
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
                  Assigner Fournisseur
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Column 2: Waiting For Supplier */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-800">En attente rép.</h3>
            <Badge variant="outline" className="ml-auto">{demandes.filter(d => d.statut === 'en_attente_fournisseur').length}</Badge>
          </div>
          {demandes.filter(d => d.statut === 'en_attente_fournisseur').map(dem => (
            <Card key={dem.id} className="rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500 bg-amber-50/50">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="font-bold">{getPieceName(dem.piece)}</div>
                  <Badge variant="outline">Qte: {dem.quantite}</Badge>
                </div>
                <div className="text-xs text-slate-500">
                  Fournisseur assigné (ID: {dem.fournisseur_id || 'En cours'})
                </div>
                
                {/* MOCK ACTIONS FOR DEMO/TESTING */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-200">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs h-8 px-2"
                    onClick={() => setSupplierResponseModal({ open: true, demandeId: dem.id, decision: 'accepter', prix: '', motif_refus: '' })}
                  >
                    Simuler Accepter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs h-8 px-2"
                    onClick={() => setSupplierResponseModal({ open: true, demandeId: dem.id, decision: 'refuser', prix: '', motif_refus: '' })}
                  >
                    Simuler Refuser
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
            <h3 className="font-bold text-slate-800">En cours livraison</h3>
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
                  <span>Prix fixé:</span>
                  <span className="text-emerald-600">{dem.prix_fournisseur || '0.00'} DH</span>
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

      {/* --- MODALS --- */}
      
      {/* Assign Fournisseur Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Assigner un Fournisseur</h3>
              <button className="text-slate-400 hover:text-white" onClick={() => setAssignModal({ open: false, demandeId: null, fournisseurId: '' })}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAssignFournisseur} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Choisir le fournisseur</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={assignModal.fournisseurId}
                  onChange={(e) => setAssignModal(prev => ({ ...prev, fournisseurId: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={loading || !assignModal.fournisseurId} className="w-full rounded-xl p-6 text-md font-bold">
                Confirmer l'assignation
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Response Modal (SIMULATION) */}
      {supplierResponseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={`px-6 py-4 flex items-center justify-between ${supplierResponseModal.decision === 'accepter' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <h3 className="text-lg font-bold text-white">Simulation: {supplierResponseModal.decision === 'accepter' ? 'Accepter Demande' : 'Refuser Demande'}</h3>
              <button className="text-white/70 hover:text-white" onClick={() => setSupplierResponseModal({ open: false, demandeId: null, decision: '', prix: '', motif_refus: '' })}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSupplierResponse} className="p-6 space-y-4">
              
              {supplierResponseModal.decision === 'accepter' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prix proposé (DH)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={supplierResponseModal.prix}
                    onChange={(e) => setSupplierResponseModal(prev => ({ ...prev, prix: e.target.value }))}
                    required
                    placeholder="Ex: 250.00"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Motif de refus</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[100px]"
                    value={supplierResponseModal.motif_refus}
                    onChange={(e) => setSupplierResponseModal(prev => ({ ...prev, motif_refus: e.target.value }))}
                    required
                    placeholder="Pièce indisponible, rupture stock mondiale..."
                  />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full rounded-xl p-6 text-md font-bold">
                Valider la réponse mockée
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Receive Delivery & Invoice Modal */}
      {receiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Réception & Génration Facture</h3>
              <button className="text-slate-400 hover:text-white" onClick={() => setReceiveModal({ open: false, demandeId: null, quantite_livree: 1, numero_facture: '' })}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleReceiveDelivery} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantité livrée</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={receiveModal.quantite_livree}
                  onChange={(e) => setReceiveModal(prev => ({ ...prev, quantite_livree: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Numéro Facture Fournisseur (Nouveau)</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={receiveModal.numero_facture}
                  onChange={(e) => setReceiveModal(prev => ({ ...prev, numero_facture: e.target.value }))}
                  required
                  placeholder="Ex: FF-2026-001"
                />
              </div>
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 flex gap-2 items-start mt-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>La validation mettra à jour le stock, changera la demande en 'livrée' et créera automatiquement la facture fournisseur dans le système.</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl p-6 text-md font-bold mt-4 bg-blue-600 hover:bg-blue-700">
                Traiter Livraison et Facturer
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
