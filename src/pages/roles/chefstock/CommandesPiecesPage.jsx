import { ArrowLeft, Plus, Pencil, Trash2, RefreshCw, AlertCircle, Eye } from 'lucide-react'
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

const STATUTS = [
  { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
  { value: 'commande', label: 'Commandée', color: 'bg-blue-100 text-blue-800' },
  { value: 'livree', label: 'Livrée', color: 'bg-green-100 text-green-800' },
  { value: 'rejetee', label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  { value: 'annulee', label: 'Annulée', color: 'bg-yellow-100 text-yellow-800' },
]

function CommandesPiecesPage() {
  const { t } = useTranslation()
  const { runWithFeedback } = useOperationFeedback()
  const navigate = useNavigate()
  const [commandes, setCommandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState('all')
  const [viewMode, setViewMode] = useViewMode('chefstock-commandes')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, row: null })
  const [deletingId, setDeletingId] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [formData, setFormData] = useState({
    numero_commande: '',
    fournisseur: '',
    montant_total: 0,
    date_livraison_prevue: '',
    remarques: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [commandesData, fournisseursData] = await Promise.all([
        entityServices['commandes-pieces'].listAll(),
        entityServices.fournisseurs.listAll(),
      ])
      setCommandes(commandesData)
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

  const filteredCommandes = useMemo(() => {
    let result = commandes
    if (filterStatut !== 'all') {
      result = result.filter((c) => c.statut === filterStatut)
    }
    const q = searchTerm.trim().toLowerCase()
    if (!q) return result
    return result.filter((c) => {
      const fournisseurName = fournisseurs.find((f) => f.id === c.fournisseur)?.nom || ''
      return c.numero_commande.toLowerCase().includes(q) || fournisseurName.toLowerCase().includes(q)
    })
  }, [commandes, searchTerm, filterStatut, fournisseurs])

  const hasActiveFilters = filterStatut !== 'all' || searchTerm.trim().length > 0

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

    const { statut: _ignoredStatut, ...payload } = formData

    try {
      await runWithFeedback(
        async () => {
          if (editingId) {
            await entityServices['commandes-pieces'].update(editingId, payload)
          } else {
            await entityServices['commandes-pieces'].create(payload)
          }
          await loadData()
        },
        {
          action: editingId ? 'update' : 'create',
          entity: t('commande.title'),
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

  const handleEdit = (commande) => {
    setFormData(commande)
    setEditingId(commande.id)
    setShowForm(true)
  }

  const handleDeleteClick = (commande) => {
    setDeleteModalState({ isOpen: true, row: commande })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.row) return
    setDeletingId(deleteModalState.row.id)
    setError('')
    try {
      await runWithFeedback(
        async () => {
          await entityServices['commandes-pieces'].delete(deleteModalState.row.id)
          await loadData()
        },
        { action: 'delete', entity: deleteModalState.row.numero_commande },
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
      numero_commande: '',
      fournisseur: '',
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
            <h1 className="text-3xl font-bold tracking-tight dark:text-slate-100">{t('commande.title')}</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">{t('achat.suiviDesc')}</p>
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

      <DataFiltersBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('commande.searchPlaceholder')}
        shown={filteredCommandes.length}
        total={commandes.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm('')
          setFilterStatut('all')
        }}
        filters={[
          {
            id: 'statut',
            label: t('columns.statut'),
            value: filterStatut,
            onChange: setFilterStatut,
            options: [
              { value: 'all', label: t('common.allStatuses') },
              ...STATUTS.map((s) => ({ value: s.value, label: s.label })),
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
        title={editingId ? t('commande.editTitle') : t('commande.createTitle')}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false) }}>
              {t('crud.cancel')}
            </Button>
            <Button type="submit" form="commande-form" disabled={loading} className="bg-sky-600 hover:bg-sky-700">
              {editingId ? t('crud.edit') : t('crud.create')}
            </Button>
          </div>
        }
      >
            <form id="commande-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('commande.numero')} *</label>
                  <Input
                    name="numero_commande"
                    value={formData.numero_commande}
                    onChange={handleInputChange}
                    required
                    placeholder="CMD-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('commande.fournisseur')} *</label>
                  <select
                    name="fournisseur"
                    value={formData.fournisseur}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('achat.selectSupplier')}</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('commande.datePrevue')}</label>
                  <Input
                    name="date_livraison_prevue"
                    type="datetime-local"
                    value={formData.date_livraison_prevue}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('commande.montant')}</label>
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

            </form>
      </AppModal>

      <AppModal
        open={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        eyebrow={t('commande.title')}
        title={t('crud.details')}
        size="md"
      >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('commande.numero')}</p>
                <p className="font-medium">{selectedDetail.numero_commande}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('commande.fournisseur')}</p>
                <p className="font-medium">{getFournisseurName(selectedDetail.fournisseur)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <Badge className={getStatutBadge(selectedDetail.statut).color}>
                  {getStatutBadge(selectedDetail.statut).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('commande.montant')}</p>
                <p className="font-medium">{selectedDetail.montant_total} DT</p>
              </div>
            </div>
            {selectedDetail.remarques && (
              <div>
                <p className="text-sm text-gray-500">Remarques</p>
                <p className="text-sm">{selectedDetail.remarques}</p>
              </div>
            )}
          </div>
      </AppModal>

      {filteredCommandes.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500">{t('crud.noResults')}</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className={viewContainerClass(viewMode)}>
          {filteredCommandes.map((commande) => (
            <RecordCard key={commande.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{commande.numero_commande}</h3>
                <Badge className={getStatutBadge(commande.statut).color}>{getStatutBadge(commande.statut).label}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RecordField label={t('commande.fournisseur')} value={getFournisseurName(commande.fournisseur)} />
                <RecordField label={t('commande.montant')} value={`${commande.montant_total} DT`} />
                <RecordField label="Date" value={new Date(commande.date_commande).toLocaleDateString()} />
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setSelectedDetail(commande)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(commande)}>
                  <Pencil className="h-4 w-4 mr-1" /> {t('crud.edit')}
                </Button>
                <Button variant="outline" size="sm" className="text-rose-600" onClick={() => handleDeleteClick(commande)}>
                  <Trash2 className="h-4 w-4" />
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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Numéro</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('commande.fournisseur')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('columns.statut')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{t('commande.montant')}</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">{t('crud.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommandes.map((commande) => (
                <tr key={commande.id} className="border-b hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-sm font-medium">{commande.numero_commande}</td>
                  <td className="px-4 py-3 text-sm">{getFournisseurName(commande.fournisseur)}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge className={getStatutBadge(commande.statut).color}>{getStatutBadge(commande.statut).label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{commande.montant_total} DT</td>
                  <td className="px-4 py-3 text-sm">{new Date(commande.date_commande).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(commande)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(commande)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(commande)}>
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
        title={t('commande.deleteConfirm')}
        message={t('common.confirmDeleteMsg', { name: deleteModalState.row?.numero_commande })}
        loading={deletingId === deleteModalState.row?.id}
      />
    </div>
  )
}

export default CommandesPiecesPage
