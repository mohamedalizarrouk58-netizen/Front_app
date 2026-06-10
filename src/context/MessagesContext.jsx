import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { extractApiErrorMessage } from '../lib/api'
import { getStoredAuth } from '../lib/auth'
import {
  buildConversations,
  normalizeMessageRecord,
  upsertMessage,
} from '../lib/messageHelpers'
import { getMessagesSocket, subscribeMessagesSocket } from '../lib/messagesRealtime'
import { loadReadMap, saveReadMap } from '../lib/messageReadStorage'
import { playMessageNotificationSound } from '../lib/messageSound'
import messagesService from '../services/entities/messages.service'
import usersService from '../services/entities/users.service'

const MessagesContext = createContext(null)

function resolveUserId(value) {
  if (value && typeof value === 'object') {
    const id = Number(value.id)
    return Number.isInteger(id) && id > 0 ? id : null
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function MessagesProvider({ children }) {
  const { t } = useTranslation()
  const auth = getStoredAuth()
  const wsRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wsState, setWsState] = useState('idle')
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [readMap, setReadMap] = useState({})
  const [dockOpen, setDockOpen] = useState(false)
  const [openChatIds, setOpenChatIds] = useState([])
  const [fullPagePartyId, setFullPagePartyId] = useState(null)

  const openChatIdsRef = useRef(openChatIds)
  const fullPagePartyIdRef = useRef(fullPagePartyId)
  const currentUserIdRef = useRef(null)

  useEffect(() => {
    openChatIdsRef.current = openChatIds
  }, [openChatIds])

  useEffect(() => {
    fullPagePartyIdRef.current = fullPagePartyId
  }, [fullPagePartyId])

  const currentUserId = useMemo(() => {
    const parsed = Number(auth?.userId)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [auth?.userId])

  const currentUsername = useMemo(
    () => String(auth?.username ?? '').trim().toLowerCase(),
    [auth?.username],
  )

  const usersById = useMemo(() => {
    const map = new Map()
    for (const user of users) {
      const userId = Number(user?.id)
      if (Number.isInteger(userId) && userId > 0) {
        map.set(userId, user)
      }
    }
    return map
  }, [users])

  const conversations = useMemo(
    () => buildConversations(rows, currentUserId, currentUsername, usersById),
    [currentUserId, currentUsername, rows, usersById],
  )

  const unreadStats = useMemo(() => {
    const byParty = {}
    let total = 0

    if (!currentUserId) {
      return { total: 0, byParty }
    }

    for (const message of rows) {
      const destinataireId = resolveUserId(message.destinataire)
      if (destinataireId !== currentUserId) {
        continue
      }

      const expediteurId = resolveUserId(message.expediteur)
      if (!expediteurId) {
        continue
      }

      const messageId = Number(message.id)
      if (!Number.isInteger(messageId)) {
        continue
      }

      const lastRead = Number(readMap[expediteurId] ?? 0)
      if (messageId > lastRead) {
        byParty[expediteurId] = (byParty[expediteurId] || 0) + 1
        total += 1
      }
    }

    return { total, byParty }
  }, [rows, currentUserId, readMap])

  const markConversationRead = useCallback(
    (partyId) => {
      const id = Number(partyId)
      if (!currentUserId || !Number.isInteger(id) || id <= 0) {
        return
      }

      const conversation = conversations.find((c) => Number(c.party?.id) === id)
      const messages = conversation?.messages ?? []
      const lastId = messages.reduce((max, msg) => {
        const msgId = Number(msg.id)
        return Number.isInteger(msgId) && msgId > max ? msgId : max
      }, 0)

      if (!lastId) {
        return
      }

      setReadMap((previous) => {
        const current = Number(previous[id] ?? 0)
        if (lastId <= current) {
          return previous
        }
        const next = { ...previous, [id]: lastId }
        saveReadMap(currentUserId, next)
        return next
      })
    },
    [conversations, currentUserId],
  )

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const applyDeletedMessage = useCallback((record) => {
    const normalized = normalizeMessageRecord({ ...record, is_deleted: true })
    setRows((previous) => upsertMessage(previous, normalized))
  }, [])

  const handleIncomingMessage = useCallback((payload) => {
    if (!payload) {
      return
    }

    if (payload.type === 'message.deleted' || payload.is_deleted) {
      applyDeletedMessage(payload)
      return
    }

    if (payload.type !== 'message.created') {
      return
    }

    const normalized = normalizeMessageRecord(payload)
    setRows((previousRows) => upsertMessage(previousRows, normalized))

    const userId = currentUserIdRef.current
    const destinataireId = resolveUserId(payload.destinataire)
    if (!userId || destinataireId !== userId) {
      return
    }

    const senderId = resolveUserId(payload.expediteur)
    if (!senderId) {
      return
    }

    const chatIsOpen =
      openChatIdsRef.current.includes(senderId) ||
      fullPagePartyIdRef.current === senderId

    if (!chatIsOpen) {
      playMessageNotificationSound()
    }
  }, [applyDeletedMessage])

  const deleteMessage = useCallback(async (messageId) => {
    const id = Number(messageId)
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(t('messages.deleteError'))
    }

    let previousSnapshot = null
    setRows((previous) => {
      const existing = previous.find((row) => Number(row?.id) === id)
      if (!existing) {
        return previous
      }
      previousSnapshot = existing
      return upsertMessage(previous, normalizeMessageRecord({ ...existing, is_deleted: true }))
    })

    try {
      const updated = await messagesService.remove(id)
      applyDeletedMessage(updated)
    } catch (requestError) {
      if (previousSnapshot) {
        setRows((previous) => upsertMessage(previous, previousSnapshot))
      }
      throw requestError
    }
  }, [applyDeletedMessage, t])

  const sendViaSocketOrApi = useCallback(async (payload) => {
    const socket = wsRef.current || getMessagesSocket()
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'message.send',
          ...payload,
        }),
      )
      return null
    }
    return messagesService.create(payload)
  }, [])

  const sendTextTo = useCallback(
    async (recipientId, content, subject) => {
      const trimmed = String(content ?? '').trim()
      if (!recipientId || !trimmed) {
        throw new Error(t('messages.contentRequired'))
      }

      const payload = {
        destinataire: recipientId,
        objet: subject || t('messages.title'),
        contenu: trimmed,
        type_message: 'text',
      }

      const created = await sendViaSocketOrApi(payload)
      if (created) {
        setRows((previous) => upsertMessage(previous, created))
      }
      return created
    },
    [sendViaSocketOrApi, t],
  )

  const sendImageTo = useCallback(async (recipientId, file, caption = '', subject) => {
    if (!recipientId || !file) {
      throw new Error(t('messages.selectFirst'))
    }

    const formData = new FormData()
    formData.append('destinataire', String(recipientId))
    formData.append('objet', subject || t('messages.title'))
    formData.append('type_message', 'image')
    formData.append('fichier', file, file.name || 'photo.jpg')
    if (caption) {
      formData.append('contenu', caption)
    }

    const created = await messagesService.createWithFile(formData)
    setRows((previous) => upsertMessage(previous, created))
    return created
  }, [t])

  const sendFileTo = useCallback(async (recipientId, file, caption = '', subject) => {
    if (!recipientId || !file) {
      throw new Error(t('messages.selectFirst'))
    }

    const formData = new FormData()
    formData.append('destinataire', String(recipientId))
    formData.append('objet', subject || t('messages.title'))
    formData.append('type_message', 'file')
    formData.append('fichier', file, file.name)
    if (caption) {
      formData.append('contenu', caption)
    }

    const created = await messagesService.createWithFile(formData)
    setRows((previous) => upsertMessage(previous, created))
    return created
  }, [t])

  const sendAudioTo = useCallback(async (recipientId, audioFile, subject) => {
    if (!recipientId || !audioFile) {
      throw new Error(t('messages.selectFirst'))
    }

    const file =
      audioFile instanceof File
        ? audioFile
        : new File([audioFile], 'voice-message.webm', { type: audioFile.type || 'audio/webm' })

    const formData = new FormData()
    formData.append('destinataire', String(recipientId))
    formData.append('objet', subject || t('messages.title'))
    formData.append('type_message', 'audio')
    formData.append('fichier', file, file.name)

    const created = await messagesService.createWithFile(formData)
    setRows((previous) => upsertMessage(previous, created))
    return created
  }, [t])

  const openChat = useCallback(
    (partyId) => {
      const id = Number(partyId)
      if (!Number.isInteger(id) || id <= 0) {
        return
      }

      setOpenChatIds((previous) => {
        if (previous.includes(id)) {
          return previous
        }
        const next = [...previous, id]
        return next.length > 2 ? next.slice(-2) : next
      })
      markConversationRead(id)
    },
    [markConversationRead],
  )

  const closeChat = useCallback((partyId) => {
    const id = Number(partyId)
    setOpenChatIds((previous) => previous.filter((item) => item !== id))
  }, [])

  const openChatFromList = useCallback(
    (partyId) => {
      openChat(partyId)
      setDockOpen(false)
    },
    [openChat],
  )

  const toggleDock = useCallback(() => {
    setDockOpen((previous) => !previous)
  }, [])

  const getConversationForParty = useCallback(
    (partyId) => {
      const id = Number(partyId)
      return conversations.find((c) => Number(c.party?.id) === id) ?? null
    },
    [conversations],
  )

  useEffect(() => {
    if (!currentUserId) {
      setReadMap({})
      return
    }
    setReadMap(loadReadMap(currentUserId))
  }, [currentUserId])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const messagesResult = await messagesService.listAll({ page_size: 100 }, { maxPages: 30 })

        let usersCollection = []
        try {
          usersCollection = await usersService.listAll({ page_size: 100 }, { maxPages: 20 })
        } catch (usersError) {
          if (mounted) {
            setError(
              extractApiErrorMessage(usersError, t('messages.usersLoadError')),
            )
          }
        }

        if (!mounted) {
          return
        }

        setRows(messagesResult.map((row) => normalizeMessageRecord(row)))
        setUsers(usersCollection)
      } catch (requestError) {
        if (!mounted) {
          return
        }
        setError(extractApiErrorMessage(requestError, t('messages.loadError')))
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      mounted = false
    }
  }, [t])

  useEffect(() => {
    if (!auth?.access) {
      setWsState('error')
      return undefined
    }

    setWsState('connecting')
    wsRef.current = getMessagesSocket()

    const unsubscribe = subscribeMessagesSocket(auth.access, {
      onOpen: () => {
        wsRef.current = getMessagesSocket()
        setWsState('connected')
      },
      onClose: () => setWsState((prev) => (prev === 'error' ? prev : 'closed')),
      onError: () => setWsState('error'),
      onMessage: handleIncomingMessage,
    })

    return unsubscribe
  }, [auth?.access, handleIncomingMessage])

  const value = useMemo(
    () => ({
      loading,
      error,
      wsState,
      rows,
      users,
      usersById,
      conversations,
      currentUserId,
      currentUsername,
      totalUnread: unreadStats.total,
      unreadByParty: unreadStats.byParty,
      dockOpen,
      setDockOpen,
      toggleDock,
      openChatIds,
      openChat,
      closeChat,
      openChatFromList,
      fullPagePartyId,
      setFullPagePartyId,
      markConversationRead,
      getConversationForParty,
      sendTextTo,
      sendImageTo,
      sendFileTo,
      sendAudioTo,
      deleteMessage,
    }),
    [
      loading,
      error,
      wsState,
      rows,
      users,
      usersById,
      conversations,
      currentUserId,
      currentUsername,
      unreadStats,
      dockOpen,
      toggleDock,
      openChatIds,
      openChat,
      closeChat,
      openChatFromList,
      fullPagePartyId,
      markConversationRead,
      getConversationForParty,
      sendTextTo,
      sendImageTo,
      sendFileTo,
      sendAudioTo,
      deleteMessage,
    ],
  )

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider')
  }
  return context
}

export function useMessagesOptional() {
  return useContext(MessagesContext)
}
