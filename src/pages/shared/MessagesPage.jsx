import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MessengerApp from '../../components/messaging/MessengerApp'

function MessagesPage() {
  const { t } = useTranslation()
  const [wsState, setWsState] = useState('idle')

  return (
    <div className="space-y-4">
      <header className="glass-panel animate-rise p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {t('messages.title')}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              {t('messages.subtitle')}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
            <MessageCircle className="h-4 w-4 text-[#0084ff]" />
            {t('messages.status', { state: wsState })}
          </div>
        </div>
      </header>

      <MessengerApp onWsStateChange={setWsState} />
    </div>
  )
}

export default MessagesPage
