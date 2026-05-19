import { ArrowLeft, Plus, Search, Pencil, Trash2, X, RefreshCw, AlertCircle } from 'lucide-react'
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
  const [formData, setFormData] = useState({
    piece: '',
    fournisseur: '',
    prix: '',
    delai_livraison_jours: '',
    quantite_minimum: 1,
    est_actif: true,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [prixData, piecesData, fournisseursData] = await Promise.all([
        entityServices['prix-fournisseurs'].list(),
        entityServices.pieces.list(),
        entityServices.fournisseurs.list(),
      ])
      setPrix(prixData)
      setFilteredPrix(prixData)
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
        await entityServices['prix-fournisseurs'].update(editingId, formData)
      } else {
        await entityServices['prix-fournisseurs'].create(formData)
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
    setFormData(prixItem)
    setEditingId(prixItem.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
      setLoading(true)
      setError('')
      try {
        await entityServices['prix-fournisseurs'].delete(id)
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
      piece: '',
      fournisseur: '',
      prix: '',
      delai_livraison_jours: '',
      quantite_minimum: 1,
      est_actif: true,
    })
    setEditingId(null)
  }

  const getPieceName = (id) => {
    return pieces.find(p => p.id === id)?.nom || '-'
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
            <h1 className="text-3xl font-bold tracking-tight">Prix des fournisseurs</h1>
            <p className="text-gray-500 mt-1">Gérez les tarifs des pièces chez les fournisseurs</p>
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
            Nouveau
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
            placeholder="Rechercher par pièce ou fournisseur..."
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
              <CardTitle>{editingId ? 'Modifier' : 'Nouveau'} Prix</CardTitle>
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
                  <label className="block text-sm font-medium mb-1">Pièce *</label>
                  <select
                    name="piece"
                    value={formData.piece}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une pièce</option>
                    {pieces.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
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
                  <label className="block text-sm font-medium mb-1">Prix (DH) *</label>
                  <Input
                    name="prix"
                    type="number"
                    step="0.01"
                    value={formData.prix}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Délai de livraison (jours)</label>
                  <Input
                    name="delai_livraison_jours"
                    type="number"
                    value={formData.delai_livraison_jours}
                    onChange={handleInputChange}
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantité minimum</label>
                  <Input
                    name="quantite_minimum"
                    type="number"
                    value={formData.quantite_minimum}
                    onChange={handleInputChange}
                    placeholder="1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="est_actif"
                      checked={formData.est_actif}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    Actif
                  </label>
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

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold">Pièce</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Fournisseur</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Prix (DH)</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Délai (j)</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Qt. min</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Statut</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrix.map((prixItem) => (
              <tr key={prixItem.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{getPieceName(prixItem.piece)}</td>
                <td className="px-4 py-3 text-sm">{getFournisseurName(prixItem.fournisseur)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">{prixItem.prix} DH</td>
                <td className="px-4 py-3 text-sm text-center">
                  {prixItem.delai_livraison_jours || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-center">{prixItem.quantite_minimum}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={prixItem.est_actif ? 'default' : 'secondary'}>
                    {prixItem.est_actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(prixItem)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prixItem.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPrix.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun prix trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PrixFournisseursPage
