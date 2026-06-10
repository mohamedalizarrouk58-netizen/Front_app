import { MessageCircle, PenSquare, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import MessengerChatWindow from './MessengerChatWindow'

function MessengerDock() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationList, setShowNewConversationList] = useState(false)

  const {
    dockOpen,
    setDockOpen,
    openChatIds,
    closeChat,
    openChatFromList,
    conversations,
    users,
    currentUserId,
    currentUsername,
    unreadByParty,
    loading,
  } = useMessages()

  const availableRecipients = useMemo(
    () => getAvailableRecipients(users, currentUserId),
    [users, currentUserId],
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

  if (!dockOpen && openChatIds.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex items-end gap-3 pointer-events-none pb-0 sm:right-6">
      {openChatIds.map((partyId) => (
        <MessengerChatWindow
          key={partyId}
          partyId={partyId}
          onClose={() => closeChat(partyId)}
        />
      ))}

      {dockOpen ? (
        <div className="pointer-events-auto flex h-[455px] w-[360px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle className="h-5 w-5 shrink-0 text-[#0084ff]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {t('messages.chats')}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowNewConversationList((previous) => !previous)}
                className="rounded-full p-1.5 text-[#0084ff] hover:bg-[#0084ff]/10"
                aria-label={t('messages.newConversation')}
                title={t('messages.newConversation')}
              >
                <PenSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDockOpen(false)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('messages.searchPlaceholder')}
                className="w-full rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] border-0 text-sm pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-[#0084ff]/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredConversations.map((conversation) => {
              const partyId = Number(conversation.party?.id)
              const unread = unreadByParty[partyId] || 0
              const preview = getMessagePreview(conversation.lastMessage, t)
              const mine = isMessageFromCurrentUser(
                conversation.lastMessage,
                currentUserId,
                currentUsername,
              )

              return (
                <button
                  key={conversation.key}
                  type="button"
                  onClick={() => openChatFromList(partyId)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]/60 transition-colors"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0084ff] to-[#00c6ff] text-sm font-bold text-white">
                    {String(conversation.party.displayName || 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {conversation.party.displayName}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatConversationTime(conversation.lastMessage?.date_envoi)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {mine ? `${t('messages.you')}: ` : ''}{preview}
                    </p>
                  </div>
                  {unread > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0084ff] px-1.5 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
              )
            })}

            {showNewRecipientSection && filteredNewRecipients.length > 0 ? (
              <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t('messages.newConversation')}
              </div>
            ) : null}

            {showNewRecipientSection
              ? filteredNewRecipients.map((user) => {
                  const partyId = Number(user.id)
                  const displayName = getUserDisplayName(user, t('messages.unknownUser'))

                  return (
                    <button
                      key={`new-${partyId}`}
                      type="button"
                      onClick={() => {
                        openChatFromList(partyId)
                        setShowNewConversationList(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]/60 transition-colors"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-sm font-bold text-white">
                        {String(displayName).slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-slate-500 capitalize">{user.role || 'member'}</p>
                      </div>
                    </button>
                  )
                })
              : null}

            {!loading &&
            filteredConversations.length === 0 &&
            filteredNewRecipients.length === 0 &&
            !showNewRecipientSection ? (
              <div className="px-4 py-8 text-center">
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

            {showNewRecipientSection && !loading && filteredNewRecipients.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {t('messages.noUsersToMessage')}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MessengerDock
