import { ArrowLeft, Pencil, Plus, RefreshCw, Search, Trash2, X, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { ADMIN_ENTITIES } from '../../lib/adminEntities'
import { extractApiErrorMessage } from '../../lib/api'
import { entityServices } from '../../services/entities'
import {
  coercePayloadValue,
  displayValue,
  toInputValue,
} from './helpers'

function buildEmptyForm(entity, mode) {
  return entity.fields.reduce((accumulator, field) => {
    if (field.createOnly && mode === 'edit') {
      return accumulator
    }

    accumulator[field.key] = ''
    return accumulator
  }, {})
}

function buildEditForm(entity, row) {
  return entity.fields.reduce((accumulator, field) => {
    if (field.createOnly) {
      return accumulator
    }

    accumulator[field.key] = toInputValue(row[field.key], field.type)
    return accumulator
  }, {})
}

function getPieceMainName(row) {
  const rawName = String(row?.nom ?? '').trim()

  if (!rawName) {
    const fallbackModel = String(row?.modele ?? '').trim()
    return fallbackModel || 'Sans pièce'
  }

  const cleaned = rawName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(' ').filter(Boolean)
  if (words.length <= 2) {
    return cleaned
  }

  return `${words[0]} ${words[1]}`
}

function groupPieceRows(rows) {
  const buckets = new Map()

  for (const row of rows) {
    const label = getPieceMainName(row)
    const key = label.toLowerCase()
    const previous = buckets.get(key)
    const quantity = Number(row?.quantite_stock) || 0

    if (!previous) {
      buckets.set(key, {
        key,
        label,
        totalStock: quantity,
        items: [row],
      })
      continue
    }

    previous.totalStock += quantity
    previous.items = [...previous.items, row]
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function EntityCrudPage() {
  const { t } = useTranslation()
  const { entityKey } = useParams()
  const navigate = useNavigate()

  const entity = useMemo(
    () => ADMIN_ENTITIES.find((item) => item.key === entityKey) ?? null,
    [entityKey],
  )

  const entityService = useMemo(
    () => (entity ? entityServices[entity.serviceKey] : null),
    [entity],
  )

  const [rows, setRows] = useState([])
  const [lookupData, setLookupData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [drawerMode, setDrawerMode] = useState('')
  const [formData, setFormData] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, row: null })

  const loadRows = useCallback(async () => {
    if (!entity || !entityService) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const list = await entityService.list()
      setRows(list)
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Failed to load {{entity}}.', { entity: entity.label })))
    } finally {
      setLoading(false)
    }
  }, [entity, entityService, t])

  const loadLookups = useCallback(async () => {
    if (!entity) {
      return
    }

    const lookupFields = entity.fields.filter((field) => field.type === 'lookup' && field.lookup)
    const uniqueServiceKeys = [...new Set(lookupFields.map((field) => field.lookup.serviceKey))]

    if (uniqueServiceKeys.length === 0) {
      setLookupData({})
      return
    }

    const requests = uniqueServiceKeys.map(async (serviceKey) => {
      const lookupService = entityServices[serviceKey]

      if (!lookupService) {
        return { serviceKey, items: [] }
      }

      try {
        const items = await lookupService.list()
        return { serviceKey, items }
      } catch {
        return { serviceKey, items: [] }
      }
    })

    const results = await Promise.all(requests)
    const nextMap = {}

    for (const result of results) {
      nextMap[result.serviceKey] = result.items
    }

    setLookupData(nextMap)
  }, [entity])

  useEffect(() => {
    if (!entity) {
      navigate('/admin', { replace: true })
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      void loadRows()
      void loadLookups()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [entity, loadLookups, loadRows, navigate])

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) {
      return rows
    }

    const keyword = searchText.toLowerCase()

    return rows.filter((row) => {
      return Object.values(row).some((value) => displayValue(value).toLowerCase().includes(keyword))
    })
  }, [rows, searchText])

  const groupedPieceRows = useMemo(() => {
    if (entity?.key !== 'pieces') {
      return []
    }

    return groupPieceRows(filteredRows)
  }, [entity?.key, filteredRows])

  const openCreate = () => {
    if (!entity) {
      return
    }

    setDrawerMode('create')
    setSaveError('')
    setEditingId(null)
    setFormData(buildEmptyForm(entity, 'create'))
  }

  const openEdit = (row) => {
    if (!entity) {
      return
    }

    setDrawerMode('edit')
    setSaveError('')
    setEditingId(row.id)
    setFormData(buildEditForm(entity, row))
  }

  const closeDrawer = () => {
    setDrawerMode('')
    setSaveError('')
    setEditingId(null)
    setFormData({})
  }

  const handleFieldChange = (fieldKey, value) => {
    setFormData((previous) => ({
      ...previous,
      [fieldKey]: value,
    }))
  }

  const buildPayload = () => {
    if (!entity) {
      return {}
    }

    const payload = {}

    for (const field of entity.fields) {
      if (field.createOnly && drawerMode === 'edit') {
        continue
      }

      if (field.readOnly) {
        continue
      }

      const rawValue = formData[field.key]
      const coerced = coercePayloadValue(rawValue, field.type)

      if (coerced === null || coerced === undefined) {
        if (field.required && drawerMode === 'create') {
          payload[field.key] = field.type === 'boolean' ? false : ''
        }

        continue
      }

      payload[field.key] = coerced
    }

    return payload
  }

  const saveForm = async () => {
    if (!entity || !drawerMode) {
      return
    }

    setSaving(true)
    setSaveError('')

    const payload = buildPayload()

    try {
      if (drawerMode === 'create') {
        await entityService.create(payload)
      } else {
        await entityService.update(editingId, payload)
      }

      await loadRows()
      closeDrawer()
    } catch (requestError) {
      setSaveError(extractApiErrorMessage(requestError, t('Unable to save changes.')))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    const rowId = deleteModalState.row?.id
    if (!entity || !entityService || !rowId) {
      return
    }

    setDeletingId(rowId)

    try {
      await entityService.remove(rowId)
      await loadRows()
      setDeleteModalState({ isOpen: false, row: null })
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Unable to delete record.')))
    } finally {
      setDeletingId(null)
    }
  }

  if (!entity || !entityService) {
    return null
  }

  return (
    <div className="space-y-4">
      <header className="glass-panel animate-rise p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              aria-label={t('Go back')}
              className="shrink-0 border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {entity.label}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              {t('Full CRUD management for {{entity}}.', { entity: entity.label.toLowerCase() })}
            </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('New Record')}
            </Button>
          </div>
        </div>

        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-300" />
          <input
            className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 pl-9 pr-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
            placeholder={t('Search {{entity}}', { entity: entity.label })}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </header>

      <Card className="animate-rise delay-1 border-0 shadow-none bg-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('{{entity}} Records', { entity: entity.label })}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('{{shown}} / {{total}} shown', { shown: filteredRows.length, total: rows.length })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {entity.key === 'pieces' ? (
            groupedPieceRows.map((group) => (
              <div key={group.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 shadow-sm lg:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-[#145f7a] bg-slate-50 dark:bg-slate-900 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">Pièce principale</p>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{group.label}</h3>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1 font-medium text-slate-600 dark:text-slate-400">
                      Stock total {group.totalStock}
                    </span>
                  </div>
                </div>

                <ul className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                   {group.items.map((row, rowIndex) => (
                    <li key={row.id ?? `${entity.key}-${group.key}-${rowIndex}`} className={`border-b px-4 py-3.5 last:border-b-0 sm:flex sm:items-center sm:justify-between transition-all ${
                      row.statut === 'refuse' ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-900/20' :
                      row.statut === 'termine' ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' :
                      row.statut === 'en_cours' ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/20' :
                      'border-slate-100 bg-transparent'
                    }`}>
                      <div className="table-row-grid flex-1 w-full" style={{ '--row-grid-cols': `64px repeat(${entity.columns.length - 1}, minmax(0, 1fr))` }}>
                        {entity.columns.map((column, colIndex) => (
                          <div key={`${column}-${group.key}-${rowIndex}`} className="flex flex-col min-w-0">
                            <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-300">{column.replace(/_/g, ' ')}</span>

                            {colIndex === 0 ? (
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">#{displayValue(row[column])}</span>
                            ) : column === 'est_payee' ? (
                              <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${row[column] === true || row[column] === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                {row[column] === true || row[column] === 'true' ? 'PAYÉE' : 'NON PAYÉE'}
                              </span>
                            ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                              <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${row[column] === true || row[column] === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                {row[column] === true || row[column] === 'true' ? 'OUI' : 'NON'}
                              </span>
                            ) : column === 'statut' ? (
                              <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full inline-flex font-semibold border
                                ${row[column] === 'en_attente' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                ${row[column] === 'en_cours' ? 'bg-sky-50 text-sky-700 border-sky-200' : ''}
                                ${row[column] === 'termine' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                ${row[column] === 'refuse' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                              `}>
                                {displayValue(row[column]).toUpperCase()}
                              </span>
                            ) : (
                              <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{displayValue(row[column]) || '-'}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2 sm:mt-0 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 shrink-0 self-end sm:self-auto sm:w-[200px]">
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeleteModalState({ isOpen: true, row })}
                          disabled={deletingId === row.id}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Supprimer
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
             filteredRows.map((row, rowIndex) => (
              <div key={row.id ?? `${entity.key}-${rowIndex}`} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-3 shadow-sm transition-all hover:shadow-md lg:p-4 ${
                row.statut === 'refuse' ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-900/30' :
                row.statut === 'termine' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/40' :
                row.statut === 'en_cours' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/40' :
                'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/25'
              }`}>
                <div className="table-row-grid flex-1 w-full" style={{ '--row-grid-cols': `64px repeat(${entity.columns.length - 1}, minmax(0, 1fr))` }}>
                  {entity.columns.map((column, colIndex) => (
                    <div key={`${column}-${rowIndex}`} className="flex flex-col min-w-0">
                      <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-300">{column.replace(/_/g, ' ')}</span>

                      {colIndex === 0 ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">#{displayValue(row[column])}</span>
                      ) : column === 'est_payee' ? (
                        <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full inline-flex font-semibold ${row[column] === true || row[column] === 'true' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {row[column] === true || row[column] === 'true' ? 'PAYÉE' : 'NON PAYÉE'}
                        </span>
                      ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                        <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full inline-flex font-semibold ${row[column] === true || row[column] === 'true' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {row[column] === true || row[column] === 'true' ? 'OUI' : 'NON'}
                        </span>
                      ) : column === 'statut' ? (
                        <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full inline-flex font-semibold border
                          ${row[column] === 'en_attente' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                          ${row[column] === 'en_cours' ? 'bg-sky-50 text-sky-700 border-sky-200' : ''}
                          ${row[column] === 'termine' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                          ${row[column] === 'refuse' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                        `}>
                          {displayValue(row[column]).toUpperCase()}
                        </span>
                      ) : (
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{displayValue(row[column]) || '-'}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 self-end sm:self-auto mt-2 sm:mt-0 sm:w-[200px]">
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                    onClick={() => setDeleteModalState({ isOpen: true, row })}
                    disabled={deletingId === row.id}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}

          {!loading && filteredRows.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-sm">Aucun enregistrement trouvé pour ce filtre.</p>
            </div>
          ) : null}
        </div>
      </Card>

      {drawerMode ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-auto border-l border-white/60 bg-[#e6eff3] p-4 sm:p-5">
            <div className="glass-panel h-full p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {drawerMode === 'create' ? t('Create') : t('Edit')} {entity.label}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('Fill the fields and save changes.')}</p>
                </div>

                <Button variant="ghost" size="sm" onClick={closeDrawer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {entity.fields
                  .filter((field) => !(field.createOnly && drawerMode === 'edit'))
                  .map((field) => {
                    const inputId = `${field.key}-${drawerMode}`
                    const value = formData[field.key] ?? ''
                    const isReadOnly = Boolean(field.readOnly)

                    if (field.type === 'textarea') {
                      return (
                        <label key={field.key} className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                          <textarea
                            id={inputId}
                            className="min-h-24 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                            value={value}
                            onChange={(event) => handleFieldChange(field.key, event.target.value)}
                            required={field.required && !isReadOnly}
                            disabled={isReadOnly}
                          />
                        </label>
                      )
                    }

                    if (field.type === 'json') {
                      return (
                        <label key={field.key} className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                          <textarea
                            id={inputId}
                            className="min-h-24 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                            value={value}
                            onChange={(event) => handleFieldChange(field.key, event.target.value)}
                            required={field.required && drawerMode === 'create' && !isReadOnly}
                            disabled={isReadOnly}
                            placeholder={field.label.toLowerCase().includes('array') ? '[ ]' : '{ }'}
                          />
                        </label>
                      )
                    }

                    if (field.type === 'select') {
                      return (
                        <label key={field.key} className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                          <select
                            id={inputId}
                            className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                            value={value}
                            onChange={(event) => handleFieldChange(field.key, event.target.value)}
                            required={field.required && !isReadOnly}
                            disabled={isReadOnly}
                          >
                            <option value="">{t('Select...')}</option>
                            {field.options?.map((optionValue) => (
                              <option key={optionValue} value={optionValue}>
                                {optionValue}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    }

                    if (field.type === 'boolean') {
                      return (
                        <label key={field.key} className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                          <select
                            id={inputId}
                            className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                            value={value}
                            onChange={(event) => handleFieldChange(field.key, event.target.value)}
                            disabled={isReadOnly}
                          >
                            <option value="">{t('Select...')}</option>
                            <option value="true">{t('Yes')}</option>
                            <option value="false">{t('No')}</option>
                          </select>
                        </label>
                      )
                    }

                    if (field.type === 'lookup' && field.lookup) {
                      let options = lookupData[field.lookup.serviceKey] ?? []

                      if (typeof field.lookup.filter === 'function') {
                        options = options.filter(field.lookup.filter)
                      }

                      return (
                        <label key={field.key} className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                          <select
                            id={inputId}
                            className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                            value={value}
                            onChange={(event) => handleFieldChange(field.key, event.target.value)}
                            required={field.required && !isReadOnly}
                            disabled={isReadOnly}
                          >
                            <option value="">{t('Select...')}</option>
                            {options.map((option) => {
                              const valueKey = field.lookup.valueKey
                              const labelKey = field.lookup.labelKey
                              const optionValue = option[valueKey]
                              const optionLabel = displayValue(option[labelKey])

                              return (
                                <option key={`${field.key}-${optionValue}`} value={optionValue}>
                                  {optionLabel}
                                </option>
                              )
                            })}
                          </select>
                        </label>
                      )
                    }

                    const htmlType =
                      field.type === 'number' ||
                      field.type === 'email' ||
                      field.type === 'password' ||
                      field.type === 'date'
                        ? field.type
                        : 'text'

                    return (
                      <label key={field.key} className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                        <input
                          id={inputId}
                          type={htmlType}
                          className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                          value={value}
                          onChange={(event) => handleFieldChange(field.key, event.target.value)}
                          required={field.required && !isReadOnly}
                          disabled={isReadOnly}
                        />
                      </label>
                    )
                  })}
              </div>

              {saveError ? (
                <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {saveError}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={saveForm} disabled={saving}>
                  {saving ? t('Saving...') : t('Save')}
                </Button>
                <Button variant="outline" onClick={closeDrawer}>
                  {t('Cancel')}
                </Button>
                <Badge className="ml-auto border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400">
                  {drawerMode === 'create' ? t('Create mode') : t('Edit mode')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mb-4">
                <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Confirmer la suppression</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Êtes-vous sûr de vouloir supprimer l'élément <strong className="text-slate-800 dark:text-slate-200">{displayValue(deleteModalState.row?.nom || deleteModalState.row?.nom_complet || deleteModalState.row?.username || deleteModalState.row?.id)}</strong> ? Cette action est irréversible.
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

export default EntityCrudPage
