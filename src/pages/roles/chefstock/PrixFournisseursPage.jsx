import { ArrowLeft, Plus, Search, Pencil, Trash2, X, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { extractApiErrorMessage } from '../../../lib/api'
import { entityServices } from '../../../services/entities'

function PrixFournisseursPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [prix, setPrix] = useState([])
  const [filteredPrix, setFilteredPrix] = useState([])
  const [pieces, setPieces] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, row: null })
  const [deletingId, setDeletingId] = useState(null)
  const [formData, setFormData] = useState({
    piece: '',
    fournisseur: '',
    prix_propose_fournisseur: '',
    quantite: 1,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [demandesData, piecesData, fournisseursData] = await Promise.all([
        entityServices['demande-pieces'].list(),
        entityServices.pieces.list(),
        entityServices.fournisseurs.list(),
      ])
      
      const livreeDemandes = demandesData.filter(d => d.statut === 'livree')
      setPrix(livreeDemandes)
      setFilteredPrix(livreeDemandes)
      setPieces(piecesData)
      setFournisseurs(fournisseursData)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const filtered = prix.filter(p => {
      const pieceName = pieces.find(pi => pi.id === p.piece)?.nom || ''
      const fournisseurName = fournisseurs.find(f => f.id === p.fournisseur)?.nom || ''
      return (
        pieceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fournisseurName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    setFilteredPrix(filtered)
  }, [searchTerm, prix, pieces, fournisseurs])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (editingId) {
        await entityServices['demande-pieces'].update(editingId, formData)
      } else {
        await entityServices['demande-pieces'].create({ ...formData, statut: 'livree' })
      }
      loadData()
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la sauvegarde'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (prixItem) => {
    setFormData({
      piece: prixItem.piece || '',
      fournisseur: prixItem.fournisseur || '',
      prix_propose_fournisseur: prixItem.prix_propose_fournisseur || '',
      quantite: prixItem.quantite || 1,
    })
    setEditingId(prixItem.id)
    setShowForm(true)
  }

  const handleDeleteClick = (prixItem) => {
    setDeleteModalState({ isOpen: true, row: prixItem })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.row) return
    setDeletingId(deleteModalState.row.id)
    setError('')
    try {
      await entityServices['demande-pieces'].remove(deleteModalState.row.id)
      loadData()
      setDeleteModalState({ isOpen: false, row: null })
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la suppression'))
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      piece: '',
      fournisseur: '',
      prix_propose_fournisseur: '',
      quantite: 1,
    })
    setEditingId(null)
  }

  const getPieceName = (id) => {
    return pieces.find(p => p.id === id)?.nom || '-'
  }

  const getFournisseurName = (id) => {
    return fournisseurs.find(f => f.id === id)?.nom || '-'
  }

  const printFacture = useCallback((row) => {
    const pieceName = pieces.find(p => p.id === row.piece)?.nom || '-'
    const fournisseurName = fournisseurs.find(f => f.id === row.fournisseur)?.nom || '-'
    
    const totalMontant = Number(row.prix_propose_fournisseur) || 0
    const quantity = Number(row.quantite) || 1
    const unitPrice = quantity > 0 ? totalMontant / quantity : 0

    const dateFacture = new Date(row.date_reponse_fournisseur || row.date_demande).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    const now = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) return

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture #${row.id} - Gestion MT</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    .invoice-container { max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #145f7a; }
    .logo-area h1 { font-size: 28px; font-weight: 800; color: #145f7a; letter-spacing: -0.5px; }
    .logo-area p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .invoice-badge { background: #145f7a; color: white; padding: 10px 20px; border-radius: 8px; text-align: right; }
    .invoice-badge h2 { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
    .invoice-badge p { font-size: 11px; opacity: 0.85; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
    .meta-card h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; }
    .meta-card p { font-size: 14px; color: #334155; line-height: 1.7; }
    .meta-card strong { color: #0f172a; font-weight: 600; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table thead th { background: #145f7a; color: white; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; text-align: left; }
    .details-table thead th:first-child { border-radius: 8px 0 0 0; }
    .details-table thead th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    .details-table tbody td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
    .details-table tbody td:last-child { text-align: right; font-weight: 600; }
    .total-section { display: flex; justify-content: flex-end; margin-bottom: 36px; }
    .total-box { background: linear-gradient(135deg, #145f7a 0%, #0c4358 100%); color: white; padding: 20px 32px; border-radius: 10px; text-align: right; min-width: 260px; }
    .total-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8; }
    .total-box .amount { font-size: 32px; font-weight: 800; margin-top: 4px; }
    .total-box .currency { font-size: 16px; font-weight: 400; opacity: 0.8; }
    .status-section { text-align: center; margin-bottom: 36px; padding: 16px; border-radius: 10px; }
    .status-paid { background: #ecfdf5; border: 2px solid #a7f3d0; color: #065f46; }
    .status-unpaid { background: #fef2f2; border: 2px solid #fecaca; color: #991b1b; }
    .status-section span { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .footer { border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: center; }
    .footer p { font-size: 11px; color: #94a3b8; line-height: 1.8; }
    .footer .thank-you { font-size: 14px; font-weight: 600; color: #145f7a; margin-bottom: 8px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-area">
        <h1>Gestion MT</h1>
        <p>Système de Gestion de Maintenance Technique</p>
      </div>
      <div class="invoice-badge">
        <h2 style="font-size: 16px;">FACTURE FOURNISSEUR</h2>
        <p>N° ${String(row.id).padStart(5, '0')}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <h3>Informations Fournisseur</h3>
        <p><strong>${fournisseurName}</strong></p>
      </div>
      <div class="meta-card">
        <h3>Détails Facture</h3>
        <p><strong>Date :</strong> ${dateFacture}</p>
        <p><strong>Imprimé le :</strong> ${now}</p>
      </div>
    </div>

    <table class="details-table">
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Détail</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Pièce: ${pieceName}</td>
          <td>Quantité: ${quantity}</td>
          <td>${totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND</td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-box">
        <div class="label">Montant Total</div>
        <div class="amount">${totalMontant.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} <span class="currency">TND</span></div>
      </div>
    </div>

    <div class="status-section status-paid">
      <span>✓ FACTURE PAYÉE</span>
    </div>

    <div class="footer">
      <p class="thank-you">Merci pour votre confiance</p>
      <p>Ce document est généré automatiquement par le système Gestion MT.<br>Pour toute question, veuillez contacter le service de réception.</p>
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
    `)
    printWindow.document.close()
  }, [pieces, fournisseurs])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Premium Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-14 -right-14 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/chefstock/achat-piece')}
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl bg-white/10 border-white/20 hover:bg-white/20 text-white"
              aria-label="Retour à Achat Pièce"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Facturation</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Factures des Fournisseurs</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl">
                Gérez et consultez les factures des fournisseurs pour les pièces livrées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2 relative z-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Rechercher par pièce ou fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-2xl border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm focus:bg-white focus:ring-[#145f7a]/40"
          />
        </div>
      </div>

      {/* Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-xl border-white/40 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  {editingId ? 'Modifier le Prix' : 'Nouveau Prix Fournisseur'}
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  Définissez la tarification et les conditions de livraison.
                </CardDescription>
              </div>
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Pièce <span className="text-rose-500">*</span></label>
                    <select
                      name="piece"
                      value={formData.piece}
                      onChange={handleInputChange}
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-[#145f7a]/40 focus:ring-2 focus:bg-white transition-all"
                    >
                      <option value="">Sélectionner une pièce...</option>
                      {pieces.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Fournisseur <span className="text-rose-500">*</span></label>
                    <select
                      name="fournisseur"
                      value={formData.fournisseur}
                      onChange={handleInputChange}
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none ring-[#145f7a]/40 focus:ring-2 focus:bg-white transition-all"
                    >
                      <option value="">Sélectionner un fournisseur...</option>
                      {fournisseurs.map(f => (
                        <option key={f.id} value={f.id}>{f.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Prix total (TND) <span className="text-rose-500">*</span></label>
                    <Input
                      name="prix_propose_fournisseur"
                      type="number"
                      step="0.01"
                      value={formData.prix_propose_fournisseur}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-slate-900 ring-[#145f7a]/40 focus:ring-2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Quantité demandée <span className="text-rose-500">*</span></label>
                    <Input
                      name="quantite"
                      type="number"
                      value={formData.quantite}
                      onChange={handleInputChange}
                      required
                      placeholder="Ex: 1"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-slate-900 ring-[#145f7a]/40 focus:ring-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      resetForm()
                      setShowForm(false)
                    }}
                    className="h-11 px-6 rounded-xl hover:bg-slate-100 text-slate-600"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-8 rounded-xl bg-[#145f7a] hover:bg-[#0c4358] shadow-md text-white font-medium"
                  >
                    {editingId ? 'Mettre à jour' : 'Enregistrer le tarif'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card className="overflow-hidden border-slate-200/80 bg-white/60 backdrop-blur-xl shadow-xl rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Pièce</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Fournisseur</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Prix</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Quantité demandée</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Date facture</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrix.map((prixItem) => (
                <tr key={prixItem.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{getPieceName(prixItem.piece)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{getFournisseurName(prixItem.fournisseur)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      {prixItem.prix_propose_fournisseur || '0.00'} TND
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-slate-600">
                    {prixItem.quantite}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-slate-600">
                    {new Date(prixItem.date_reponse_fournisseur || prixItem.date_demande).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => printFacture(prixItem)}
                      >
                        Imprimer
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-[#145f7a] hover:bg-sky-50 rounded-lg"
                        onClick={() => handleEdit(prixItem)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        onClick={() => handleDeleteClick(prixItem)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPrix.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Aucun tarif trouvé</h3>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                Commencez par ajouter des prix fournisseurs pour vos pièces ou modifiez vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmer la suppression</h3>
              <p className="text-slate-500 mb-6">
                Êtes-vous sûr de vouloir supprimer la facture de <strong className="text-slate-800">{getFournisseurName(deleteModalState.row?.fournisseur)}</strong> pour <strong className="text-slate-800">{getPieceName(deleteModalState.row?.piece)}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteModalState({ isOpen: false, row: null })}>
                  Annuler
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete} disabled={deletingId === deleteModalState.row?.id}>
                  {deletingId === deleteModalState.row?.id ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrixFournisseursPage
