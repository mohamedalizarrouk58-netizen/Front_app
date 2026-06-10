import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, PenSquare, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { extractApiErrorMessage } from '../../lib/api'
import { useMessages } from '../../context/MessagesContext'
import {
  formatConversationTime,
  getMessagePreview,
  isMessageFromCurrentUser,
} from '../../lib/messageHelpers'
import {
  filterRecipientsByQuery,
  getAvailableRecipients,
  getNewConversationRecipients,
  getUserDisplayName,
} from '../../lib/messengerRecipients'
import MessageBubble from './MessageBubble'
import MessengerComposer from './MessengerComposer'

function MessengerApp({ embedded = false, onWsStateChange }) {
  const { t } = useTranslation()
  const messagesListRef = useRef(null)

  const {
    loading,
    error: loadError,
    wsState,
    users,
    conversations,
    currentUserId,
    currentUsername,
    unreadByParty,
    markConversationRead,
    setFullPagePartyId,
    sendTextTo,
    sendImageTo,
    sendFileTo,
    sendAudioTo,
    deleteMessage,
  } = useMessages()

  const [activeConversationKey, setActiveConversationKey] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [manualRecipientId, setManualRecipientId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationList, setShowNewConversationList] = useState(false)

  const availableRecipients = useMemo(
    () => getAvailableRecipients(users, currentUserId),
    [currentUserId, users],
  )

  const newConversationRecipients = useMemo(
    () => getNewConversationRecipients(availableRecipients, conversations),
    [availableRecipients, conversations],
  )

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations
    }
    const token = searchQuery.toLowerCase()
    return conversations.filter((conversation) => {
      const name = String(conversation.party?.displayName || '').toLowerCase()
      const preview = getMessagePreview(conversation.lastMessage, t).toLowerCase()
      return name.includes(token) || preview.includes(token)
    })
  }, [conversations, searchQuery, t])

  const filteredNewRecipients = useMemo(
    () => filterRecipientsByQuery(newConversationRecipients, searchQuery),
    [newConversationRecipients, searchQuery],
  )

  const showNewRecipientSection =
    showNewConversationList || searchQuery.trim().length > 0 || conversations.length === 0

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.key === activeConversationKey) ?? null,
    [activeConversationKey, conversations],
  )

  const selectedNewUser = useMemo(() => {
    if (!activeConversationKey.startsWith('new_user:')) {
      return null
    }
    const id = Number(activeConversationKey.split(':')[1])
    return availableRecipients.find((u) => Number(u.id) === id) || null
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

  const activeParty = activeConversation?.party || (selectedNewUser
    ? {
        displayName: selectedNewUser.username || selectedNewUser.nom || selectedNewUser.name,
        role: selectedNewUser.role,
      }
    : null)

  const defaultSubject = useCallback(() => {
    return (
      String(activeConversation?.lastMessage?.objet ?? '').trim() ||
      String(activeParty?.displayName ?? '').trim() ||
      t('messages.title')
    )
  }, [activeConversation?.lastMessage?.objet, activeParty?.displayName, t])

  useEffect(() => {
    onWsStateChange?.(wsState)
  }, [onWsStateChange, wsState])

  useEffect(() => {
    if (resolvedRecipientId) {
      setFullPagePartyId(resolvedRecipientId)
      markConversationRead(resolvedRecipientId)
    } else {
      setFullPagePartyId(null)
    }
  }, [resolvedRecipientId, markConversationRead, setFullPagePartyId])

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

  const sendTextMessage = async () => {
    const trimmedContent = composerContent.trim()
    if (!trimmedContent || !resolvedRecipientId) {
      if (!resolvedRecipientId) {
        setError(t('messages.selectFirst'))
      }
      return
    }

    setSending(true)
    setError('')

    try {
      await sendTextTo(resolvedRecipientId, trimmedContent, defaultSubject())
      if (activeConversationKey.startsWith('new_user:')) {
        setActiveConversationKey(`user:${resolvedRecipientId}`)
      }
      setComposerContent('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const sendImageMessage = async (file, caption = '') => {
    if (!file || !resolvedRecipientId) {
      setError(t('messages.selectFirst'))
      return
    }

    setSending(true)
    setError('')

    try {
      await sendImageTo(resolvedRecipientId, file, caption, defaultSubject())
      if (activeConversationKey.startsWith('new_user:')) {
        setActiveConversationKey(`user:${resolvedRecipientId}`)
      }
      setComposerContent('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const sendFileMessage = async (file) => {
    if (!file || !resolvedRecipientId) {
      setError(t('messages.selectFirst'))
      return
    }

    setSending(true)
    setError('')

    try {
      await sendFileTo(resolvedRecipientId, file, composerContent.trim(), defaultSubject())
      if (activeConversationKey.startsWith('new_user:')) {
        setActiveConversationKey(`user:${resolvedRecipientId}`)
      }
      setComposerContent('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    setDeletingMessageId(messageId)
    setError('')
    try {
      await deleteMessage(messageId)
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.deleteError')))
      throw requestError
    } finally {
      setDeletingMessageId(null)
    }
  }

  const sendAudioMessage = async (blob) => {
    if (!blob || !resolvedRecipientId) {
      setError(t('messages.selectFirst'))
      return
    }

    setSending(true)
    setError('')

    try {
      await sendAudioTo(resolvedRecipientId, blob, defaultSubject())
      if (activeConversationKey.startsWith('new_user:')) {
        setActiveConversationKey(`user:${resolvedRecipientId}`)
      }
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const shellClass = embedded
    ? 'overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18191a] shadow-sm'
    : 'glass-panel animate-rise delay-1 overflow-hidden p-0'

  const displayError = error || loadError

  return (
    <section className={shellClass}>
      <div className={`grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] ${embedded ? 'min-h-[calc(100vh-140px)]' : 'min-h-[72vh]'}`}>
        <aside className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] lg:border-b-0 lg:border-r flex flex-col">
          <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('messages.chats')}</h2>
              <button
                type="button"
                onClick={() => setShowNewConversationList((previous) => !previous)}
                className="inline-flex items-center gap-1 rounded-full bg-[#0084ff]/10 px-3 py-1.5 text-[11px] font-semibold text-[#0084ff] hover:bg-[#0084ff]/15 transition-colors"
                title={t('messages.newConversation')}
              >
                <PenSquare className="h-3.5 w-3.5" />
                {t('messages.newConversation')}
              </button>
            </div>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('messages.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] border-0 text-sm text-slate-800 dark:text-slate-100 pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0084ff]/30"
              />
            </div>
          </div>

          <div className={`overflow-auto ${embedded ? 'max-h-[calc(100vh-220px)]' : 'max-h-[30vh] lg:max-h-[calc(72vh-88px)]'}`}>
            {filteredConversations.map((conversation) => {
              const isActive = conversation.key === activeConversationKey
              const partyId = Number(conversation.party?.id)
              const unread = unreadByParty[partyId] || 0
              const preview = getMessagePreview(conversation.lastMessage, t)
              const mine = isMessageFromCurrentUser(conversation.lastMessage, currentUserId, currentUsername)

              return (
                <button
                  key={conversation.key}
                  type="button"
                  className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                    isActive ? 'bg-[#e7f3ff] dark:bg-[#263951]' : 'hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]/60'
                  }`}
                  onClick={() => {
                    setActiveConversationKey(conversation.key)
                    markConversationRead(partyId)
                  }}
                >
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0084ff] to-[#00c6ff] text-sm font-bold text-white">
                    {String(conversation.party.displayName || 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {conversation.party.displayName || t('messages.unknownUser')}
                      </p>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {formatConversationTime(conversation.lastMessage?.date_envoi)}
                      </span>
                    </div>
                    <p className="truncate text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {mine ? `${t('messages.you')}: ` : ''}{preview || t('messages.newChat')}
                    </p>
                  </div>
                  {unread > 0 && !isActive ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0084ff] px-1.5 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
              )
            })}

            {showNewRecipientSection && filteredNewRecipients.length > 0 ? (
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t('messages.newConversation')}
              </div>
            ) : null}

            {showNewRecipientSection
              ? filteredNewRecipients.map((user) => {
                  const userKey = `new_user:${user.id}`
                  const isActive = userKey === activeConversationKey
                  const displayName = getUserDisplayName(user, t('messages.unknownUser'))

                  return (
                    <button
                      key={userKey}
                      type="button"
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                        isActive
                          ? 'bg-[#e7f3ff] dark:bg-[#263951]'
                          : 'hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]/60'
                      }`}
                      onClick={() => {
                        setActiveConversationKey(userKey)
                        setShowNewConversationList(false)
                      }}
                    >
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-sm font-bold text-white">
                        {String(displayName).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                          {displayName}
                        </p>
                        <p className="truncate text-[13px] text-slate-500 capitalize">{user.role || 'member'}</p>
                      </div>
                    </button>
                  )
                })
              : null}

            {showNewRecipientSection && !loading && filteredNewRecipients.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-500">{t('messages.noUsersToMessage')}</p>
            ) : null}

            {filteredConversations.length === 0 &&
            filteredNewRecipients.length === 0 &&
            !showNewRecipientSection &&
            !loading ? (
              <div className="px-4 py-12 flex flex-col items-center text-center">
                <MessageCircle className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">{t('messages.selectRecipient')}</p>
                <button
                  type="button"
                  onClick={() => setShowNewConversationList(true)}
                  className="mt-3 rounded-full bg-[#0084ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0073e6]"
                >
                  {t('messages.newConversation')}
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="flex flex-col bg-[#f0f2f5] dark:bg-[#18191a] min-h-[400px]">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] px-5 py-3 shadow-sm">
            {activeParty ? (
              <>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0084ff] to-[#00c6ff] text-sm font-bold text-white">
                  {String(activeParty.displayName || 'U').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {activeParty.displayName}
                  </h3>
                  <p className="text-xs text-[#0084ff] font-medium">
                    {activeParty.role ? String(activeParty.role) : t('messages.activeNow')}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">{t('messages.selectRecipient')}</p>
            )}
          </div>

          <div
            ref={messagesListRef}
            className="flex-1 overflow-auto px-4 py-5 space-y-3 scroll-smooth"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
              backgroundSize: '18px 18px',
            }}
          >
            {activeConversation?.messages?.map((message) => {
              const mine = isMessageFromCurrentUser(message, currentUserId, currentUsername)
              return (
                <MessageBubble
                  key={message.id ?? `${message.date_envoi}-${message.contenu}`}
                  message={message}
                  mine={mine}
                  partyName={activeParty?.displayName}
                  onDelete={mine ? handleDeleteMessage : undefined}
                  deleting={deletingMessageId === message.id}
                />
              )
            })}

            {!loading && !activeConversation && !selectedNewUser && (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-white dark:bg-[#242526] flex items-center justify-center shadow-sm mb-4">
                  <MessageCircle className="h-8 w-8 text-[#0084ff]" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('messages.title')}</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">{t('messages.selectRecipient')}</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] px-4 py-3">
            {(!activeConversation?.party?.id && !selectedNewUser) ? (
              <div className="mb-3">
                <select
                  className="w-full rounded-full border border-slate-200 dark:border-slate-600 bg-[#f0f2f5] dark:bg-[#3a3b3c] px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none"
                  value={manualRecipientId}
                  onChange={(event) => setManualRecipientId(event.target.value)}
                >
                  <option value="" disabled hidden>{t('messages.selectRecipient')}</option>
                  {availableRecipients.map((recipient) => (
                    <option key={`recipient-${recipient.id}`} value={recipient.id}>
                      {recipient.username} ({recipient.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <MessengerComposer
              value={composerContent}
              onChange={setComposerContent}
              onSendText={sendTextMessage}
              onSendImage={sendImageMessage}
              onSendFile={sendFileMessage}
              onSendAudio={sendAudioMessage}
              sending={sending}
              disabled={!resolvedRecipientId}
            />

            {displayError ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {displayError}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}

export default MessengerApp
