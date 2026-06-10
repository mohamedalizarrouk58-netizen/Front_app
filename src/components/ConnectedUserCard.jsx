import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import { getProfilePath, getStoredAuth, normalizeRole } from '../lib/auth'
import { getUserAvatarSrc, getUserDisplayName } from '../lib/userImage'
import usersService from '../services/entities/users.service'

function ConnectedUserCard({ roleLabel, className = '' }) {
  const { t } = useTranslation()
  const auth = getStoredAuth()
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    usersService.getCurrent()
      .then((data) => {
        if (mounted) setUser(data)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])
  const profilePath = getProfilePath(auth?.role)
  const role = normalizeRole(auth?.role)
  const displayName = user ? getUserDisplayName(user) : auth?.username ?? t('User')
  const avatarSrc = user ? getUserAvatarSrc(user?.image) : null
  const badgeText = roleLabel ?? (role ? t(`role.${role}`) : '')

  return (
    <Link
      to={profilePath}
      className={`group flex items-center gap-4 rounded-xl transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/50 -m-2 p-2 ${className}`}
      title={t('profile.editTitle')}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#145f7a]/10 dark:bg-[#1ea0d6]/10 text-[#145f7a] dark:text-[#1ea0d6] overflow-hidden">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-6 w-6" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-[#1ea0d6]">
          {t('Connected User')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </p>
          {badgeText ? (
            <Badge className="bg-[#145f7a]/10 text-[#145f7a] hover:bg-[#145f7a]/20 border-0 dark:bg-[#1ea0d6]/10 dark:text-[#1ea0d6] dark:hover:bg-[#1ea0d6]/20">
              {badgeText}
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 group-hover:text-[#1ea0d6]">
          {t('profile.viewProfile')}
        </p>
      </div>
    </Link>
  )
}

export default ConnectedUserCard
