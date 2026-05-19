import { ArrowLeft, Plus, Search, Pencil, Trash2, X, RefreshCw, AlertCircle, Eye } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { extractApiErrorMessage } from '../../../lib/api'
import { entityServices } from '../../../services/entities'

const STATUTS = [
  { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  { value: 'commande', label: 'Commandée', color: 'bg-blue-100 text-blue-800' },
  { value: 'livree', label: 'Livrée', color: 'bg-green-100 text-green-800' },
  { value: 'rejetee', label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  { value: 'annulee', label: 'Annulée', color: 'bg-yellow-100 text-yellow-800' },
]

function CommandesPiecesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [filteredCommandes, setFilteredCommandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [formData, setFormData] = useState({
    numero_commande: '',
    fournisseur: '',
    statut: 'brouillon',
    montant_total: 0,
    date_livraison_prevue: '',
    remarques: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [commandesData, fournisseursData] = await Promise.all([
        entityServices['commandes-pieces'].list(),
        entityServices.fournisseurs.list(),
      ])
      setCommandes(commandesData)
      setFilteredCommandes(commandesData)
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
    const filtered = commandes.filter(c =>
      c.numero_commande.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCommandes(filtered)
  }, [searchTerm, commandes])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (editingId) {
        await entityServices['commandes-pieces'].update(editingId, formData)
      } else {
        await entityServices['commandes-pieces'].create(formData)
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

  const handleEdit = (commande) => {
    setFormData(commande)
    setEditingId(commande.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      setLoading(true)
      setError('')
      try {
        await entityServices['commandes-pieces'].delete(id)
        loadData()
      } catch (err) {
        setError(extractApiErrorMessage(err, 'Erreur lors de la suppression'))
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      numero_commande: '',
      fournisseur: '',
      statut: 'brouillon',
      montant_total: 0,
      date_livraison_prevue: '',
      remarques: '',
    })
    setEditingId(null)
  }

  const getStatutBadge = (statut) => {
    const st = STATUTS.find(s => s.value === statut)
    return st || STATUTS[0]
  }

  const getFournisseurName = (id) => {
    return fournisseurs.find(f => f.id === id)?.nom || '-'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/chefstock/achat-piece')}
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Retour à Achat Pièce"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Commandes de pièces</h1>
            <p className="text-gray-500 mt-1">Gérez les commandes auprès des fournisseurs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadData}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro de commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>{editingId ? 'Modifier' : 'Nouvelle'} Commande</CardTitle>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Numéro de commande *</label>
                  <Input
                    name="numero_commande"
                    value={formData.numero_commande}
                    onChange={handleInputChange}
                    required
                    placeholder="CMD-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fournisseur *</label>
                  <select
                    name="fournisseur"
                    value={formData.fournisseur}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select
                    name="statut"
                    value={formData.statut}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUTS.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date de livraison prévue</label>
                  <Input
                    name="date_livraison_prevue"
                    type="datetime-local"
                    value={formData.date_livraison_prevue}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Montant total</label>
                  <Input
                    name="montant_total"
                    type="number"
                    step="0.01"
                    value={formData.montant_total}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Remarques</label>
                  <Input
                    name="remarques"
                    value={formData.remarques}
                    onChange={handleInputChange}
                    placeholder="Remarques..."
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  {editingId ? 'Modifier' : 'Créer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Detail View */}
      {selectedDetail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Détails de la commande</CardTitle>
            </div>
            <button
              onClick={() => setSelectedDetail(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Numéro de commande</p>
                <p className="font-medium">{selectedDetail.numero_commande}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fournisseur</p>
                <p className="font-medium">{getFournisseurName(selectedDetail.fournisseur)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <Badge className={getStatutBadge(selectedDetail.statut).color}>
                  {getStatutBadge(selectedDetail.statut).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant total</p>
                <p className="font-medium">{selectedDetail.montant_total} DH</p>
              </div>
            </div>
            {selectedDetail.remarques && (
              <div>
                <p className="text-sm text-gray-500">Remarques</p>
                <p className="text-sm">{selectedDetail.remarques}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold">Numéro</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Fournisseur</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Montant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date de commande</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommandes.map((commande) => (
              <tr key={commande.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{commande.numero_commande}</td>
                <td className="px-4 py-3 text-sm">{getFournisseurName(commande.fournisseur)}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge className={getStatutBadge(commande.statut).color}>
                    {getStatutBadge(commande.statut).label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{commande.montant_total} DH</td>
                <td className="px-4 py-3 text-sm">
                  {new Date(commande.date_commande).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDetail(commande)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(commande)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(commande.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCommandes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucune commande trouvée</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommandesPiecesPage
