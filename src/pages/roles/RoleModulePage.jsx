import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Pencil, Plus, Printer, RefreshCw, Trash2, X, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { AppModal } from '../../components/ui/AppModal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { DataFiltersBar } from '../../components/ui/DataFiltersBar'
import { DataPagination } from '../../components/ui/DataPagination'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useViewMode, viewContainerClass } from '../../hooks/useViewMode'
import { DEFAULT_PAGE_SIZE } from '../../services/entities/crudService'
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
import { roleDashboardPath } from '../../lib/roleWorkspaces'
import { entityServices } from '../../services/entities'
import demandePiecesService from '../../services/entities/demandePieces.service'
import { coercePayloadValue, toInputValue } from '../admin/helpers'
import { displayRoleValue } from './helpers'
import { getDemandePieceStatusStyle, formatStatusLabel } from '../../lib/statusUtils'
import { useOperationFeedback } from '../../context/OperationFeedbackContext'
import { tModule, tColumn } from '../../lib/i18nLabels'
import { stripWorkflowFields } from '../../lib/workflowFields'
import MessengerApp from '../../components/messaging/MessengerApp'

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
  const { runWithFeedback } = useOperationFeedback()
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

  const canDeleteRow = useMemo(() => {
    if (!permissions.delete) {
      return false
    }
    const blockedByRole = {
      manager: ['demande-maintenances', 'interventions', 'fiche-reparations', 'factures', 'messages'],
    }
    const blocked = blockedByRole[role] ?? []
    return !blocked.includes(moduleConfig?.key)
  }, [permissions.delete, role, moduleConfig?.key])

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

    if (moduleConfig?.requiredFields?.length) {
      const requiredSet = new Set(moduleConfig.requiredFields)
      fields = fields.map((field) => {
        if (requiredSet.has(field.key)) {
          return { ...field, required: true }
        }
        return field
      })
    }

    return fields
  }, [moduleEntity, moduleConfig])

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [readyInterventions, setReadyInterventions] = useState(new Set())
  const [lookupData, setLookupData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const debouncedSearch = useDebouncedValue(searchText)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [viewMode, setViewMode] = useViewMode(`role-module-${moduleKey ?? 'default'}`)
  const [drawerMode, setDrawerMode] = useState('')
  const [formData, setFormData] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, row: null })
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
  const [acceptIntent, setAcceptIntent] = useState(false)

  const hasWritableFields = useMemo(
    () => editableFields.some((field) => !field.readOnly),
    [editableFields],
  )

  const editingRow = useMemo(
    () => (editingId ? rows.find((row) => row.id === editingId) : null),
    [editingId, rows],
  )

  const printFacture = useCallback((row) => {
    const clientName = typeof row.client === 'object'
      ? (row.client.nom_complet || row.client.email || `Client #${row.client.id}`)
      : (lookupData.clients
          ? (lookupData.clients.find(c => String(c.id) === String(row.client))?.nom_complet || `Client #${row.client}`)
          : `Client #${row.client}`)

    const interventionRef = typeof row.intervention === 'object'
      ? (row.intervention.id || row.intervention)
      : row.intervention

    const fmt = (value) => Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })
    const montantPieces = Number(row.montant_pieces) || 0
    const montantMainOeuvre = Number(row.montant_main_oeuvre) || 0
    const montantFraisSociete = Number(row.montant_frais_societe) || 0
    const montantSupplementaire = Number(row.montant_supplementaire) || 0
    const montant = Number(row.montant_total) || 0
    const hasBreakdown = montantPieces > 0 || montantMainOeuvre > 0 || montantFraisSociete > 0 || montantSupplementaire > 0

    const detailRows = hasBreakdown
      ? [
          montantPieces > 0 && `<tr><td>Pièces / Matériel</td><td>Fournitures</td><td>${fmt(montantPieces)} TND</td></tr>`,
          montantMainOeuvre > 0 && `<tr><td>Main d'oeuvre</td><td>Travail technique</td><td>${fmt(montantMainOeuvre)} TND</td></tr>`,
          montantFraisSociete > 0 && `<tr><td>Frais de la société</td><td>Frais de service</td><td>${fmt(montantFraisSociete)} TND</td></tr>`,
          montantSupplementaire > 0 && `<tr><td>Prix supplémentaire</td><td>Charges additionnelles</td><td>${fmt(montantSupplementaire)} TND</td></tr>`,
        ].filter(Boolean).join('')
      : `<tr><td>Service de maintenance</td><td>Intervention #${interventionRef || '-'}</td><td>${fmt(montant)} TND</td></tr>`

    const dateFacture = row.date_facture
      ? new Date(row.date_facture).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    const estPayee = row.est_payee === true || row.est_payee === 'true'
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
        <h2>FACTURE</h2>
        <p>N° ${String(row.id).padStart(5, '0')}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <h3>Informations Client</h3>
        <p><strong>${clientName}</strong></p>
      </div>
      <div class="meta-card">
        <h3>Détails Facture</h3>
        <p><strong>Date :</strong> ${dateFacture}</p>
        <p><strong>Intervention :</strong> INT-${interventionRef || '-'}</p>
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
      <tbody>${detailRows}</tbody>
    </table>

    <div class="total-section">
      <div class="total-box">
        <div class="label">Montant Total</div>
        <div class="amount">${fmt(montant)} <span class="currency">TND</span></div>
      </div>
    </div>

    <div class="status-section ${estPayee ? 'status-paid' : 'status-unpaid'}">
      <span>${estPayee ? '✓ FACTURE PAYÉE' : '✗ FACTURE NON PAYÉE'}</span>
    </div>

    <div class="footer">
      <p class="thank-you">Merci pour votre confiance</p>
      <p>Ce document est généré automatiquement par le système Gestion MT.<br/>Pour toute question, veuillez contacter le service de réception.</p>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
    `)
    printWindow.document.close()
  }, [lookupData.clients])

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
        if (field.lookup.serviceKey === 'pieces') {
          return `${match.id} - ${displayRoleValue(match[field.lookup.labelKey] ?? match)}`
        }
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
    if (!moduleEntity?.fields) {
      setLookupData({})
      return
    }

    const lookupFields = moduleEntity.fields.filter((field) => field.type === 'lookup' && field.lookup)
    const uniqueServiceKeys = [...new Set(lookupFields.map((field) => field.lookup.serviceKey))]

    if (role === 'manager' && moduleConfig?.key === 'factures') {
      uniqueServiceKeys.push('fiche-reparations', 'demande-maintenances', 'materiels')
    }

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
        const items = await lookupService.listAll()
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
  }, [moduleEntity, moduleConfig?.key, role])

  const loadRows = useCallback(async () => {
    if (!service) {
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isMessagesModule) {
        setLoading(false)
        return
      }

      const params = { page, page_size: pageSize }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim()
      }
      if (moduleConfig?.key === 'demande-maintenances') {
        if (filterStatut !== 'tous') params.statut = filterStatut
        if (filterPriorite !== 'tous') params.priorite = filterPriorite
      }
      if (role === 'receptioniste' && moduleConfig?.key === 'factures' && filterStatut !== 'tous') {
        params.statut = filterStatut
      }

      let result
      if (moduleConfig?.useMineEndpoint && typeof service.listMine === 'function') {
        try {
          result = await service.listMine(params)
        } catch {
          result = await service.list(params)
        }
      } else {
        result = await service.list(params)
      }

      setRows(result.items)
      setTotalCount(result.count)
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Failed to load module data.')))
    } finally {
      setLoading(false)
    }
  }, [
    debouncedSearch,
    filterPriorite,
    filterStatut,
    isMessagesModule,
    moduleConfig,
    page,
    pageSize,
    role,
    service,
    t,
  ])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterStatut, filterPriorite, moduleKey])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadRows()
      void loadLookups()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [loadLookups, loadRows])

  const filteredRows = useMemo(() => {
    if (!isMessagesModule) {
      return rows
    }

    if (!searchText.trim()) {
      return rows
    }

    const keyword = searchText.toLowerCase()
    return rows.filter((row) =>
      Object.values(row).some((value) => displayRoleValue(value).toLowerCase().includes(keyword)),
    )
  }, [rows, searchText, isMessagesModule])

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
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (!isMessagesModule) {
      setWsState('idle')
    }
  }, [auth?.access, isMessagesModule])

  const openCreate = () => {
    if (!permissions.create || !editableFields.length) {
      return
    }

    const baseForm = buildEmptyForm(editableFields)

    setAcceptIntent(false)
    setDrawerMode('create')
    setEditingId(null)
    setSaveError('')
    setFormData(baseForm)
  }

  const loadFichePieces = async (ficheId) => {
    try {
      const p = await entityServices['pieces'].listAll();
      setAvailablePieces(p);
      const r = await entityServices['demande-pieces'].listAll();
      setRequestedPieces(r.filter(req => Number(req.fiche) === ficheId || Number(req.fiche?.id) === ficheId));
    } catch (e) {
      console.error(e);
    }
  }

  const openAcceptDemande = async (row) => {
    if (!permissions.update) {
      return
    }

    setAcceptIntent(true)
    setDrawerMode('edit')
    setEditingId(row.id)
    setSaveError('')
    setFormData(buildEditForm(editableFields, row))
  }

  const openEdit = async (row) => {
    if (!permissions.update || !hasWritableFields) {
      return
    }

    setAcceptIntent(false)
    setDrawerMode('edit')
    setEditingId(row.id)
    setSaveError('')
    setFormData(buildEditForm(editableFields, row))
    
    if (role === 'technicien' && moduleConfig?.key === 'interventions') {
      try {
        const fiches = await entityServices['fiche-reparations'].listAll();
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
    setAcceptIntent(false)
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
    if (!confirm(t('module.cancelPieceConfirm'))) return;
    try {
      await entityServices['demande-pieces'].remove(requestId);
      if (currentFiche) {
        await loadFichePieces(currentFiche.id);
      }
    } catch (e) {
      console.error(t('Failed to cancel piece request'), e)
    }
  }

  const syncFactureAmountFromIntervention = useCallback(
    async (interventionId) => {
      if (!interventionId) {
        return
      }

      let fiches = lookupData['fiche-reparations'] ?? []
      if (!fiches.length && entityServices['fiche-reparations']) {
        try {
          fiches = await entityServices['fiche-reparations'].listAll()
        } catch {
          fiches = []
        }
      }

      const fiche = fiches.find(
        (item) =>
          Number(item.intervention) === Number(interventionId) ||
          Number(item.intervention?.id) === Number(interventionId),
      )

      if (!fiche) {
        return
      }

      const total =
        Number(fiche.cout_pieces || 0) +
        Number(fiche.cout_main_oeuvre || 0) +
        Number(fiche.frais_societe || 0) +
        Number(fiche.prix_supplementaire || 0)

      const interventions = lookupData.interventions ?? []
      const intervention = interventions.find((item) => Number(item.id) === Number(interventionId))
      let clientId = null

      if (intervention?.demande) {
        const demandeId =
          typeof intervention.demande === 'object' ? intervention.demande.id : intervention.demande
        const demandes = lookupData['demande-maintenances'] ?? []
        const demande = demandes.find((item) => Number(item.id) === Number(demandeId))
        const materielRef = demande?.materiel
        const materielId =
          typeof materielRef === 'object' ? materielRef?.id : materielRef
        const materiels = lookupData.materiels ?? []
        const materiel = materiels.find((item) => Number(item.id) === Number(materielId))
        const clientRef = materiel?.client
        clientId = typeof clientRef === 'object' ? clientRef?.id : clientRef
      }

      setFormData((previous) => ({
        ...previous,
        montant_total: total,
        ...(clientId ? { client: clientId } : {}),
      }))
    },
    [lookupData],
  )

  const handleFieldChange = (fieldKey, value) => {
    setFormData((previous) => {
      const nextData = { ...previous, [fieldKey]: value }

      if (role === 'manager' && moduleConfig?.key === 'fiche-reparations' && fieldKey === 'confirmation') {
        nextData.valide_manager = value
      }

      return nextData
    })

    if (
      role === 'manager' &&
      moduleConfig?.key === 'factures' &&
      fieldKey === 'intervention' &&
      value
    ) {
      void syncFactureAmountFromIntervention(value)
    }
  }

  const buildPayload = () => {
    const payload = {}

    for (const field of editableFields) {
      if (field.key === 'is_deleted') {
        continue
      }

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

    const cleaned = stripWorkflowFields(payload)

    if (
      acceptIntent &&
      moduleConfig?.key === 'demande-maintenances' &&
      drawerMode === 'edit'
    ) {
      cleaned.statut = 'en_cours'
    }

    return cleaned
  }

  const sendFactureToClient = async (row) => {
    if (!row?.id) {
      return
    }

    const confirmMessage = row.facture_email_envoye
      ? t('module.resendInvoiceConfirm')
      : t('module.sendInvoiceConfirm')

    if (!confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await runWithFeedback(
        async () => {
          await entityServices['demande-maintenances'].envoyerFactureClient(row.id)
          await loadRows()
        },
        {
          action: 'update',
          entity: t('module.clientInvoice'),
        },
      )
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('module.sendInvoiceError')))
    } finally {
      setLoading(false)
    }
  }

  const markFacturePaid = async (row) => {
    if (!service || !row?.id) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await runWithFeedback(
        async () => {
          await service.update(row.id, { est_payee: true })
          await loadRows()
        },
        {
          action: 'update',
          entity: tModule(moduleConfig.key),
        },
      )
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('Unable to save changes.')))
    } finally {
      setLoading(false)
    }
  }

  const saveForm = async () => {
    if (!drawerMode || !service) {
      return
    }

    const payload = buildPayload()
    const moduleLabel = tModule(moduleConfig.key)

    if (drawerMode !== 'create' && acceptIntent && moduleConfig?.key === 'demande-maintenances') {
      const originalRow = rows.find((r) => r.id === editingId)
      if (
        originalRow?.statut === 'en_attente' &&
        (!formData.technicien || !formData.description_panne)
      ) {
        setSaveError(t('Technicien and Description Panne are required to accept the request.'))
        return
      }
    }

    if (role === 'technicien' && moduleConfig?.key === 'interventions') {
      const diagnostic = String(formData.diagnostic ?? '').trim()
      const solution = String(formData.solution_proposee ?? '').trim()
      if (!diagnostic || !solution) {
        setSaveError(t('module.diagnosticSolutionRequired'))
        return
      }
    }

    setSaving(true)
    setSaveError('')

    try {
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
        closeDrawer()
        return
      }

      let savedRecord = null

      await runWithFeedback(
        async () => {
          if (drawerMode === 'create') {
            savedRecord = await service.create(payload)
          } else {
            const originalRow = rows.find((r) => r.id === editingId)

            if (
              acceptIntent &&
              moduleConfig?.key === 'demande-maintenances' &&
              originalRow?.statut === 'en_attente'
            ) {
              await service.update(editingId, payload)

              try {
                const createdIntervention = await entityServices['interventions'].create({
                  demande: editingId,
                  technicien: Number(formData.technicien),
                  diagnostic: 'À remplir par le technicien...',
                  solution_proposee: 'À remplir par le technicien...',
                  statut: 'en_attente',
                  date_debut: new Date().toISOString().split('T')[0],
                })

                if (createdIntervention?.id) {
                  await entityServices['fiche-reparations'].create({
                    intervention: createdIntervention.id,
                    description_panne: formData.description_panne,
                    solution: '',
                    cout_main_oeuvre: 0,
                    confirmation: false,
                    valide_manager: false,
                  })
                }
              } catch (e) {
                console.error(t('Failed to spawn intervention and fiche'), e)
              }
            } else {
              await service.update(editingId, payload)

              if (role === 'technicien' && moduleConfig?.key === 'interventions') {
                setReadyInterventions((prev) => {
                  const next = new Set(prev)
                  next.add(editingId)
                  return next
                })
              }
            }
          }

          await loadRows()

          if (savedRecord?.id) {
            setRows((prev) => {
              const without = prev.filter((row) => row.id !== savedRecord.id)
              return drawerMode === 'create'
                ? [savedRecord, ...without]
                : without.map((row) => (row.id === savedRecord.id ? { ...row, ...savedRecord } : row))
            })
          }
        },
        {
          action: drawerMode === 'create' ? 'create' : 'update',
          entity: moduleLabel,
        },
      )

      setSearchText('')
      setFilterStatut('tous')
      setFilterPriorite('tous')
      closeDrawer()
    } catch (requestError) {
      setSaveError(extractApiErrorMessage(requestError, t('Unable to save changes.')))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    const rowId = deleteModalState.row?.id
    if (!canDeleteRow || !service || !rowId) {
      return
    }

    setDeletingId(rowId)

    try {
      await runWithFeedback(
        async () => {
          await service.remove(rowId)
          await loadRows()
        },
        { action: 'delete', entity: tModule(moduleConfig.key) },
      )
      setDeleteModalState({ isOpen: false, row: null })
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
                {tModule(moduleConfig.key)}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                {moduleConfig.description || t('Operational view for {{module}}.', { module: tModule(moduleConfig.key) })}
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
                {t('crud.newRecord')}
              </Button>
            ) : null}
          </div>
        </div>

      </header>

      {!isMessagesModule ? (
        <DataFiltersBar
          className="animate-rise"
          searchValue={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder={t('crud.search', { entity: tModule(moduleConfig.key) })}
          shown={filteredRows.length}
          total={totalCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasActiveFilters={
            searchText.trim().length > 0 ||
            (moduleConfig?.key === 'demande-maintenances' && (filterStatut !== 'tous' || filterPriorite !== 'tous')) ||
            (moduleConfig?.key === 'factures' && filterStatut !== 'tous')
          }
          onClearFilters={() => {
            setSearchText('')
            setFilterStatut('tous')
            setFilterPriorite('tous')
          }}
          filters={
            moduleConfig?.key === 'demande-maintenances'
              ? [
                  {
                    id: 'statut',
                    label: t('columns.statut'),
                    value: filterStatut,
                    onChange: setFilterStatut,
                    options: [
                      { value: 'tous', label: t('module.allStatuses') },
                      { value: 'en_attente', label: t('status.en_attente') },
                      { value: 'en_cours', label: t('status.en_cours') },
                      { value: 'termine', label: t('status.termine') },
                      { value: 'refuse', label: t('module.notResolved') },
                    ],
                  },
                  {
                    id: 'priorite',
                    label: t('columns.priorite'),
                    value: filterPriorite,
                    onChange: setFilterPriorite,
                    options: [
                      { value: 'tous', label: t('common.allPriorities') },
                      { value: 'haute', label: t('priorite.haute') },
                      { value: 'moyenne', label: t('priorite.moyenne') },
                      { value: 'faible', label: t('priorite.faible') },
                    ],
                  },
                ]
              : moduleConfig?.key === 'factures'
                ? [
                    {
                      id: 'statut',
                      label: t('columns.statut'),
                      value: filterStatut,
                      onChange: setFilterStatut,
                      options: [
                        { value: 'tous', label: t('module.allInvoices') },
                        { value: 'payee', label: t('common.paidInvoices') },
                        { value: 'non_payee', label: t('common.unpaidInvoices') },
                      ],
                    },
                  ]
                : []
          }
        />
      ) : null}



      {(role === 'technicien' || role === 'manager' || role === 'administrateur' || role === 'admin') && moduleConfig?.key === 'interventions' ? (
        <div className={`animate-rise delay-1 ${viewContainerClass(viewMode, 'flex flex-col gap-3')}`}>
          {filteredRows.map(row => (
             <div key={row.id} className={`${viewMode === 'cards' ? 'flex flex-col gap-3' : 'flex items-center justify-between'} border transition-all rounded-lg p-3 lg:p-4 ${
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
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('common.linkedRequest')}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">REQ-{displayRoleValue(row.demande)}</span>
                  </div>
                  
                  <div className="flex flex-col flex-1 hidden md:flex min-w-[200px]">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('columns.diagnostic')}</span>
                    <span className="text-sm truncate text-slate-700 dark:text-slate-300">{row.diagnostic || <span className="text-slate-400 dark:text-slate-300 italic">{t('common.notSpecified')}</span>}</span>
                  </div>
                  
                  <div className="flex flex-col w-24 hidden lg:flex">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('common.startDate')}</span>
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
                              setError(t('module.acceptInterventionError'));
                           } finally {
                              setLoading(false);
                           }
                        }}
                      >
                        {t('module.accept')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        onClick={async () => {
                             if (confirm(t('module.markInterventionNotResolved'))) {
                               setLoading(true);
                               try {
                                 await service.update(row.id, { statut: 'refuse' });
                                 await loadRows();
                               } catch {
                                 setError(t('module.markNotResolvedError'));
                               } finally {
                                 setLoading(false);
                               }
                             }
                           }}
                      >
                        {t('module.notResolved')}
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
                      {row.statut === 'termine' ? t('module.completed') : t('module.disable')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                    {row.statut === 'en_cours' ? t('module.process') : t('crud.details')}
                  </Button>
                </div>
             </div>
          ))}
          {filteredRows.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>{t('module.noInterventions')}</p>
             </div>
          )}
        </div>
      ) : role === 'chefstock' && moduleConfig?.key === 'demande-pieces' ? (
        <div className={`animate-rise delay-1 ${viewContainerClass(viewMode, 'flex flex-col gap-3')}`}>
          {filteredRows.map(row => {
             const pieceName = getResolvedColumnValue('piece', row.piece);
             const ficheId = getResolvedColumnValue('fiche', row.fiche);
             
             return (
               <div key={row.id} className={`${viewMode === 'cards' ? 'flex flex-col gap-3' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-4'} border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 hover:border-[#145f7a]/30 hover:shadow-sm transition-all rounded-lg p-3 lg:p-4`}>
                  <div className="flex items-center gap-4 flex-1 flex-wrap sm:flex-nowrap sm:grid sm:grid-cols-[80px_96px_1fr_80px] md:grid-cols-[80px_96px_1fr_80px_96px] lg:grid-cols-[80px_96px_1fr_80px_96px_96px]">
                    <div className="flex-shrink-0 w-20">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">REQ-P-{row.id}</span>
                    </div>
                    
                    <div className="flex-shrink-0 w-28">
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-full border ${getDemandePieceStatusStyle(row.statut)}`}>
                        {formatStatusLabel(row.statut, t)}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col min-w-[120px] flex-1">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('columns.piece')}</span>
                      <span className="font-medium text-[#145f7a] text-sm truncate">{pieceName}</span>
                    </div>
                    
                    <div className="flex flex-col min-w-[80px]">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('common.quantity')}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{row.quantite}</span>
                    </div>
                    
                    <div className="flex flex-col min-w-[100px] hidden sm:flex">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('module.linkedFicheLabel')}</span>
                      <span className="text-sm truncate text-slate-700 dark:text-slate-300">FCH-{ficheId}</span>
                    </div>
                    
                    <div className="flex flex-col w-24 hidden lg:flex">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('columns.date_demande')}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(row.date_demande || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 flex-shrink-0 self-end sm:self-auto w-full sm:w-[180px]">
                    {row.statut === 'hors_stock' && (
                       <Button
                         size="sm"
                         variant="outline"
                         className="h-8 text-xs flex-1 sm:flex-none border-rose-200 text-rose-700"
                         onClick={() => navigate('/chefstock/suivi-achat')}
                       >
                         {t('module.purchaseTracking')}
                       </Button>
                    )}

                    {row.statut === 'demandee' && (
                       <Button 
                         size="sm" 
                         className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs flex-1 sm:flex-none"
                         onClick={async () => {
                            if (confirm(t('module.deliverConfirm', { qty: row.quantite, name: pieceName }))) {
                               setLoading(true);
                               try {
                                  await demandePiecesService.livrerStock(row.id);
                                  await loadRows();
                                  await loadLookups();
                               } catch (err) {
                                  setError(extractApiErrorMessage(err, t('module.deliveryError')));
                               } finally {
                                  setLoading(false);
                               }
                            }
                         }}
                       >
                         {t('module.deliverStock')}
                       </Button>
                    )}

                    <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-[#145f7a] hover:bg-sky-50 flex-1 sm:flex-none" onClick={() => openEdit(row)}>
                      {t('crud.details')}
                    </Button>
                  </div>
               </div>
             );
          })}
          {filteredRows.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>{t('module.noPartRequests')}</p>
             </div>
          )}
        </div>
      ) : moduleConfig?.key === 'demande-maintenances' ? (
        <div className={`animate-rise delay-1 ${viewContainerClass(viewMode, 'flex flex-col gap-3')}`}>
          {filteredRows.map(row => (
             <div key={row.id} className={`${viewMode === 'cards' ? 'flex flex-col gap-3' : 'flex items-center justify-between'} border transition-all rounded-lg p-3 lg:p-4 ${
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
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('common.material')}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">{displayRoleValue(row.materiel)}</span>
                  </div>
                  
                  <div className="flex flex-col w-32 hidden md:flex">
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{t('columns.manager')}</span>
                    <span className="text-sm truncate text-slate-700 dark:text-slate-300">{displayRoleValue(row.manager) || <span className="text-slate-400 dark:text-slate-300 italic">{t('common.notAssigned')}</span>}</span>
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

                <div className="flex flex-wrap items-center gap-2 sm:justify-end pl-4 ml-4 border-l border-slate-100 flex-shrink-0 sm:max-w-[280px]">
                  {role === 'receptioniste' && row.statut === 'termine' && (
                    <Button
                      size="sm"
                      className={`h-7 text-xs px-2 gap-1 ${
                        row.facture_email_envoye
                          ? 'bg-sky-600 hover:bg-sky-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      onClick={() => sendFactureToClient(row)}
                      disabled={loading}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {row.facture_email_envoye ? t('module.resendInvoice') : t('module.sendInvoiceClient')}
                    </Button>
                  )}
                  {(role === 'manager' || role === 'administrateur' || role === 'admin') && row.statut === 'en_attente' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2"
                        onClick={() => openAcceptDemande(row)}
                      >
                        {t('module.accept')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        onClick={async () => {
                             if (confirm(t('module.markRequestNotResolved'))) {
                               setLoading(true);
                               try {
                                 await service.update(row.id, { statut: 'refuse' });
                                 await loadRows();
                               } catch {
                                 setError(t('module.markNotResolvedError'));
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
                <p>{t('module.noRequestsFilter')}</p>
             </div>
          )}
        </div>
      ) : isMessagesModule ? (
        <MessengerApp embedded onWsStateChange={setWsState} />
      ) : (
        <Card className="animate-rise delay-1 border-0 shadow-none bg-transparent">
          <div className={viewContainerClass(viewMode)}>
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
                                   {row[column] === true || row[column] === 'true' ? t('common.paid') : t('common.unpaid')}
                                 </Badge>
                              ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                                <Badge variant="outline" className={`h-5 w-fit px-2 py-0 text-[10px] ${row[column] === true || row[column] === 'true' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                  {row[column] === true || row[column] === 'true' ? t('crud.yes') : t('crud.no')}
                                </Badge>
                              ) : (
                                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{getResolvedColumnValue(column, row[column]) || '-'}</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {(permissions.update || canDeleteRow) && (
                          <div className="mt-3 flex shrink-0 items-center justify-end gap-2 sm:mt-0 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 self-end sm:self-auto sm:w-[200px]">
                            {permissions.update && hasWritableFields ? (
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-[#145f7a] hover:bg-sky-50" onClick={() => openEdit(row)}>
                                <Pencil className="h-3.5 w-3.5 mr-1.5" /> {t('crud.edit')}
                              </Button>
                            ) : null}

                            {canDeleteRow ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                                onClick={() => setDeleteModalState({ isOpen: true, row })}
                                disabled={deletingId === row.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t('crud.delete')}
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
                               {row[column] === true || row[column] === 'true' ? t('common.paid') : t('common.unpaid')}
                             </Badge>
                          ) : typeof row[column] === 'boolean' || row[column] === 'true' || row[column] === 'false' || column.startsWith('est_') ? (
                             <Badge variant="outline" className={`w-fit text-[10px] px-2 py-0 h-5 ${row[column] === true || row[column] === 'true' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                               {row[column] === true || row[column] === 'true' ? t('crud.yes') : t('crud.no')}
                             </Badge>
                          ) : (
                             <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">{getResolvedColumnValue(column, row[column]) || '-'}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {(permissions.update || canDeleteRow || (role === 'receptioniste' && moduleConfig?.key === 'factures')) && (
                      <div className="flex items-center justify-end gap-2 sm:pl-4 sm:ml-4 sm:border-l sm:border-slate-100 shrink-0 self-end sm:self-auto mt-2 sm:mt-0 sm:w-[200px]">
                        {role === 'receptioniste' && moduleConfig?.key === 'factures' ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-[#145f7a] hover:bg-[#145f7a]/10 gap-1.5 font-medium"
                              onClick={() => printFacture(row)}
                            >
                              <Printer className="h-3.5 w-3.5" /> {t('module.print')}
                            </Button>
                            {row.est_payee !== true && row.est_payee !== 'true' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-1.5 font-medium"
                                onClick={() => markFacturePaid(row)}
                              >
                                {t('module.markPaid')}
                              </Button>
                            ) : null}
                          </>
                        ) : null}

                        {permissions.update && hasWritableFields ? (
                          <Button size="sm" variant="ghost" className="h-8 text-[#145f7a] hover:bg-sky-50 px-2" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
                          </Button>
                        ) : null}

                        {canDeleteRow ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-rose-600 hover:bg-rose-50 px-2"
                            onClick={() => setDeleteModalState({ isOpen: true, row })}
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
                 <p className="text-sm">{t('common.noRecords')}</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {!isMessagesModule ? (
        <DataPagination
          page={page}
          pageSize={pageSize}
          total={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          disabled={loading}
        />
      ) : null}

      <AppModal
        open={Boolean(drawerMode) && !isMessagesModule}
        onClose={closeDrawer}
        eyebrow={drawerMode === 'create' ? t('crud.create') : t('crud.edit')}
        title={tModule(moduleConfig?.key)}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeDrawer}>{t('crud.cancel')}</Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={saveForm} disabled={saving}>
              {saving ? t('crud.saving') : t('crud.save')}
            </Button>
          </div>
        }
      >
            <p className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">{t('common.updateRegistry')}</p>
            <div className="space-y-6">
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
                                             <Badge variant="outline" className={`text-[10px] border ${getDemandePieceStatusStyle(pieceRec.statut)}`}>
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
                                
                                {editingRow?.statut === 'en_cours' && (
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
                            required={field.required && !isReadOnly}
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
                              required={field.required && !isReadOnly}
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
                          required={field.required && !isReadOnly}
                          disabled={isReadOnly}
                        />
                      </label>
                    )
                  })}
                  {acceptIntent && moduleConfig?.key === 'demande-maintenances' && drawerMode === 'edit' && (() => {
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
                <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                  {saveError}
                </p>
              ) : null}
            </div>
      </AppModal>

      <ConfirmModal
        open={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, row: null })}
        onConfirm={confirmDelete}
        message={t('common.confirmDeleteMsg', {
          name: displayRoleValue(
            deleteModalState.row?.nom ||
              deleteModalState.row?.numero_serie ||
              deleteModalState.row?.nom_complet ||
              deleteModalState.row?.username ||
              deleteModalState.row?.id,
          ),
        })}
        loading={deletingId === deleteModalState.row?.id}
      />
    </div>
  )
}

export default RoleModulePage
