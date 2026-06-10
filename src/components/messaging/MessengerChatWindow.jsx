import { useEffect, useRef, useState } from 'react'
import { Minus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { extractApiErrorMessage } from '../../lib/api'
import { useMessages } from '../../context/MessagesContext'
import { isMessageFromCurrentUser } from '../../lib/messageHelpers'
import MessageBubble from './MessageBubble'
import MessengerComposer from './MessengerComposer'

function MessengerChatWindow({ partyId, onClose }) {
  const { t } = useTranslation()
  const messagesListRef = useRef(null)
  const [composerContent, setComposerContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [deletingMessageId, setDeletingMessageId] = useState(null)

  const {
    getConversationForParty,
    usersById,
    currentUserId,
    currentUsername,
    markConversationRead,
    sendTextTo,
    sendImageTo,
    sendFileTo,
    sendAudioTo,
    deleteMessage,
  } = useMessages()

  const conversation = getConversationForParty(partyId)
  const partyUser = usersById.get(Number(partyId))
  const party = conversation?.party
  const displayName =
    party?.displayName ||
    partyUser?.username ||
    partyUser?.nom ||
    partyUser?.name ||
    t('messages.unknownUser')
  const subject =
    String(conversation?.lastMessage?.objet ?? '').trim() ||
    String(displayName).trim() ||
    t('messages.title')

  useEffect(() => {
    markConversationRead(partyId)
  }, [markConversationRead, partyId, conversation?.messages?.length])

  useEffect(() => {
    if (!messagesListRef.current) {
      return
    }
    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight
  }, [conversation?.messages])

  const sendText = async () => {
    setSending(true)
    setError('')
    try {
      await sendTextTo(partyId, composerContent, subject)
      setComposerContent('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const sendImage = async (file, caption) => {
    setSending(true)
    setError('')
    try {
      await sendImageTo(partyId, file, caption, subject)
      setComposerContent('')
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  const sendFile = async (file) => {
    setSending(true)
    setError('')
    try {
      await sendFileTo(partyId, file, composerContent, subject)
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

  const sendAudio = async (blob) => {
    setSending(true)
    setError('')
    try {
      await sendAudioTo(partyId, blob, subject)
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="pointer-events-auto flex h-[420px] w-[328px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-[#0084ff] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {String(displayName).slice(0, 1).toUpperCase()}
          </span>
          <p className="truncate text-sm font-semibold">{displayName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/15"
            aria-label={t('messages.minimize')}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/15"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={messagesListRef}
        className="flex-1 overflow-auto px-3 py-3 space-y-2 bg-[#f0f2f5] dark:bg-[#18191a]"
      >
        {!conversation?.messages?.length ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            {t('messages.newChat')}
          </p>
        ) : null}

        {conversation?.messages?.map((message) => {
          const mine = isMessageFromCurrentUser(message, currentUserId, currentUsername)
          return (
            <MessageBubble
              key={message.id ?? `${message.date_envoi}-${message.contenu}`}
              message={message}
              mine={mine}
              partyName={displayName}
              onDelete={mine ? handleDeleteMessage : undefined}
              deleting={deletingMessageId === message.id}
            />
          )
        })}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#242526] px-2 py-2">
        <MessengerComposer
          value={composerContent}
          onChange={setComposerContent}
          onSendText={sendText}
          onSendImage={sendImage}
          onSendFile={sendFile}
          onSendAudio={sendAudio}
          sending={sending}
        />
        {error ? (
          <p className="mt-1 text-[11px] text-rose-600 px-1">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

export default MessengerChatWindow
