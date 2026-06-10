import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './button'
import { AppModal } from './AppModal'

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  loading = false,
  headerVariant = 'danger',
}) {
  const { t } = useTranslation()

  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow={t('common.confirmDelete')}
      title={title ?? t('common.confirmDelete')}
      size="sm"
      headerVariant={headerVariant}
      zIndex={100}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            {t('crud.cancel')}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? t('crud.deleting') : confirmLabel ?? t('crud.delete')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
        <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 sm:mb-0">
          <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </AppModal>
  )
}
