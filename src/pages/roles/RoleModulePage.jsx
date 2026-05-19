import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, RefreshCw, Search, Trash2, X, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { getStoredAuth } from '../../lib/auth'
import { extractApiErrorMessage } from '../../lib/api'
import { getAdminEntityConfig } from '../../lib/adminEntities'
import { connectMessagesSocket } from '../../lib/messagesRealtime'
import { roleDashboardPath } from '../../lib/roleWorkspaces'
import { entityServices } from '../../services/entities'
import { coercePayloadValue, toInputValue } from '../admin/helpers'
import { displayRoleValue } from './helpers'

function buildEmptyForm(fields) {
  return fields.reduce((accumulator, field) => {
    accumulator[field.key] = ''
    return accumulator
  }, {})
}

function buildEditForm(fields, row) {
  return fields.reduce((accumulator, field) => {
    accumulator[field.key] = toInputValue(row[field.key], field.type)
    return accumulator
  }, {})
}

function toUserRef(value) {
  if (value === null || value === undefined) {
    return { id: null, name: i18n.t('Unknown User') }
  }

  if (typeof value === 'object') {
    return {
      id: value.id ? Number(value.id) : null,
      name: value.username || value.nom_complet || value.email || (value.id ? `User #${value.id}` : i18n.t('Unknown User')),
    }
  }

  const numeric = Number(value)
  if (Number.isInteger(numeric) && numeric > 0) {
    return { id: numeric, name: `User #${numeric}` }
  }

  return { id: null, name: String(value) }
}

function toConversationKey(userRef) {
  if (userRef.id) {
    return `id:${userRef.id}`
  }

  return `name:${String(userRef.name || '').toLowerCase()}`
}

function parseTimestamp(value) {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatMessageTime(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString()
}

function isMessageFromCurrentUser(message, currentUserId, currentUsername) {
  const sender = toUserRef(message?.expediteur)

  if (currentUserId && sender.id) {
    return sender.id === currentUserId
  }

  if (!currentUsername) {
    return false
  }

  return String(sender.name || '').toLowerCase() === currentUsername
}

function resolveOtherParty(message, currentUserId, currentUsername) {
  const sender = toUserRef(message?.expediteur)
  const receiver = toUserRef(message?.destinataire)

  if (isMessageFromCurrentUser(message, currentUserId, currentUsername)) {
    return receiver
  }

  if (currentUserId && receiver.id === currentUserId) {
    return sender
  }

  if (currentUsername && String(receiver.name || '').toLowerCase() === currentUsername) {
    return sender
  }

  return receiver.id ? receiver : sender
}



function getPieceCategoryName(row) {
  if (row?.categorie_detail?.nom) {
    return row.categorie_detail.nom
  }
  if (row?.categorie && typeof row.categorie === 'object' && row.categorie.nom) {
    return row.categorie.nom
  }
  return i18n.t('Unrecognized')
}

function groupPieceRows(rows) {
  const buckets = new Map()

  for (const row of rows) {
    const label = getPieceCategoryName(row)
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

function groupRequestedPieceRows(requestRows, availablePieces) {
  const pieceIndex = new Map((availablePieces ?? []).map((piece) => [String(piece?.id), piece]))
  const buckets = new Map()

  for (const row of requestRows) {
    const pieceData = pieceIndex.get(String(row?.piece?.id ?? row?.piece))
    const labelSource = pieceData ?? row?.piece ?? row
    const label = getPieceCategoryName(labelSource)
    const key = label.toLowerCase()
    const quantity = Number(row?.quantite) || 0
    const previous = buckets.get(key)

    if (!previous) {
      buckets.set(key, {
        key,
        label,
        totalRequested: quantity,
        items: [{ ...row, pieceData }],
      })
      continue
    }

    previous.totalRequested += quantity
    previous.items = [...previous.items, { ...row, pieceData }]
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function RoleModulePage() {
  const { t } = useTranslation()
  const { moduleKey } = useParams()
  const { role, workspace } = useOutletContext()
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const wsRef = useRef(null)
  const messagesListRef = useRef(null)

  const moduleConfig = useMemo(
    () => workspace.modules.find((module) => module.key === moduleKey) ?? null,
    [workspace.modules, moduleKey],
  )

  const service = useMemo(
    () => (moduleConfig ? entityServices[moduleConfig.serviceKey] : null),
    [moduleConfig],
  )

  const moduleEntity = useMemo(
    () => (moduleConfig ? getAdminEntityConfig(moduleConfig.key) : null),
    [moduleConfig],
  )

  const permissions = useMemo(() => {
    const defaults = { create: false, update: false, delete: false }
    return { ...defaults, ...(moduleConfig?.permissions ?? {}) }
  }, [moduleConfig])

  const editableFields = useMemo(() => {
    if (!moduleEntity) {
      return []
    }

    let fields = moduleEntity.fields

    if (moduleConfig?.editableFields?.length) {
      const allowedSet = new Set(moduleConfig.editableFields)
      fields = fields.filter((field) => allowedSet.has(field.key))
    }

    if (moduleConfig?.readOnlyFields?.length) {
      const readOnlySet = new Set(moduleConfig.readOnlyFields)
      fields = fields.map((field) => {
        if (readOnlySet.has(field.key)) {
          return { ...field, readOnly: true }
        }
        return field
      })
    }

    return fields
  }, [moduleEntity, moduleConfig])

  const [rows, setRows] = useState([])
  const [readyInterventions, setReadyInterventions] = useState(new Set())
  const [lookupData, setLookupData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [drawerMode, setDrawerMode] = useState('')
  const [formData, setFormData] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [wsState, setWsState] = useState('idle')
  const [activeConversationKey, setActiveConversationKey] = useState('')
  const [composerSubject, setComposerSubject] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [manualRecipientId, setManualRecipientId] = useState('')
  const [currentFiche, setCurrentFiche] = useState(null)
  const [availablePieces, setAvailablePieces] = useState([])
  const [requestedPieces, setRequestedPieces] = useState([])
  const [selectedPieceId, setSelectedPieceId] = useState('')
  const [selectedPieceQty, setSelectedPieceQty] = useState(1)
  const [requestingPiece, setRequestingPiece] = useState(false)

  const isMessagesModule = moduleConfig?.key === 'messages'

  const getResolvedColumnValue = useCallback((column, value) => {
    if (!moduleEntity?.fields || value == null) return displayRoleValue(value)
    
    if (column === 'id') return displayRoleValue(value)

    const field = moduleEntity.fields.find(f => f.key === column)
    if (field?.type === 'lookup' && field.lookup && lookupData[field.lookup.serviceKey]) {
      const match = lookupData[field.lookup.serviceKey].find(d => 
        String(d[field.lookup.valueKey]) === String(value) || 
        String(d.id) === String(value?.id || value)
      )
      if (match) {
        return displayRoleValue(match[field.lookup.labelKey] ?? match)
      }
    }
    return displayRoleValue(value)
  }, [moduleEntity, lookupData])

  const currentUserId = useMemo(() => {
    const parsed = Number(auth?.userId)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [auth?.userId])

  const currentUsername = useMemo(
    () => String(auth?.username ?? '').trim().toLowerCase(),
    [auth?.username],
  )

  const loadLookups = useCallback(async () => {
    if (!editableFields.length) {
      setLookupData({})
      return
    }

    const lookupFields = editableFields.filter((field) => field.type === 'lookup' && field.lookup)
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
    const nextLookupMap = {}

    for (const result of results) {
      nextLookupMap[result.serviceKey] = result.items
    }

    setLookupData(nextLookupMap)
  }, [editableFields])

  const loadRows = useCallback(async () => {
    if (!service) {
      return
    }

    setLoading(true)
    setError('')

    try {
      let list = []

      if (moduleConfig?.useMineEndpoint && typeof service.listMine === 'function') {
        try {
          list = await service.listMine()
        } catch {
          list = await service.list()
        }
      } else {
        list = await service.list()
      }



      setRows(list)
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Failed to load module data.')))
    } finally {
      setLoading(false)
    }
  }, [moduleConfig, service, t])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadRows()
      if (permissions.create || permissions.update) {
        void loadLookups()
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [loadLookups, loadRows, permissions.create, permissions.update])

  const filteredRows = useMemo(() => {
      let result = rows

      if (role === 'manager' && moduleConfig?.key === 'demande-maintenances' && currentUserId) {
        result = result.filter((row) => Number(row.manager) === currentUserId || Number(row.manager?.id) === currentUserId)
      }

      if (moduleConfig?.key === 'demande-maintenances') {
        if (filterStatut !== 'tous') {
          result = result.filter(row => row.statut === filterStatut)
        }
        if (filterPriorite !== 'tous') {
          result = result.filter(row => row.priorite === filterPriorite)
        }
      }

      if (role === 'receptioniste' && moduleConfig?.key === 'factures') {
        if (filterStatut === 'payee') {
          result = result.filter(row => row.est_payee === true || row.est_payee === 'true')
        } else if (filterStatut === 'non_payee') {
          result = result.filter(row => row.est_payee === false || row.est_payee === 'false' || row.est_payee === undefined)
        }
      }

      if (!searchText.trim()) {
        return result
      }

      const keyword = searchText.toLowerCase()

      return result.filter((row) => {
        return Object.values(row).some((value) => displayRoleValue(value).toLowerCase().includes(keyword))
      })
    }, [rows, searchText, filterStatut, filterPriorite, role, moduleConfig, currentUserId])

  const groupedPieceRows = useMemo(() => {
    if (moduleConfig?.key !== 'pieces') {
      return []
    }

    return groupPieceRows(filteredRows)
  }, [filteredRows, moduleConfig?.key])

  const groupedAvailablePieces = useMemo(() => {
    if (moduleConfig?.key !== 'interventions') {
      return []
    }

    return groupPieceRows(availablePieces)
  }, [availablePieces, moduleConfig?.key])

  const groupedRequestedPieces = useMemo(() => {
    if (moduleConfig?.key !== 'interventions') {
      return []
    }

    return groupRequestedPieceRows(requestedPieces, availablePieces)
  }, [requestedPieces, availablePieces, moduleConfig?.key])


  const availableRecipients = useMemo(() => {
    const users = lookupData.users ?? []

    return users.filter((user) => {
      if (!currentUserId) {
        return true
      }

      return Number(user?.id) !== currentUserId
    })
  }, [currentUserId, lookupData.users])

  const conversations = useMemo(() => {
    if (!isMessagesModule) {
      return []
    }

    const buckets = new Map()

    for (const message of filteredRows) {
      const party = resolveOtherParty(message, currentUserId, currentUsername)
      const key = toConversationKey(party)

      const previous = buckets.get(key)
      const nextMessages = previous ? [...previous.messages, message] : [message]
      const sortedMessages = nextMessages.sort(
        (a, b) => parseTimestamp(a?.date_envoi) - parseTimestamp(b?.date_envoi),
      )

      buckets.set(key, {
        key,
        party,
        messages: sortedMessages,
        lastMessage: sortedMessages[sortedMessages.length - 1] ?? null,
      })
    }

    return [...buckets.values()].sort(
      (a, b) => parseTimestamp(b.lastMessage?.date_envoi) - parseTimestamp(a.lastMessage?.date_envoi),
    )
  }, [currentUserId, currentUsername, filteredRows, isMessagesModule])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  )

  const resolvedRecipientId = useMemo(() => {
    if (activeConversation?.party?.id) {
      return Number(activeConversation.party.id)
    }

    const parsed = Number(manualRecipientId)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [activeConversation?.party?.id, manualRecipientId])

  useEffect(() => {
    if (!isMessagesModule) {
      setActiveConversationKey('')
      setComposerSubject('')
      setComposerContent('')
      setManualRecipientId('')
      return
    }

    if (activeConversationKey === 'new') {
      return
    }

    if (!conversations.length) {
      setActiveConversationKey('new')
      return
    }

    if (!conversations.some((conversation) => conversation.key === activeConversationKey)) {
      setActiveConversationKey(conversations[0].key)
    }
  }, [activeConversationKey, conversations, isMessagesModule])

  useEffect(() => {
    if (!isMessagesModule || activeConversation?.party?.id || manualRecipientId) {
      return
    }

    if (availableRecipients.length > 0) {
      setManualRecipientId(String(availableRecipients[0].id))
    }
  }, [activeConversation?.party?.id, availableRecipients, isMessagesModule, manualRecipientId])

  useEffect(() => {
    if (!isMessagesModule || !messagesListRef.current) {
      return
    }

    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight
  }, [activeConversation?.messages, isMessagesModule])

  useEffect(() => {
    if (!isMessagesModule) {
      setWsState('idle')
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    if (!auth?.access) {
      setWsState('error')
      return
    }

    setWsState('connecting')

    const socket = connectMessagesSocket(auth.access, {
      onOpen: () => {
        setWsState('connected')
      },
      onClose: () => {
        setWsState((prev) => (prev === 'error' ? prev : 'closed'))
      },
      onError: () => {
        setWsState('error')
      },
      onMessage: (eventPayload) => {
        if (!eventPayload || eventPayload.type !== 'message.created') {
          return
        }

        setRows((previousRows) => {
          const existingIndex = previousRows.findIndex((item) => item.id === eventPayload.id)

          if (existingIndex >= 0) {
            const updated = [...previousRows]
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...eventPayload,
            }
            return updated
          }

          return [eventPayload, ...previousRows]
        })
      },
    })

    wsRef.current = socket

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [auth?.access, isMessagesModule])

  const openCreate = () => {
    if (!permissions.create || !editableFields.length) {
      return
    }

    const baseForm = buildEmptyForm(editableFields)

    if (
      role === 'receptioniste' &&
      moduleConfig?.key === 'demande-maintenances' &&
      Object.prototype.hasOwnProperty.call(baseForm, 'statut')
    ) {
      baseForm.statut = 'en_attente'
    }

    if (
      role === 'manager' &&
      moduleConfig?.key === 'factures' &&
      Object.prototype.hasOwnProperty.call(baseForm, 'est_payee')
    ) {
      baseForm.est_payee = false
    }

    setDrawerMode('create')
    setEditingId(null)
    setSaveError('')
    setFormData(baseForm)
  }

  const loadFichePieces = async (ficheId) => {
    try {
      const p = await entityServices['pieces'].list();
      setAvailablePieces(p);
      const r = await entityServices['demande-pieces'].list();
      setRequestedPieces(r.filter(req => Number(req.fiche) === ficheId || Number(req.fiche?.id) === ficheId));
    } catch (e) {
      console.error(e);
    }
  }

  const openEdit = async (row) => {
    if (!permissions.update || !editableFields.length) {
      return
    }

    setDrawerMode('edit')
    setEditingId(row.id)
    setSaveError('')
    setFormData(buildEditForm(editableFields, row))
    
    if (role === 'technicien' && moduleConfig?.key === 'interventions') {
      try {
        const fiches = await entityServices['fiche-reparations'].list();
        const relatedFiche = fiches.find(f => Number(f.intervention) === Number(row.id) || Number(f.intervention?.id) === Number(row.id));
        setCurrentFiche(relatedFiche || null);
        if (relatedFiche) {
           await loadFichePieces(relatedFiche.id);
        }
      } catch {
        setCurrentFiche(null);
      }
    } else {
      setCurrentFiche(null);
    }
  }

  const closeDrawer = () => {
    setDrawerMode('')
    setEditingId(null)
    setSaveError('')
    setFormData({})
    setCurrentFiche(null)
    setRequestedPieces([])
    setAvailablePieces([])
    setSelectedPieceId('')
    setSelectedPieceQty(1)
  }

  const submitPieceRequest = async () => {
    if (!currentFiche || !selectedPieceId || !selectedPieceQty) return;
    setRequestingPiece(true);
    try {
      await entityServices['demande-pieces'].create({
        fiche: currentFiche.id,
        piece: Number(selectedPieceId),
        quantite: Number(selectedPieceQty),
        statut: 'demandee'
      });
      await loadFichePieces(currentFiche.id);
      setSelectedPieceId('');
      setSelectedPieceQty(1);
    } catch (e) {
      console.error(e);
    } finally {
      setRequestingPiece(false);
    }
  }

  const cancelPieceRequest = async (requestId) => {
    if (!confirm('Voulez-vous vraiment annuler cette demande de pièce ?')) return;
    try {
      await entityServices['demande-pieces'].remove(requestId);
      if (currentFiche) {
        await loadFichePieces(currentFiche.id);
      }
    } catch (e) {
      console.error(t('Failed to cancel piece request'), e)
    }
  }

  const handleFieldChange = (fieldKey, value) => {
    setFormData((previous) => {
      const nextData = { ...previous, [fieldKey]: value }
      
      if (role === 'manager' && moduleConfig?.key === 'fiche-reparations' && fieldKey === 'confirmation') {
        nextData.valide_manager = value
      }
      
      return nextData
    })
  }

  const buildPayload = () => {
    const payload = {}

    for (const field of editableFields) {
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

      if (role === 'receptioniste' && moduleConfig?.key === 'demande-maintenances' && drawerMode === 'create') {
        payload.statut = 'en_attente'
      }

      if (role === 'manager' && moduleConfig?.key === 'factures' && drawerMode === 'create') {
        if (payload.est_payee === '' || payload.est_payee === undefined || payload.est_payee === null) {
          payload.est_payee = false
        }
      }

      return payload
    }

  const saveForm = async () => {
    if (!drawerMode || !service) {
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const payload = buildPayload()

      if (
        drawerMode === 'create' &&
        isMessagesModule &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message.send',
            destinataire: payload.destinataire,
            objet: payload.objet,
            contenu: payload.contenu,
          }),
        )
      } else if (drawerMode === 'create') {
        await service.create(payload)
      } else {
        const originalRow = rows.find(r => r.id === editingId)
        
        if (
           role === 'manager' && 
           moduleConfig?.key === 'demande-maintenances' && 
           originalRow?.statut === 'en_attente' && 
           payload.statut === 'en_cours'
        ) {
           if (!formData.technicien || !formData.description_panne) {
             setSaveError(t('Technicien and Description Panne are required to accept the request.'))
             setSaving(false)
             return
           }
           
           await service.update(editingId, payload)
           
           try {
             const createdIntervention = await entityServices['interventions'].create({
               demande: editingId,
               technicien: Number(formData.technicien),
               diagnostic: 'À remplir par le technicien...',
               solution_proposee: 'À remplir par le technicien...',
               statut: 'en_attente',
               date_debut: new Date().toISOString().split('T')[0]
             })
             
             if (createdIntervention?.id) {
               await entityServices['fiche-reparations'].create({
                 intervention: createdIntervention.id,
                 description_panne: formData.description_panne,
                 solution: '',
                 cout_main_oeuvre: 0,
                 confirmation: false,
                 valide_manager: false
               })
             }
           } catch (e) {
             console.error(t('Failed to spawn intervention and fiche'), e)
           }
        } else {
           await service.update(editingId, payload)
           
           if (role === 'technicien' && moduleConfig?.key === 'interventions') {
              setReadyInterventions(prev => {
                const next = new Set(prev)
                next.add(editingId)
                return next
              })
           }
        }
      }

      if (!isMessagesModule || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await loadRows()
      }

      closeDrawer()
    } catch (requestError) {
      setSaveError(extractApiErrorMessage(requestError, t('Unable to save changes.')))
    } finally {
      setSaving(false)
    }
  }

  const deleteRow = async (rowId) => {
    if (!permissions.delete || !service || !rowId) {
      return
    }

    setDeletingId(rowId)

    try {
      await service.remove(rowId)
      await loadRows()
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Unable to delete record.')))
    } finally {
      setDeletingId(null)
    }
  }

  const sendComposerMessage = async () => {
    if (!isMessagesModule || !permissions.create || !service) {
      return
    }

    const contenu = composerContent.trim()
    const recipientId = resolvedRecipientId

    if (!recipientId) {
      setSaveError(t('Select a recipient first.'))
      return
    }

    if (!contenu) {
      setSaveError(t('Message content is required.'))
      return
    }

    const defaultSubject =
      String(activeConversation?.lastMessage?.objet ?? '').trim() ||
      String(activeConversation?.party?.displayName ?? '').trim() ||
      t('Message')

    const payload = {
      destinataire: recipientId,
      objet: composerSubject.trim() || defaultSubject,
      contenu,
    }

    setSaving(true)
    setSaveError('')

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message.send',
            ...payload,
          }),
        )
      } else {
        await service.create(payload)
        await loadRows()
      }

      setComposerContent('')
      setComposerSubject('')
    } catch (requestError) {
      setSaveError(extractApiErrorMessage(requestError, t('Unable to send message.')))
    } finally {
      setSaving(false)
    }
  }

  if (!moduleConfig || !service) {
    return <Navigate to={roleDashboardPath(role)} replace />
  }

  return (
    <div className="space-y-4">
      <header className="glass-panel animate-rise p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate(roleDashboardPath(role))}
              aria-label={t('Go back')}
              className="mt-0.5 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
                {moduleConfig.label}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                {moduleConfig.description || `Operational view for ${moduleConfig.label.toLowerCase()}.`}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2">
            {isMessagesModule ? (
              <Badge
                className={
                  wsState === 'connected'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : wsState === 'connecting'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400'
                }
              >
                WS: {wsState}
              </Badge>
            ) : null}

            {permissions.create && !isMessagesModule ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Record
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-300" />
            <input
              className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 pl-9 pr-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
              placeholder={isMessagesModule ? 'Search conversations and messages' : `Search ${moduleConfig.label}`}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          {moduleConfig?.key === 'demande-maintenances' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                className="h-9 w-full sm:w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous les status</option>
                <option value="en_attente">En Attente</option>
                <option value="en_cours">En Cours</option>
                <option value="termine">Terminé</option>
                <option value="refuse">Non Résolu</option>
              </select>

              <select
                className="h-9 w-full sm:w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
                value={filterPriorite}
                onChange={e => setFilterPriorite(e.target.value)}
              >
                <option value="tous">Toutes les priorités</option>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="faible">Faible</option>
              </select>
            </div>
          )}

          {moduleConfig?.key === 'factures' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                className="h-9 w-full sm:w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 text-sm outline-none ring-[#145f7a]/40 transition focus:ring-2"
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
              >
                <option value="tous">Toutes les factures</option>
                <option value="payee">Factures Payées</option>
                <option value="non_payee">Factures Non Payées</option>
              </select>
            </div>
          )}
        </div>
      </header>



      {(role === 'technicien' || role === 'manager' || role === 'administrateur' || role === 'admin') && moduleConfig?.key === 'interventions' ? (
        <div className="flex flex-col gap-3 animate-rise delay-1">
          {filteredRows.map(row => (
             <div key={row.id} className={`flex items-center justify-between border transition-all rounded-lg p-3 lg:p-4 ${
                row.statut === 'refuse'
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 shadow-sm shadow-rose-100'
                  : row.statut === 'termine'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 shadow-sm shadow-emerald-100'
                  : row.statut === 'en_cours'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-sm shadow-blue-100'
                  : 'border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/30 hover:shadow-sm'
             }`}>
                <div className="flex items-center gap-4 flex-1 sm:grid sm:grid-cols-[64px_96px_1fr] md:grid-cols-[64px_96px_1fr_1.5fr] lg:grid-cols-[64px_96px_1fr_2fr_96px] xl:grid-cols-[64px_96px_1fr_2fr_96px_96px]">
                  <div className="flex-shrink-0 w-16">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">INT-{row.id}</span>
                  </div>
                  
                  <div className="flex-shrink-0 w-24 hidden sm:block">
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-full
                      ${row.statut === 'en_attente' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                      ${row.statut === 'en_cours' ? 'bg-sky-50 text-sky-700 border-sky-200' : ''}
                      ${row.statut === 'termine' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                      ${row.statut === 'refuse' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                    `}>
                      {displayRoleValue(row.statut).toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col min-w-[150px] lg:min-w-[200px] flex-1">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Demande liée</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">REQ-{displayRoleValue(row.demande)}</span>
                  </div>
                  
                  <div className="flex flex-col flex-1 hidden md:flex min-w-[200px]">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Diagnostic</span>
                    <span className="text-sm truncate text-slate-700 dark:text-slate-300">{row.diagnostic || <span className="text-slate-400 dark:text-slate-300 italic">Non spécifié</span>}</span>
                  </div>
                  
                  <div className="flex flex-col w-24 hidden lg:flex">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Date Début</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{row.date_debut ? new Date(row.date_debut).toLocaleDateString() : '-'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end pl-4 ml-4 border-l border-slate-100 flex-shrink-0 sm:w-[160px]">
                  {row.statut === 'en_attente' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2"
                        onClick={async () => {
                           setLoading(true);
                           try {
                              await service.update(row.id, { statut: 'en_cours' });
                              await loadRows();
                           } catch {
                              setError('Impossible d\'accepter l\'intervention');
                           } finally {
                              setLoading(false);
                           }
                        }}
                      >
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        onClick={async () => {
                             if (confirm('Voulez-vous vraiment marquer cette intervention comme non résolue ?')) {
                               setLoading(true);
                               try {
                                 await service.update(row.id, { statut: 'refuse' });
                                 await loadRows();
                               } catch {
                                 setError('Impossible de marquer comme non résolu');
                               } finally {
                                 setLoading(false);
                               }
                             }
                           }}
                      >
                        Non résolu
                      </Button>
                    </>
                  )}
                  {row.statut === 'en_cours' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2 ${
                        row.statut === 'termine'
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          : 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all opacity-80'
                      }`}
                      onClick={async () => {
                        if (row.statut === 'termine') return
                        if (readyInterventions.has(row.id)) {
                          try {
                            await service.update(row.id, { statut: 'termine' })
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, statut: 'termine' } : r)))
                            loadRows()
                          } catch (err) {
                            console.error('Failed to auto-complete:', err)
                          }
                        }
                      }}
                      disabled={row.statut === 'termine' || !readyInterventions.has(row.id)}
                    >
                      {row.statut === 'termine' ? 'Terminé' : 'Désactiver'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                    {row.statut === 'en_cours' ? 'Traiter' : 'Détails'}
                  </Button>
                </div>
             </div>
          ))}
          {filteredRows.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>Aucune intervention trouvée.</p>
             </div>
          )}
        </div>
      ) : role === 'chefstock' && moduleConfig?.key === 'demande-pieces' ? (
        <div className="flex flex-col gap-3 animate-rise delay-1">
          {filteredRows.map(row => {
             const pieceName = displayRoleValue(row.piece);
             const ficheId = displayRoleValue(row.fiche);
             
             return (
               <div key={row.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/30 hover:shadow-sm transition-all rounded-lg p-3 lg:p-4">
                  <div className="flex items-center gap-4 flex-1 flex-wrap sm:flex-nowrap sm:grid sm:grid-cols-[80px_96px_1fr_80px] md:grid-cols-[80px_96px_1fr_80px_96px] lg:grid-cols-[80px_96px_1fr_80px_96px_96px]">
                    <div className="flex-shrink-0 w-20">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">REQ-P-{row.id}</span>
                    </div>
                    
                    <div className="flex-shrink-0 w-28">
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-full
                        ${row.statut === 'demandee' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                        ${row.statut === 'approuvee' ? 'bg-sky-50 text-sky-700 border-sky-200' : ''}
                        ${row.statut === 'livree' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                      `}>
                        {row.statut?.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col min-w-[120px] flex-1">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Pièce</span>
                      <span className="font-medium text-[#145f7a] text-sm truncate">{pieceName}</span>
                    </div>
                    
                    <div className="flex flex-col min-w-[80px]">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Quantité</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{row.quantite}</span>
                    </div>
                    
                    <div className="flex flex-col min-w-[100px] hidden sm:flex">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Fiche Liée</span>
                      <span className="text-sm truncate text-slate-700 dark:text-slate-300">FCH-{ficheId}</span>
                    </div>
                    
                    <div className="flex flex-col w-24 hidden lg:flex">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Date</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(row.date_demande || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 flex-shrink-0 self-end sm:self-auto w-full sm:w-[180px]">
                    {row.statut === 'demandee' && (
                       <Button 
                         size="sm" 
                         className="bg-sky-600 hover:bg-sky-700 text-white h-8 text-xs flex-1 sm:flex-none"
                         onClick={async () => {
                            setLoading(true);
                            try {
                               await service.update(row.id, { statut: 'approuvee' });
                               await loadRows();
                            } catch {
                               setError('Impossible d\'approuver la demande');
                            } finally {
                               setLoading(false);
                            }
                         }}
                       >
                         Approuver
                       </Button>
                    )}
                    
                    {row.statut === 'approuvee' && (
                       <Button 
                         size="sm" 
                         className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs flex-1 sm:flex-none"
                         onClick={async () => {
                            if (confirm(`Confirmer la livraison de ${row.quantite}x ${pieceName} ? Le stock sera déduit.`)) {
                               setLoading(true);
                               try {
                                  const targetPieceId = typeof row.piece === 'object' ? row.piece.id : row.piece;
                                  const pieceData = await entityServices['pieces'].retrieve(targetPieceId);
                                  
                                  if (Number(pieceData.quantite_stock) < Number(row.quantite)) {
                                     alert(`Stock insuffisant ! Le stock actuel est de ${pieceData.quantite_stock}.`);
                                     setLoading(false);
                                     return;
                                  }
                                  
                                  await entityServices['pieces'].update(targetPieceId, {
                                     quantite_stock: Number(pieceData.quantite_stock) - Number(row.quantite)
                                  });
                                  
                                  await service.update(row.id, { statut: 'livree' });
                                  await loadRows();
                                  await loadLookups();
                               } catch {
                                  setError('Erreur lors de la livraison.');
                               } finally {
                                  setLoading(false);
                               }
                            }
                         }}
                       >
                         Livrer (- Stock)
                       </Button>
                    )}

                    <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-[#145f7a] hover:bg-sky-50 flex-1 sm:flex-none" onClick={() => openEdit(row)}>
                      Détails
                    </Button>
                  </div>
               </div>
             );
          })}
          {filteredRows.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>Aucune demande de pièce trouvée.</p>
             </div>
          )}
        </div>
      ) : moduleConfig?.key === 'demande-maintenances' ? (
        <div className="flex flex-col gap-3 animate-rise delay-1">
          {filteredRows.map(row => (
             <div key={row.id} className={`flex items-center justify-between border transition-all rounded-lg p-3 lg:p-4 ${
                row.statut === 'refuse'
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 shadow-sm shadow-rose-100'
                  : row.statut === 'termine'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 shadow-sm shadow-emerald-100'
                  : row.statut === 'en_cours'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-sm shadow-blue-100'
                  : 'border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/30 hover:shadow-sm'
             }`}>
                <div className="flex items-center gap-4 flex-1 sm:grid sm:grid-cols-[64px_96px_1fr_96px] md:grid-cols-[64px_96px_1fr_128px_96px] lg:grid-cols-[64px_96px_1fr_128px_96px_96px]">
                  <div className="flex-shrink-0 w-16">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">REQ-{row.id}</span>
                  </div>
                  
                  <div className="flex-shrink-0 w-24 hidden sm:block">
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-full
                      ${row.statut === 'en_attente' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                      ${row.statut === 'en_cours' ? 'bg-sky-50 text-sky-700 border-sky-200' : ''}
                      ${row.statut === 'termine' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                      ${row.statut === 'refuse' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                    `}>
                      {displayRoleValue(row.statut).toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col min-w-[150px] lg:min-w-[200px] flex-1">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Matériel</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">{displayRoleValue(row.materiel)}</span>
                  </div>
                  
                  <div className="flex flex-col w-32 hidden md:flex">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Manager</span>
                    <span className="text-sm truncate text-slate-700 dark:text-slate-300">{displayRoleValue(row.manager) || <span className="text-slate-400 dark:text-slate-300 italic">Non assigné</span>}</span>
                  </div>
                  
                  <div className="flex flex-col w-24 hidden lg:flex">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Date</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(row.date_creation || Date.now()).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex-shrink-0 w-24 hidden sm:flex items-center">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      row.priorite === 'haute' ? 'text-rose-600' : 
                      row.priorite === 'moyenne' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        row.priorite === 'haute' ? 'bg-rose-500' : 
                        row.priorite === 'moyenne' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                      {row.priorite === 'basse' ? 'FAIBLE' : row.priorite === 'faible' ? 'FAIBLE' : row.priorite?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end pl-4 ml-4 border-l border-slate-100 flex-shrink-0 sm:w-[220px]">
                  {(role === 'manager' || role === 'administrateur' || role === 'admin') && row.statut === 'en_attente' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2"
                        onClick={() => openEdit({ ...row, statut: 'en_cours' })}
                      >
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        onClick={async () => {
                             if (confirm('Voulez-vous vraiment marquer cette demande comme non résolue ?')) {
                               setLoading(true);
                               try {
                                 await service.update(row.id, { statut: 'refuse' });
                                 await loadRows();
                               } catch {
                                 setError('Impossible de marquer comme non résolu');
                               } finally {
                                 setLoading(false);
                               }
                             }
                           }}
                      >
                        Non résolu
                      </Button>
                    </>
                  )}
                  {(role === 'manager' || role === 'administrateur' || role === 'admin') && row.statut === 'en_cours' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      onClick={async () => {
                        if (confirm('Marquer cette demande comme terminée ?')) {
                          setLoading(true);
                          try {
                            await service.update(row.id, { statut: 'termine' });
                            await loadRows();
                          } catch {
                            setError('Impossible de terminer la demande');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    >
                      Terminer
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex items-center justify-center text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
             </div>
          ))}
          {filteredRows.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>Aucune demande trouvée avec ces filtres.</p>
             </div>
          )}
        </div>
      ) : isMessagesModule ? (
        <Card className="animate-rise delay-1 overflow-hidden">
          <CardContent className="p-0">
            {error ? (
              <p className="m-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="grid h-[calc(100vh-140px)] min-h-[500px] grid-cols-1 md:grid-cols-[310px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 md:border-b-0 md:border-r flex flex-col h-full overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Conversations</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{conversations.length} active threads</p>
                  </div>
                  {permissions.create && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#145f7a]" 
                      title="Nouveau Message"
                      onClick={() => setActiveConversationKey('new')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {activeConversationKey === 'new' && (
                     <div className="w-full border-b border-sky-200 px-4 py-3 text-left transition bg-sky-50/50 shadow-sm border-l-4 border-l-sky-500">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">Nouveau Message</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">Sélectionnez un destinataire</p>
                     </div>
                  )}
                  {conversations.map((conversation) => {
                    const party = conversation.party
                    const isActive = conversation.key === activeConversationKey
                    const preview = String(conversation.lastMessage?.contenu ?? '').trim()

                    return (
                      <button
                        key={conversation.key}
                        type="button"
                        className={`w-full border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-left transition ${
                          isActive ? 'bg-slate-50 dark:bg-slate-900 shadow-sm border-l-4 border-l-[#145f7a]' : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-white/80 dark:bg-slate-900/80 border-l-4 border-l-transparent'
                        }`}
                        onClick={() => setActiveConversationKey(conversation.key)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {party.displayName || party.name || 'Unknown user'}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatMessageTime(conversation.lastMessage?.date_envoi)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {preview || 'No content'}
                        </p>
                      </button>
                    )
                  })}

                  {!loading && conversations.length === 0 && activeConversationKey !== 'new' ? (
                    <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No conversations found.</p>
                  ) : null}
                </div>
              </aside>

              <section className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-white to-[#eef4f7]">
                <div className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-4 py-3 backdrop-blur shrink-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {activeConversation?.party?.displayName || 'New message'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeConversation?.party?.role || 'Select a conversation or choose a recipient'}
                  </p>
                </div>

                <div ref={messagesListRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {activeConversation?.messages?.map((message) => {
                    const mine = isMessageFromCurrentUser(message, currentUserId, currentUsername)

                    return (
                      <div
                        key={message.id ?? `${message.expediteur}-${message.destinataire}-${message.date_envoi}`}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[70%] ${
                            mine
                              ? 'rounded-br-md bg-[#145f7a] text-white'
                              : 'rounded-bl-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {message.objet ? (
                            <p className={`text-xs ${mine ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>
                              {message.objet}
                            </p>
                          ) : null}
                          <p className="mt-0.5 whitespace-pre-wrap">{message.contenu || 'No content'}</p>
                          <p className={`mt-1 text-[11px] ${mine ? 'text-cyan-100/80' : 'text-slate-400 dark:text-slate-300'}`}>
                            {formatMessageTime(message.date_envoi)}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {!loading && !activeConversation ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pick a conversation to display messages.</p>
                  ) : null}

                  {!loading && activeConversation && activeConversation.messages.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No messages in this conversation yet.</p>
                  ) : null}
                </div>

                {permissions.create ? (
                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-4 py-3 shrink-0">
                    {!activeConversation?.party?.id ? (
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                        value={manualRecipientId}
                        onChange={(event) => setManualRecipientId(event.target.value)}
                      >
                        <option value="">Select recipient...</option>
                        {availableRecipients.map((recipient) => (
                          <option key={`recipient-${recipient.id}`} value={recipient.id}>
                            {displayRoleValue(recipient.username)} ({displayRoleValue(recipient.role)})
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <textarea
                        className="min-h-20 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                        placeholder="Type your message..."
                        value={composerContent}
                        onChange={(event) => setComposerContent(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            if (!saving) sendComposerMessage()
                          }
                        }}
                      />
                      <Button onClick={sendComposerMessage} disabled={saving}>
                        {saving ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-rise delay-1 border-0 shadow-none bg-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{moduleConfig.label} Records</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredRows.length} / {rows.length} shown
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {moduleConfig?.key === 'pieces' ? (
              groupedPieceRows.map((group) => (
                <div key={group.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 shadow-sm lg:p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-[#145f7a] bg-slate-50 dark:bg-slate-900 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">Catégorie</p>
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
                      <li key={row.id ?? `${moduleConfig.key}-${group.key}-${rowIndex}`} className="border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:flex sm:items-center sm:justify-between">
                        <div className="table-row-grid flex-1 w-full" style={{ '--row-grid-cols': `64px repeat(${moduleConfig.columns.length - 1}, minmax(0, 1fr))` }}>
                          {moduleConfig.columns.map((column, colIndex) => (
                            <div key={`${column}-${group.key}-${rowIndex}`} className="flex flex-col min-w-0">
                              <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-300">{column === 'est_payee' ? 'paiement' : column.replace(/_/g, ' ')}</span>

                              {colIndex === 0 ? (
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">#{getResolvedColumnValue(column, row[column])}</span>
                              ) : column === 'est_payee' ? (
                                 <Badge variant="outline" className={`h-5 w-fit px-2 py-0 text-[10px] ${row[column] === true || row[column] === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                   {row[column] === true || row[column] === 'true' ? 'PAYÉE' : 'NON PAYÉE'}
                                 </Badge>
                              ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                                <Badge variant="outline" className={`h-5 w-fit px-2 py-0 text-[10px] ${row[column] === true || row[column] === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                  {row[column] === true || row[column] === 'true' ? 'OUI' : 'NON'}
                                </Badge>
                              ) : (
                                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{getResolvedColumnValue(column, row[column]) || '-'}</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {(permissions.update || permissions.delete) && (
                          <div className="mt-3 flex shrink-0 items-center justify-end gap-2 sm:mt-0 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 self-end sm:self-auto sm:w-[200px]">
                            {permissions.update ? (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                              </Button>
                            ) : null}

                            {permissions.delete ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                                onClick={() => deleteRow(row.id)}
                                disabled={deletingId === row.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Supprimer
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              filteredRows.map((row, rowIndex) => (
                 <div key={row.id ?? `${moduleConfig.key}-${rowIndex}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/30 hover:shadow-sm transition-all rounded-lg p-3 lg:p-4">
                    <div className="table-row-grid flex-1 w-full" style={{ '--row-grid-cols': `64px repeat(${moduleConfig.columns.length - 1}, minmax(0, 1fr))` }}>
                      {moduleConfig.columns.map((column, colIndex) => (
                        <div key={`${column}-${rowIndex}`} className="flex flex-col min-w-0">
                          <span className="text-slate-400 dark:text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-0.5">{column === 'est_payee' ? 'paiement' : column.replace(/_/g, ' ')}</span>

                          {colIndex === 0 ? (
                             <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">#{getResolvedColumnValue(column, row[column])}</span>
                          ) : column === 'est_payee' ? (
                             <Badge variant="outline" className={`w-fit text-[10px] px-2 py-0 h-5 ${row[column] === true || row[column] === 'true' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                               {row[column] === true || row[column] === 'true' ? 'PAYÉE' : 'NON PAYÉE'}
                             </Badge>
                          ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                             <Badge variant="outline" className={`w-fit text-[10px] px-2 py-0 h-5 ${row[column] === true || row[column] === 'true' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                               {row[column] === true || row[column] === 'true' ? 'OUI' : 'NON'}
                             </Badge>
                          ) : (
                             <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">{getResolvedColumnValue(column, row[column]) || '-'}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {(permissions.update || permissions.delete) && (
                      <div className="flex items-center justify-end gap-2 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 shrink-0 self-end sm:self-auto mt-2 sm:mt-0 sm:w-[200px]">
                        {permissions.update ? (
                          <Button size="sm" variant="ghost" className="h-8 text-[#145f7a] hover:bg-sky-50 px-2" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                          </Button>
                        ) : null}

                        {permissions.delete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-600 hover:bg-rose-50 px-2"
                            onClick={() => deleteRow(row.id)}
                            disabled={deletingId === row.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Supprimer
                          </Button>
                        ) : null}
                      </div>
                    )}
                 </div>
              ))
            )}

            {!loading && filteredRows.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                 <p className="text-sm">Aucun enregistrement trouvé.</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {drawerMode && !isMessagesModule ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/40 bg-[#f4f7f9] shadow-2xl flex flex-col max-h-full">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/40 bg-white/70 dark:bg-slate-900/70 px-5 py-4 backdrop-blur-md">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  {drawerMode === 'create' ? 'Créer' : 'Modifier'} {moduleConfig.label}
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mise à jour professionnelle du registre.</p>
              </div>

              <Button variant="ghost" size="icon" onClick={closeDrawer} className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 hover:text-rose-600">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {role === 'technicien' && moduleConfig?.key === 'interventions' && drawerMode === 'edit' && (
                 <div className="rounded-xl border border-[#145f7a]/15 bg-white/80 dark:bg-slate-900/80 p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                       <span className="text-base flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#145f7a]"></div> Contexte d'Intervention</span>
                       <Badge variant="outline" className="border-[#145f7a]/20 bg-[#145f7a]/5 text-xs text-[#145f7a]">Lecture Seule</Badge>
                    </h3>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                       <div className="rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm text-slate-700 dark:text-slate-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                          <p className="flex justify-between"><span className="font-medium text-slate-900 dark:text-slate-100">Demande:</span> <span>REQ-{displayRoleValue(formData.demande)}</span></p>
                       </div>
                       {currentFiche && (
                           <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-sm text-slate-700 dark:text-slate-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                              <p className="flex justify-between"><span className="font-medium text-slate-900 dark:text-slate-100">Fiche Liée:</span> <span>FCH-{currentFiche.id}</span></p>
                           </div>
                       )}
                    </div>
                    
                    {currentFiche ? (
                       <div className="mt-4 space-y-4">
                          <div className="rounded-lg border border-slate-100 bg-slate-50 dark:bg-slate-900 p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 shadow-sm">
                             <span className="mb-1.5 block font-semibold text-slate-800 dark:text-slate-200">Description Initiale (Panne Signalée) :</span> 
                             {currentFiche.description_panne || <span className="italic text-slate-400 dark:text-slate-300">Aucune description fournie.</span>}
                          </div>
                          
                          <div className="rounded-lg border border-cyan-100 bg-cyan-50/30 p-4">
                             <div className="mb-3 flex items-center justify-between">
                                 <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Gestion des Pièces</span>
                                 <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-none">{requestedPieces.length} Demandées</Badge>
                             </div>
                             
                             <div className="space-y-3">
                                {groupedRequestedPieces.length > 0 && (
                                  <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-2">
                                   {groupedRequestedPieces.map((group) => (
                                     <div key={group.key} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm">
                                       <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                                         <div>
                                           <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{group.label}</p>
                                           <p className="text-[11px] text-slate-500 dark:text-slate-400">{group.totalRequested} pièce(s) demandée(s)</p>
                                         </div>
                                         <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700 text-[10px]">
                                          {group.items.length} demande{group.items.length > 1 ? 's' : ''}
                                         </Badge>
                                       </div>
                                       <div className="space-y-2 p-3">
                                         {group.items.map((pieceRec) => (
                                           <div key={pieceRec.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-xs shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)]">
                                             <span className="font-medium text-slate-700 dark:text-slate-300">{pieceRec.quantite}x {pieceRec.pieceData?.nom || group.label}</span>
                                             <div className="flex items-center gap-2">
                                               {pieceRec.statut === 'demandee' && (
                                                 <Button 
                                                   variant="ghost" 
                                                   size="sm" 
                                                   className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                   onClick={() => cancelPieceRequest(pieceRec.id)}
                                                   title="Annuler la demande"
                                                 >
                                                   <X className="h-3.5 w-3.5" />
                                                  </Button>
                                               )}
                                             <Badge variant="outline" className={`text-[10px] ${pieceRec.statut === 'livree' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : pieceRec.statut === 'approuvee' ? 'border-sky-200 bg-sky-50 text-sky-600' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>
                                              {pieceRec.statut}
                                             </Badge>
                                           </div>
                                          </div>
                                         ))}
                                       </div>
                                     </div>
                                   ))}
                                  </div>
                                )}
                                
                                {formData.statut === 'en_cours' && (
                                   <div className="flex items-end gap-2 bg-white/60 dark:bg-slate-900/60 p-3 rounded-md border border-cyan-200/50">
                                      <div className="flex-1">
                                         <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Nouvelle Pièce</label>
                                         <select 
                                           className="w-full text-xs h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 focus:ring-2 focus:ring-[#145f7a]/30 outline-none"
                                           value={selectedPieceId} 
                                           onChange={(e) => setSelectedPieceId(e.target.value)}
                                         >
                                           <option value="">Sélectionner...</option>
                                       {groupedAvailablePieces.map((group) => (
                                         <optgroup key={group.key} label={`${group.label} (Stock: ${group.totalStock})`}>
                                           {group.items.map((piece) => (
                                             <option key={piece.id} value={piece.id}>{piece.nom} (Stock: {piece.quantite_stock})</option>
                                           ))}
                                         </optgroup>
                                       ))}
                                         </select>
                                      </div>
                                      <div className="w-16 flex-none">
                                         <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Qté</label>
                                         <input 
                                           title="Quantite"
                                           type="number" min="1" 
                                           className="w-full text-xs h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 focus:ring-2 focus:ring-[#145f7a]/30 outline-none text-center"
                                           value={selectedPieceQty} 
                                           onChange={(e) => setSelectedPieceQty(e.target.value)} 
                                         />
                                      </div>
                                      <Button 
                                         size="sm" 
                                         className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 shadow-sm"
                                         disabled={!selectedPieceId || requestingPiece}
                                         onClick={submitPieceRequest}
                                      >
                                        Demander
                                      </Button>
                                   </div>
                                )}
                             </div>
                          </div>
                          
                       </div>
                    ) : (
                       <div className="mt-3 flex items-center justify-center rounded border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-4 text-xs italic text-slate-400 dark:text-slate-300">
                          Récupération des détails de la fiche...
                       </div>
                    )}
                 </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {editableFields
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
                            required={field.required && drawerMode === 'create' && !isReadOnly}
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
                            required={field.required && drawerMode === 'create' && !isReadOnly}
                            disabled={isReadOnly}
                          >
                            <option value="">Select...</option>
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
                            <option value="">Select...</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </label>
                      )
                    }

                    if (field.type === 'lookup' && field.lookup) {
                      let options = lookupData[field.lookup.serviceKey] ?? []

                      if (typeof field.lookup.filter === 'function') {
                        options = options.filter((opt) => field.lookup.filter(opt, { currentUserId, auth, users: lookupData.users ?? [] }))
                      }
                      const selectedOption = options.find((o) => String(o[field.lookup.valueKey]) === String(value))

                      return (
                        <div key={field.key} className="block space-y-1.5">
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                            <select
                              id={inputId}
                              className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                              value={value}
                              onChange={(event) => handleFieldChange(field.key, event.target.value)}
                              required={field.required && drawerMode === 'create' && !isReadOnly}
                              disabled={isReadOnly}
                            >
                              <option value="">Select...</option>
                              {options.map((option) => {
                                const valueKey = field.lookup.valueKey
                                const labelKey = field.lookup.labelKey
                                const optionValue = option[valueKey]
                                const optionLabel = displayRoleValue(option[labelKey])

                                return (
                                  <option key={`${field.key}-${optionValue}`} value={optionValue}>
                                    {optionLabel}
                                  </option>
                                )
                              })}
                            </select>
                          </label>
                          {selectedOption && field.lookup.serviceKey === 'materiels' && (
                             <div className="mt-2 p-3 bg-white/60 dark:bg-slate-900/60 border border-[#145f7a]/20 rounded-md text-xs space-y-1 text-slate-700 dark:text-slate-300">
                               <p><span className="font-semibold">Type:</span> {selectedOption.type}</p>
                               <p><span className="font-semibold">Marque:</span> {selectedOption.marque}</p>
                               <p><span className="font-semibold">Modele:</span> {selectedOption.modele}</p>
                               <p><span className="font-semibold">Etat:</span> {selectedOption.etat}</p>
                             </div>
                          )}
                        </div>
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
                          required={field.required && drawerMode === 'create' && !isReadOnly}
                          disabled={isReadOnly}
                        />
                      </label>
                    )
                  })}
                  {role === 'manager' && moduleConfig?.key === 'demande-maintenances' && formData.statut === 'en_cours' && drawerMode === 'edit' && (() => {
                     const originalRow = rows.find(r => r.id === editingId);
                     if (originalRow?.statut !== 'en_attente') return null;
                     
                     const users = lookupData.users || [];
                     const techniciens = users.filter(u => {
                         const managerDeptId = (users.find(m => Number(m.id) === currentUserId) || {}).department?.id;
                         return u.role === 'technicien' && (!managerDeptId || u.department?.id === managerDeptId);
                     });
                     
                     return (
                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700/60 pt-4 space-y-4">
                           <div className="rounded-md bg-sky-50/50 p-4 border border-sky-100 space-y-4">
                             <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Action Requise: Intervention & Fiche de Réparation</h3>
                             <p className="text-xs text-slate-600 dark:text-slate-400">L'acceptation va générer une intervention et une fiche de réparation associées.</p>
                             
                             <label className="block space-y-1.5">
                               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigner Technicien <span className="text-rose-500">*</span></span>
                               <select
                                 className="h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                                 value={formData.technicien || ''}
                                 onChange={(event) => handleFieldChange('technicien', event.target.value)}
                                 required
                               >
                                  <option value="">Sélectionnez un technicien de votre département...</option>
                                  {techniciens.map(t => (
                                     <option key={t.id} value={t.id}>{displayRoleValue(t.username)}</option>
                                  ))}
                               </select>
                             </label>
                             
                             <label className="block space-y-1.5">
                               <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Description de la Panne <span className="text-rose-500">*</span></span>
                               <textarea
                                 className="min-h-24 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none ring-[#145f7a]/40 focus:ring-2"
                                 placeholder="Détails initiaux pour le technicien..."
                                 value={formData.description_panne || ''}
                                 onChange={(event) => handleFieldChange('description_panne', event.target.value)}
                                 required
                               />
                             </label>
                           </div>
                        </div>
                     )
                   })()}
              </div>

              {saveError ? (
                <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {saveError}
                </p>
              ) : null}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-6 py-4 rounded-b-2xl flex items-center gap-3 justify-end sticky bottom-0">
              <Button size="sm" variant="outline" className="h-9 px-4" onClick={closeDrawer}>
                Annuler
              </Button>
              <Button size="sm" className="h-9 px-6 bg-[#145f7a] hover:bg-[#0c4358] shadow-sm" onClick={saveForm} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default RoleModulePage
