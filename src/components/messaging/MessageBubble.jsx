import { useState } from 'react'
import { Download, FileText, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  formatMessageTime,
  getMessageMediaUrl,
  getMessageType,
  isMessageDeleted,
} from '../../lib/messageHelpers'
import VoiceMessagePlayer from './VoiceMessagePlayer'

function MessageBubble({ message, mine, partyName, onDelete, deleting = false }) {
  const { t } = useTranslation()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleted = isMessageDeleted(message)
  const type = deleted ? 'text' : getMessageType(message)
  const mediaUrl = deleted ? null : getMessageMediaUrl(message)
  const hasText = deleted ? false : Boolean(String(message?.contenu ?? '').trim())
  const fileName = String(message?.fichier_name || '').trim() || t('messages.filePreview')
  const canDelete = mine && !deleted && Boolean(message?.id) && Boolean(onDelete)

  const bubbleShellClass = deleted
    ? `px-3 py-2 text-[13px] italic leading-relaxed rounded-[20px] ${
        mine
          ? 'rounded-br-md bg-[#0084ff]/40 text-white/90'
          : 'rounded-bl-md bg-[#e4e6eb]/80 dark:bg-[#3a3b3c]/80 text-slate-500 dark:text-slate-400'
      }`
    : type === 'image' && !hasText
      ? 'rounded-2xl overflow-hidden p-0'
      : `px-3 py-2 text-[15px] leading-relaxed ${
          mine
            ? 'rounded-[20px] rounded-br-md bg-[#0084ff] text-white'
            : 'rounded-[20px] rounded-bl-md bg-[#e4e6eb] dark:bg-[#3a3b3c] text-slate-900 dark:text-slate-100'
        }`

  const handleDelete = async () => {
    if (!onDelete || deleting) {
      return
    }
    try {
      await onDelete(message.id)
      setConfirmDelete(false)
    } catch {
      // Parent may surface errors; keep confirm open on failure.
    }
  }

  return (
    <div className={`flex gap-2 ${mine ? 'justify-end pl-10' : 'justify-start pr-10'}`}>
      {!mine && (
        <div className="flex shrink-0 items-end mb-1">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#0084ff] to-[#00c6ff] text-[10px] font-bold text-white shadow-sm">
            {String(partyName || 'U').slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className={`flex flex-col group max-w-[78%] sm:max-w-[65%] ${mine ? 'items-end' : 'items-start'}`}>
        <div className={`relative shadow-sm transition-all ${bubbleShellClass}`}>
          {canDelete ? (
            <div className="absolute -top-2 right-0 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {confirmDelete ? (
                <div
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] shadow-md ${
                    mine ? 'bg-white text-slate-800' : 'bg-slate-800 text-white'
                  }`}
                >
                  <span className="px-1">{t('messages.deleteConfirm')}</span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                    className="rounded-full px-2 py-0.5 font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deleting ? t('messages.deleting') : t('crud.delete')}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full px-2 py-0.5 hover:bg-black/5 disabled:opacity-50"
                  >
                    {t('crud.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className={`rounded-full p-1.5 shadow-md transition-colors ${
                    mine
                      ? 'bg-white/95 text-slate-600 hover:bg-white hover:text-rose-600'
                      : 'bg-slate-700 text-white hover:bg-slate-800'
                  }`}
                  aria-label={t('messages.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : null}

          {deleted ? (
            <p className="whitespace-pre-wrap break-words">{t('messages.deleted')}</p>
          ) : null}

          {!deleted && type === 'image' && mediaUrl ? (
            <button
              type="button"
              className="block max-w-full"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={mediaUrl}
                alt=""
                className="max-h-72 w-full object-cover rounded-2xl"
                loading="lazy"
              />
            </button>
          ) : null}

          {!deleted && type === 'audio' && mediaUrl ? (
            <VoiceMessagePlayer src={mediaUrl} mine={mine} />
          ) : null}

          {!deleted && type === 'file' && mediaUrl ? (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={fileName}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                mine
                  ? 'border-white/30 bg-white/10 hover:bg-white/20'
                  : 'border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-black/10 hover:bg-white/80'
              }`}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="truncate text-sm font-medium">{fileName}</span>
              <Download className="h-4 w-4 shrink-0 opacity-70" />
            </a>
          ) : null}

          {!deleted && hasText ? (
            <p className={`whitespace-pre-wrap break-words ${type !== 'text' ? 'mt-2' : ''}`}>
              {message.contenu}
            </p>
          ) : null}
        </div>

        <span
          className={`text-[10px] text-slate-400 dark:text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'mr-1' : 'ml-1'}`}
        >
          {formatMessageTime(message.date_envoi)}
        </span>
      </div>

      {lightboxOpen && mediaUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={mediaUrl}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  )
}

export default MessageBubble
