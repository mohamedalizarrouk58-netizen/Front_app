import { ArrowLeft, Plus, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { AppModal } from '../../../components/ui/AppModal'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { DataFiltersBar } from '../../../components/ui/DataFiltersBar'
import { RecordCard, RecordField } from '../../../components/ui/RecordCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { useOperationFeedback } from '../../../context/OperationFeedbackContext'
import { useViewMode, viewContainerClass } from '../../../hooks/useViewMode'
import { extractApiErrorMessage } from '../../../lib/api'
import { entityServices } from '../../../services/entities'

function FournisseursPage() {
  const { t } = useTranslation()
  const { runWithFeedback } = useOperationFeedback()
  const navigate = useNavigate()
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActif, setFilterActif] = useState('all')
  const [viewMode, setViewMode] = useViewMode('chefstock-fournisseurs')
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
      const data = await entityServices.fournisseurs.listAll()
      setFournisseurs(data)
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFournisseurs()
  }, [loadFournisseurs])

  const filteredFournisseurs = useMemo(() => {
    let result = fournisseurs
    if (filterActif === 'active') result = result.filter((f) => f.est_actif)
    if (filterActif === 'inactive') result = result.filter((f) => !f.est_actif)
    const q = searchTerm.trim().toLowerCase()
    if (!q) return result
    return result.filter(
      (f) =>
        f.nom.toLowerCase().includes(q) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.telephone && f.telephone.includes(q)) ||
        (f.ville && f.ville.toLowerCase().includes(q)),
    )
  }, [fournisseurs, searchTerm, filterActif])

  const hasActiveFilters = filterActif !== 'all' || searchTerm.trim().length > 0

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
      await runWithFeedback(
        async () => {
          if (editingId) {
            await entityServices.fournisseurs.update(editingId, formData)
          } else {
            await entityServices.fournisseurs.create(formData)
          }
          await loadFournisseurs()
        },
        {
          action: editingId ? 'update' : 'create',
          entity: t('achat.fournisseurs'),
        },
      )
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
      await runWithFeedback(
        async () => {
          await entityServices.fournisseurs.delete(deleteModalState.row.id)
          await loadFournisseurs()
        },
        { action: 'delete', entity: deleteModalState.row.nom },
      )
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
            <h1 className="text-3xl font-bold tracking-tight dark:text-slate-100">{t('achat.fournisseurs')}</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">{t('achat.fournisseursDesc')}</p>
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

      <DataFiltersBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('fournisseur.searchPlaceholder')}
        shown={filteredFournisseurs.length}
        total={fournisseurs.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm('')
          setFilterActif('all')
        }}
        filters={[
          {
            id: 'actif',
            label: t('columns.statut'),
            value: filterActif,
            onChange: setFilterActif,
            options: [
              { value: 'all', label: t('common.all') },
              { value: 'active', label: t('common.activeOnly') },
              { value: 'inactive', label: t('common.inactiveOnly') },
            ],
          },
        ]}
      />

      <AppModal
        open={showForm}
        onClose={() => {
          resetForm()
          setShowForm(false)
        }}
        eyebrow={editingId ? t('crud.edit') : t('crud.create')}
        title={editingId ? t('fournisseur.editTitle') : t('fournisseur.createTitle')}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false) }}>
              {t('crud.cancel')}
            </Button>
            <Button type="submit" form="fournisseur-form" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
              {editingId ? t('crud.edit') : t('crud.create')}
            </Button>
          </div>
        }
      >
            <form id="fournisseur-form" onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium mb-1">{t('fournisseur.telephone')}</label>
                  <Input
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="+212 6 XX XX XX XX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('fournisseur.contact')}</label>
                  <Input
                    name="contact_principal"
                    value={formData.contact_principal}
                    onChange={handleInputChange}
                    placeholder="Nom du contact"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('fournisseur.adresse')}</label>
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
                  <label className="block text-sm font-medium mb-1">{t('fournisseur.codePostal')}</label>
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

            </form>
      </AppModal>

      {filteredFournisseurs.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500">{t('crud.noResults')}</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className={viewContainerClass(viewMode)}>
          {filteredFournisseurs.map((fournisseur) => (
            <RecordCard key={fournisseur.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{fournisseur.nom}</h3>
                <Badge variant={fournisseur.est_actif ? 'default' : 'secondary'}>
                  {fournisseur.est_actif ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RecordField label={t('users.email')} value={fournisseur.email} />
                <RecordField label={t('fournisseur.telephone')} value={fournisseur.telephone} />
                <RecordField label="Ville" value={fournisseur.ville} />
                <RecordField label={t('fournisseur.contact')} value={fournisseur.contact_principal} />
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(fournisseur)}>
                  <Pencil className="h-4 w-4 mr-1" /> {t('crud.edit')}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-rose-600" onClick={() => handleDeleteClick(fournisseur)}>
                  <Trash2 className="h-4 w-4 mr-1" /> {t('crud.delete')}
                </Button>
              </div>
            </RecordCard>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('users.email')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('fournisseur.telephone')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ville</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('fournisseur.contact')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('columns.statut')}</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{t('crud.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFournisseurs.map((fournisseur) => (
                <tr key={fournisseur.id} className="border-b hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
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
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(fournisseur)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(fournisseur)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, row: null })}
        onConfirm={confirmDelete}
        title={t('fournisseur.deleteConfirm')}
        message={t('common.confirmDeleteMsg', { name: deleteModalState.row?.nom })}
        loading={deletingId === deleteModalState.row?.id}
      />
    </div>
  )
}

export default FournisseursPage
