import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMessages } from '../../context/MessagesContext'
import { primeMessageNotificationSound } from '../../lib/messageSound'

function NavbarMessagesButton() {
  const { t } = useTranslation()
  const { toggleDock, totalUnread } = useMessages()

  return (
    <button
      type="button"
      onClick={() => {
        primeMessageNotificationSound()
        toggleDock()
      }}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-[#0084ff] hover:border-[#0084ff]/30 transition-colors"
      aria-label={t('messages.title')}
      title={t('messages.title')}
    >
      <MessageCircle className="h-5 w-5" />
      {totalUnread > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      ) : null}
    </button>
  )
}

export default NavbarMessagesButton
