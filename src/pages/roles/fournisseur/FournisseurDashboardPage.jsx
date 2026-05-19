import { Check, X, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { extractApiErrorMessage } from '../../../lib/api'
import demandePiecesService from '../../../services/entities/demandePieces.service'
import { entityServices } from '../../../services/entities'

export default function FournisseurDashboardPage() {
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
        demandePiecesService.list(),
        entityServices.pieces.list(),
      ])
      
      setDemandes(dems)
      setPieces(pcs)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors du chargement de vos demandes.'))
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
      setError(extractApiErrorMessage(err, 'Erreur lors de la réponse.'))
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Espace Fournisseur</h1>
          <p className="text-slate-500 mt-1">Gérez les demandes de pièces assignées à votre entreprise.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* EN ATTENTE */}
        <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="h-2 bg-amber-500 w-full" />
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              Nouvelles demandes
              <Badge className="ml-auto bg-amber-100 text-amber-800 hover:bg-amber-200">{enAttente.length}</Badge>
            </CardTitle>
            <CardDescription>Veuillez accepter et fixer le prix, ou refuser avec un motif.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {enAttente.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucune demande en attente.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {enAttente.map((dem) => (
                  <li key={dem.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-lg">{getPieceName(dem.piece)}</div>
                        <div className="text-sm text-slate-500 mt-1">Quantité demandée: <span className="font-bold text-slate-700">{dem.quantite}</span></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button 
                        onClick={() => setResponseModal({ open: true, demandeId: dem.id, pieceName: getPieceName(dem.piece), decision: 'accepter', prix: '', motif_refus: '' })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Accepter
                      </Button>
                      <Button 
                        onClick={() => setResponseModal({ open: true, demandeId: dem.id, pieceName: getPieceName(dem.piece), decision: 'refuser', prix: '', motif_refus: '' })}
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl gap-2"
                      >
                        <X className="h-4 w-4" />
                        Refuser
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
              Commandes confirmées
              <Badge className="ml-auto bg-blue-100 text-blue-800 hover:bg-blue-200">{acceptees.length}</Badge>
            </CardTitle>
            <CardDescription>Demandes que vous avez acceptées (en attente de réception client).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {acceptees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucune commande confirmée.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {acceptees.map((dem) => (
                  <li key={dem.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-slate-900">{getPieceName(dem.piece)}</div>
                      <Badge className={dem.statut === 'livree' ? 'bg-green-500' : 'bg-blue-500'}>
                        {dem.statut === 'livree' ? 'Livrée' : 'A livrer'}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-slate-600 flex justify-between bg-slate-50 p-2 rounded-lg">
                      <span>Quantité: {dem.quantite}</span>
                      <span className="text-emerald-600">{dem.prix_fournisseur} DH</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reponse Modal */}
      {responseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={`px-6 py-4 flex items-center justify-between ${responseModal.decision === 'accepter' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <h3 className="text-lg font-bold text-white">
                {responseModal.decision === 'accepter' ? 'Accepter la commande' : 'Refuser la commande'}
              </h3>
              <button className="text-white/70 hover:text-white" onClick={() => setResponseModal({ open: false, demandeId: null, pieceName: '', decision: '', prix: '', motif_refus: '' })}><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmitResponse} className="p-6 space-y-4">
              <div className="mb-4">
                <p className="font-medium text-slate-900">{responseModal.pieceName}</p>
              </div>

              {responseModal.decision === 'accepter' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Votre Prix unitaire (DH) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={responseModal.prix}
                    onChange={(e) => setResponseModal(prev => ({ ...prev, prix: e.target.value }))}
                    required
                    placeholder="Ex: 125.00"
                  />
                  <p className="text-xs text-slate-500 mt-2">En acceptant, vous vous engagez à livrer la quantité demandée au prix indiqué.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Motif du refus *</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[100px]"
                    value={responseModal.motif_refus}
                    onChange={(e) => setResponseModal(prev => ({ ...prev, motif_refus: e.target.value }))}
                    required
                    placeholder="Rupture de stock complète, etc..."
                  />
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || (responseModal.decision === 'accepter' && !responseModal.prix) || (responseModal.decision === 'refuser' && !responseModal.motif_refus)} 
                className={`w-full rounded-xl p-6 text-md font-bold mt-4 ${
                  responseModal.decision === 'accepter' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirmer la décision
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
