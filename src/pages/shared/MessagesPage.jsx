import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Paperclip, SendHorizontal } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { extractApiErrorMessage } from '../../lib/api'
import { getStoredAuth } from '../../lib/auth'
import { connectMessagesSocket } from '../../lib/messagesRealtime'
import messagesService from '../../services/entities/messages.service'
import usersService from '../../services/entities/users.service'

function toUserRef(value, usersById) {
  if (value && typeof value === 'object') {
    const id = Number(value.id)
    const username = String(value.username ?? value.nom ?? value.name ?? '').trim()
    const role = String(value.role ?? '').trim()

    return {
      id: Number.isInteger(id) && id > 0 ? id : null,
      username,
      role,
      displayName: username || (Number.isInteger(id) && id > 0 ? `User #${id}` : 'Unknown user'),
    }
  }

  const id = Number(value)
  if (Number.isInteger(id) && id > 0) {
    const fromUsers = usersById.get(id)

    if (fromUsers) {
      return {
        id,
        username: String(fromUsers.username ?? '').trim(),
        role: String(fromUsers.role ?? '').trim(),
        displayName: String(fromUsers.username ?? '').trim() || `User #${id}`,
      }
    }

    return {
      id,
      username: '',
      role: '',
      displayName: `User #${id}`,
    }
  }

  return {
    id: null,
    username: String(value ?? '').trim(),
    role: '',
    displayName: String(value ?? '').trim() || 'Unknown user',
  }
}

function toConversationKey(userRef) {
  if (userRef?.id) {
    return `user:${userRef.id}`
  }

  const fallback = String(userRef?.username ?? userRef?.displayName ?? 'unknown')
    .trim()
    .toLowerCase()

  return `name:${fallback || 'unknown'}`
}

function parseTimestamp(value) {
  const stamp = Date.parse(value ?? '')
  return Number.isFinite(stamp) ? stamp : 0
}

function formatMessageTime(value) {
  const stamp = parseTimestamp(value)
  if (!stamp) {
    return '--:--'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp)
}

function isMessageFromCurrentUser(message, currentUserId, currentUsername) {
  const senderRef = toUserRef(message?.expediteur, new Map())

  if (currentUserId && senderRef.id) {
    return senderRef.id === currentUserId
  }

  if (currentUsername) {
    return senderRef.username.toLowerCase() === currentUsername
  }

  return false
}

function resolveOtherParty(message, currentUserId, currentUsername, usersById) {
  const sender = toUserRef(message?.expediteur, usersById)
  const recipient = toUserRef(message?.destinataire, usersById)

  const senderIsCurrent =
    (currentUserId && sender.id && sender.id === currentUserId) ||
    (currentUsername && sender.username.toLowerCase() === currentUsername)

  if (senderIsCurrent) {
    return recipient
  }

  return sender
}

function upsertMessage(previousRows, message) {
  if (!message?.id) {
    return [message, ...previousRows]
  }

  const existingIndex = previousRows.findIndex((item) => item.id === message.id)
  if (existingIndex >= 0) {
    const next = [...previousRows]
    next[existingIndex] = {
      ...next[existingIndex],
      ...message,
    }
    return next
  }

  return [message, ...previousRows]
}

function MessagesPage() {
  const auth = getStoredAuth()
  const messagesListRef = useRef(null)
  const wsRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wsState, setWsState] = useState('idle')
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [activeConversationKey, setActiveConversationKey] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [composerSubject, setComposerSubject] = useState('')
  const [manualRecipientId, setManualRecipientId] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const availableRecipients = useMemo(
    () =>
      users.filter((user) => {
        if (!currentUserId) {
          return true
        }

        return Number(user?.id) !== currentUserId
      }),
    [currentUserId, users],
  )

  const conversations = useMemo(() => {
    const buckets = new Map()

    for (const message of rows) {
      const party = resolveOtherParty(message, currentUserId, currentUsername, usersById)
      const key = toConversationKey(party)

      const previous = buckets.get(key)
      const nextMessages = previous ? [...previous.messages, message] : [message]
      const sorted = nextMessages.sort(
        (a, b) => parseTimestamp(a?.date_envoi) - parseTimestamp(b?.date_envoi),
      )

      buckets.set(key, {
        key,
        party,
        messages: sorted,
        lastMessage: sorted[sorted.length - 1] ?? null,
      })
    }

    return [...buckets.values()].sort(
      (a, b) => parseTimestamp(b?.lastMessage?.date_envoi) - parseTimestamp(a?.lastMessage?.date_envoi),
    )
  }, [currentUserId, currentUsername, rows, usersById])

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations
    }
    const token = searchQuery.toLowerCase()
    return conversations.filter((c) => {
      const name = String(c.party?.displayName || '').toLowerCase()
      const content = String(c.lastMessage?.contenu || '').toLowerCase()
      return name.includes(token) || content.includes(token)
    })
  }, [conversations, searchQuery])
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return []
    }
    const token = searchQuery.toLowerCase()
    
    const existingUserIds = new Set(
      conversations.map(c => Number(c.party?.id)).filter(id => !Number.isNaN(id) && id > 0)
    )
    
    return availableRecipients.filter(user => {
      const id = Number(user.id)
      if (existingUserIds.has(id)) return false
      
      const name = String(user.username || user.nom || user.name || '').toLowerCase()
      const role = String(user.role || '').toLowerCase()
      return name.includes(token) || role.includes(token)
    })
  }, [searchQuery, availableRecipients, conversations])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  )
  
  const selectedNewUser = useMemo(() => {
    if (!activeConversationKey.startsWith('new_user:')) return null
    const idStr = activeConversationKey.split(':')[1]
    const id = Number(idStr)
    return availableRecipients.find(u => Number(u.id) === id) || null
  }, [activeConversationKey, availableRecipients])

  const resolvedRecipientId = useMemo(() => {
    if (activeConversation?.party?.id) {
      return Number(activeConversation.party.id)
    }
    
    if (selectedNewUser) {
      return Number(selectedNewUser.id)
    }

    const manualId = Number(manualRecipientId)
    return Number.isInteger(manualId) && manualId > 0 ? manualId : null
  }, [activeConversation?.party?.id, selectedNewUser, manualRecipientId])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [messages, usersCollection] = await Promise.all([
          messagesService.list({ page_size: 300 }),
          usersService.list().catch(() => []),
        ])

        if (!mounted) {
          return
        }

        setRows(messages)
        setUsers(usersCollection)
      } catch (requestError) {
        if (!mounted) {
          return
        }

        setError(extractApiErrorMessage(requestError, 'Unable to load messages.'))
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
  }, [])

  useEffect(() => {
    if (activeConversationKey.startsWith('new_user:')) {
      return
    }

    if (!conversations.length) {
      setActiveConversationKey('')
      return
    }

    if (!conversations.some((conversation) => conversation.key === activeConversationKey)) {
      setActiveConversationKey(conversations[0].key)
    }
  }, [activeConversationKey, conversations])

  useEffect(() => {
    if (activeConversation?.party?.id || manualRecipientId) {
      return
    }

    if (availableRecipients.length > 0) {
      setManualRecipientId(String(availableRecipients[0].id))
    }
  }, [activeConversation?.party?.id, availableRecipients, manualRecipientId])

  useEffect(() => {
    if (!messagesListRef.current) {
      return
    }

    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight
  }, [activeConversation?.messages])

  useEffect(() => {
    if (!auth?.access) {
      setWsState('error')
      return undefined
    }

    setWsState('connecting')

    const socket = connectMessagesSocket(auth.access, {
      onOpen: () => {
        setWsState('connected')
      },
      onClose: () => {
        setWsState((previous) => (previous === 'error' ? previous : 'closed'))
      },
      onError: () => {
        setWsState('error')
      },
      onMessage: (payload) => {
        if (!payload || payload.type !== 'message.created') {
          return
        }

        setRows((previousRows) => upsertMessage(previousRows, payload))
      },
    })

    wsRef.current = socket

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [auth?.access])

  const sendMessage = async () => {
    const trimmedContent = composerContent.trim()

    if (!trimmedContent) {
      return
    }

    if (!resolvedRecipientId) {
      setError('Select a recipient before sending a message.')
      return
    }

    setSending(true)
    setError('')

    const payload = {
      destinataire: resolvedRecipientId,
      objet:
        composerSubject.trim() ||
        String(activeConversation?.lastMessage?.objet ?? activeConversation?.party?.displayName ?? 'Message'),
      contenu: trimmedContent,
    }

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message.send',
            ...payload,
          }),
        )
      } else {
        const created = await messagesService.create(payload)
        setRows((previousRows) => upsertMessage(previousRows, created))
      }

      if (activeConversationKey.startsWith('new_user:')) {
        setActiveConversationKey(`user:${resolvedRecipientId}`)
      }

      setComposerContent('')
      setComposerSubject('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, 'Unable to send message.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="glass-panel animate-rise p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">Messenger</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Real-time team conversations for all users.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-xs text-slate-600 dark:text-slate-400">
            <MessageCircle className="h-4 w-4 text-[#145f7a]" />
            Status: {wsState}
          </div>
        </div>
      </header>

      <section className="glass-panel animate-rise delay-1 overflow-hidden p-0">
        <div className="grid min-h-[72vh] grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 lg:border-b-0 lg:border-r w-full">
            <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4 bg-transparent sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Boîte de réception</h2>
              <div className="mt-3 relative flex items-center">
                 <input 
                   type="text" 
                   placeholder="Rechercher..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[13px] rounded-md pl-9 pr-4 py-2 outline-none focus:border-[#145f7a] focus:ring-1 focus:ring-[#145f7a] transition-all shadow-sm"
                 />
                 <svg className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="max-h-[30vh] overflow-auto lg:max-h-[calc(72vh-115px)]">
              {filteredConversations.map((conversation) => {
                const isActive = conversation.key === activeConversationKey
                const preview = String(conversation.lastMessage?.contenu ?? '').trim()
                const mine = isMessageFromCurrentUser(conversation.lastMessage, currentUserId, currentUsername)

                return (
                  <button
                    key={conversation.key}
                    type="button"
                    className={`w-full group px-5 py-3.5 border-b border-slate-100 last:border-0 text-left transition-colors relative ${
                      isActive ? 'bg-slate-50 dark:bg-slate-900' : 'hover:bg-slate-50 dark:bg-slate-900'
                    }`}
                    onClick={() => setActiveConversationKey(conversation.key)}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#145f7a]" />}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#145f7a]/10 text-sm font-semibold text-[#145f7a]">
                          {String(conversation.party.displayName || 'U').slice(0, 1).toUpperCase()}
                        </span>
                        {!isActive && <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white border border-white"></span>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <p className={`truncate text-sm font-semibold ${isActive ? 'text-[#145f7a]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {conversation.party.displayName || 'Utilisateur inconnu'}
                          </p>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-300 shrink-0 ml-2">
                            {formatMessageTime(conversation.lastMessage?.date_envoi)}
                          </span>
                        </div>
                        <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                          {mine && 'Vous: '}{preview || 'Nouvelle conversation'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}

              {filteredUsers.length > 0 && (
                <div className="px-5 py-2.5 bg-slate-100/50 dark:bg-slate-900/50 border-t border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 hidden lg:block">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Autres Utilisateurs</span>
                </div>
              )}
              {filteredUsers.map((user) => {
                const userKey = `new_user:${user.id}`
                const isActive = userKey === activeConversationKey
                const displayName = user.username || user.nom || user.name || 'Utilisateur inconnu'

                return (
                  <button
                    key={userKey}
                    type="button"
                    className={`w-full group px-5 py-3.5 border-b border-slate-100 last:border-0 text-left transition-colors relative ${
                      isActive ? 'bg-slate-50 dark:bg-slate-900' : 'hover:bg-slate-50 dark:bg-slate-900'
                    }`}
                    onClick={() => setActiveConversationKey(userKey)}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#145f7a]" />}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {String(displayName).slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <p className={`truncate text-sm font-semibold ${isActive ? 'text-[#145f7a]' : 'text-slate-900 dark:text-slate-100'}`}>
                            {displayName}
                          </p>
                        </div>
                        <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                          {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Membre'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}

              {filteredConversations.length === 0 && filteredUsers.length === 0 && !loading ? (
                <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
                   <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3">
                      <MessageCircle className="h-6 w-6 text-slate-300" />
                   </div>
                   <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Aucune discussion</p>
                   <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">
                     {searchQuery ? "Aucun résultat trouvé." : "Sélectionnez un destinataire pour commencer."}
                   </p>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="flex min-h-[72vh] flex-col bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-6 py-4 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                 {(activeConversation?.party || selectedNewUser) ? (() => {
                    const party = activeConversation?.party || {
                      displayName: selectedNewUser.username || selectedNewUser.nom || selectedNewUser.name,
                      role: selectedNewUser.role
                    }
                    return (
                    <>
                      <div className="relative shrink-0">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#145f7a] text-sm font-bold text-white shadow-sm">
                           {String(party.displayName || 'U').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                          {party.displayName || 'Nouvelle conversation'}
                        </h3>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center">
                          {party.role ? party.role.charAt(0).toUpperCase() + party.role.slice(1) : 'Interlocuteur'} • En ligne
                        </p>
                      </div>
                    </>
                    )
                 })() : null}
              </div>
              
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-300">
                 <button className="hover:text-[#145f7a] hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors p-2 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                 <button className="hover:text-[#145f7a] hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors p-2 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                 <div className="w-px h-5 bg-slate-200 dark:bg-slate-900 mx-1"></div>
                 <button className="hover:text-[#145f7a] hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 transition-colors p-2 rounded-md"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
              </div>
            </div>

            <div ref={messagesListRef} className="flex-1 space-y-6 overflow-auto px-6 py-6 scroll-smooth bg-slate-50 dark:bg-slate-800/50">
              {activeConversation?.messages?.map((message) => {
                const mine = isMessageFromCurrentUser(message, currentUserId, currentUsername)

                return (
                  <div key={message.id ?? `${message.date_envoi}-${message.contenu}`}>
                    <div className={`flex gap-3 ${mine ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
                      {!mine && (
                        <div className="flex-shrink-0 flex items-end mb-1">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#145f7a]/10 text-[11px] font-bold text-[#145f7a] shadow-sm">
                            {String(activeConversation?.party?.displayName ?? 'U').slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className={`flex flex-col group ${mine ? 'items-end' : 'items-start'}`}>
                        {message.objet && (
                          <span className={`text-[10px] mb-1.5 font-bold tracking-wider uppercase ${mine ? 'text-[#145f7a]/60 mr-1' : 'text-slate-400 dark:text-slate-300 ml-1'}`}>
                            {message.objet}
                          </span>
                        )}
                        
                        <div
                          className={`relative max-w-full px-4 py-3 text-[14px] leading-relaxed shadow-sm transition-all sm:max-w-md ${
                            mine
                              ? 'rounded-t-2xl rounded-bl-2xl rounded-br-sm bg-[#145f7a] text-white'
                              : 'rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.contenu || 'No content'}</p>
                        </div>
                        
                        <span className={`text-[11px] font-medium text-slate-400 dark:text-slate-300 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'mr-1' : 'ml-1'}`}>
                          {formatMessageTime(message.date_envoi)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!loading && !activeConversation && !selectedNewUser && (
                <div className="flex h-full flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                     <MessageCircle className="h-8 w-8 text-slate-400 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Boîte de réception</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Sélectionnez une conversation dans le panneau latéral.</p>
                  </div>
              </div>
              )}
            </div>

            <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-6 py-5 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-10">
              {(!activeConversation?.party?.id && !selectedNewUser) ? (
                <div className="flex bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 px-4 items-center focus-within:ring-2 ring-[#145f7a]/20 focus-within:border-[#145f7a]/40 transition-all w-full">
                  <select
                    className="h-10 w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                    value={manualRecipientId}
                    onChange={(event) => setManualRecipientId(event.target.value)}
                  >
                    <option value="" disabled hidden>Sélectionner un destinataire...</option>
                    {availableRecipients.map((recipient) => (
                      <option key={`recipient-${recipient.id}`} value={recipient.id}>
                        {recipient.username} ({recipient.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="flex items-end gap-3 w-full">
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all"
                  title="Plus"
                  aria-label="Plus"
                ><span className="text-xl font-medium mb-0.5">+</span></button>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-all"
                  title="Attachment"
                  aria-label="Attachment"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <div className="flex flex-1 flex-col justify-end bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 focus-within:border-[#145f7a]/50 focus-within:ring-4 focus-within:ring-[#145f7a]/10 transition-all shadow-sm">
                  <textarea
                    className="w-full resize-none bg-transparent text-[14px] text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:text-slate-300 min-h-[40px] max-h-32 py-1 leading-relaxed"
                    placeholder="Écrivez votre message..."
                    value={composerContent}
                    onChange={(event) => setComposerContent(event.target.value)}
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                  />
                </div>

                  <button 
                    onClick={() => void sendMessage()} 
                    disabled={sending || !composerContent.trim()}
                    className={`flex h-11 w-11 shrink-0 transition-all items-center justify-center rounded-lg shadow-sm ${composerContent.trim() ? 'bg-[#145f7a] text-white hover:bg-[#115168]' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                  >
                    <SendHorizontal className="h-5 w-5" />
                    <span className="sr-only">Send</span>
                  </button>
              </div>

              {error ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 animate-in fade-in zoom-in-95 mt-2">
                  {error}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

export default MessagesPage
