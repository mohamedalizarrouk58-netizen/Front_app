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

function FournisseursPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [fournisseurs, setFournisseurs] = useState([])
  const [filteredFournisseurs, setFilteredFournisseurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, row: null })
  const [deletingId, setDeletingId] = useState(null)
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    pays: 'Maroc',
    contact_principal: '',
    est_actif: true,
  })

  const loadFournisseurs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await entityServices.fournisseurs.list()
      setFournisseurs(data)
      setFilteredFournisseurs(data)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFournisseurs()
  }, [loadFournisseurs])

  useEffect(() => {
    const filtered = fournisseurs.filter(f =>
      f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.telephone && f.telephone.includes(searchTerm))
    )
    setFilteredFournisseurs(filtered)
  }, [searchTerm, fournisseurs])

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
        await entityServices.fournisseurs.update(editingId, formData)
      } else {
        await entityServices.fournisseurs.create(formData)
      }
      loadFournisseurs()
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la sauvegarde'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (fournisseur) => {
    setFormData(fournisseur)
    setEditingId(fournisseur.id)
    setShowForm(true)
  }

  const handleDeleteClick = (fournisseur) => {
    setDeleteModalState({ isOpen: true, row: fournisseur })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.row) return
    setDeletingId(deleteModalState.row.id)
    setError('')
    try {
      await entityServices.fournisseurs.delete(deleteModalState.row.id)
      loadFournisseurs()
      setDeleteModalState({ isOpen: false, row: null })
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors de la suppression'))
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      nom: '',
      email: '',
      telephone: '',
      adresse: '',
      ville: '',
      code_postal: '',
      pays: 'Maroc',
      contact_principal: '',
      est_actif: true,
    })
    setEditingId(null)
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
            <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
            <p className="text-gray-500 mt-1">Gérez les fournisseurs de pièces détachées</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadFournisseurs}
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
            placeholder="Rechercher par nom, email ou téléphone..."
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
              <CardTitle>{editingId ? 'Modifier' : 'Nouveau'} Fournisseur</CardTitle>
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
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <Input
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                    placeholder="Nom du fournisseur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@exemple.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <Input
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="+212 6 XX XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact principal</label>
                  <Input
                    name="contact_principal"
                    value={formData.contact_principal}
                    onChange={handleInputChange}
                    placeholder="Nom du contact"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <Input
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleInputChange}
                    placeholder="Adresse"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ville</label>
                  <Input
                    name="ville"
                    value={formData.ville}
                    onChange={handleInputChange}
                    placeholder="Ville"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code postal</label>
                  <Input
                    name="code_postal"
                    value={formData.code_postal}
                    onChange={handleInputChange}
                    placeholder="Code postal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pays</label>
                  <Input
                    name="pays"
                    value={formData.pays}
                    onChange={handleInputChange}
                    placeholder="Pays"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="est_actif"
                  checked={formData.est_actif}
                  onChange={handleInputChange}
                  id="est_actif"
                  className="rounded border-gray-300"
                />
                <label htmlFor="est_actif" className="text-sm font-medium">
                  Actif
                </label>
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
              <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Téléphone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Ville</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFournisseurs.map((fournisseur) => (
              <tr key={fournisseur.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{fournisseur.nom}</td>
                <td className="px-4 py-3 text-sm">{fournisseur.email || '-'}</td>
                <td className="px-4 py-3 text-sm">{fournisseur.telephone || '-'}</td>
                <td className="px-4 py-3 text-sm">{fournisseur.ville || '-'}</td>
                <td className="px-4 py-3 text-sm">{fournisseur.contact_principal || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={fournisseur.est_actif ? 'default' : 'secondary'}>
                    {fournisseur.est_actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(fournisseur)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(fournisseur)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredFournisseurs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun fournisseur trouvé</p>
          </div>
        )}
      </div>

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
                Êtes-vous sûr de vouloir supprimer le fournisseur <strong className="text-slate-800">{deleteModalState.row?.nom}</strong> ? Cette action est irréversible.
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

export default FournisseursPage
