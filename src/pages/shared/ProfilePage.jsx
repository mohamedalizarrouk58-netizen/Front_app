import { Camera, Loader2, Mail, Phone, Save, UserCircle2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { extractApiErrorMessage } from '../../lib/api'
import { getStoredAuth, normalizeRole, storeAuth } from '../../lib/auth'
import {
  fileToBase64DataUrl,
  getUserAvatarSrc,
  getUserDisplayName,
  getUserInitials,
} from '../../lib/userImage'
import usersService from '../../services/entities/users.service'

function ProfileAvatar({ user, size = 'lg' }) {
  const src = getUserAvatarSrc(user?.image)
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-16 w-16 text-lg'

  if (src) {
    return (
      <img
        src={src}
        alt={getUserDisplayName(user)}
        className={`${sizeClass} rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl bg-gradient-to-br from-[#145f7a] to-[#1ea0d6] flex items-center justify-center font-bold text-white ring-4 ring-white dark:ring-slate-800 shadow-lg`}
    >
      {getUserInitials(user)}
    </div>
  )
}

function ProfilePage() {
  const { t } = useTranslation()
  const auth = getStoredAuth()
  const role = normalizeRole(auth?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [imageError, setImageError] = useState('')
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    telephone: '',
    password: '',
    image: '',
  })

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await usersService.getCurrent()
      setUser(data)
      setForm({
        email: data.email ?? '',
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        telephone: data.telephone ?? '',
        password: '',
        image: data.image ?? '',
      })
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('profile.loadError')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const previewUser = {
    username: user?.username,
    first_name: form.first_name,
    last_name: form.last_name,
    image: form.image,
  }

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImageError('')
    try {
      const dataUrl = await fileToBase64DataUrl(file)
      setForm((previous) => ({ ...previous, image: dataUrl }))
    } catch (pickError) {
      setImageError(pickError.message || t('profile.imageError'))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      telephone: form.telephone.trim(),
      image: form.image,
    }

    if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    try {
      const updated = await usersService.updateMe(payload)
      setUser(updated)
      setForm((previous) => ({
        ...previous,
        password: '',
        image: updated.image ?? previous.image,
      }))

      if (auth) {
        storeAuth({
          ...auth,
          username: updated.username ?? auth.username,
        })
      }

      setSuccess(t('profile.saveSuccess'))
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, t('profile.saveError')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1ea0d6]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('profile.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('profile.subtitle')}</p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <ProfileAvatar user={previewUser} />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {getUserDisplayName(previewUser)}
              </p>
              <p className="text-sm text-slate-500">{user?.username}</p>
            </div>
            {role ? (
              <Badge className="bg-[#145f7a]/10 text-[#145f7a] dark:bg-[#1ea0d6]/10 dark:text-[#1ea0d6]">
                {t(`role.${role}`)}
              </Badge>
            ) : null}
            {user?.department?.nom_dept ? (
              <p className="text-sm text-slate-500">{user.department.nom_dept}</p>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1ea0d6] hover:underline">
              <Camera className="h-4 w-4" />
              {t('profile.changePhoto')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleImagePick(e)} />
            </label>
            {imageError ? <p className="text-xs text-rose-600">{imageError}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
              {t('profile.firstName')}
            </label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              placeholder={t('profile.firstName')}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
              {t('profile.lastName')}
            </label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              placeholder={t('profile.lastName')}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
            {t('profile.email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="email"
              className="pl-10"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder={t('profile.email')}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
            {t('profile.phone')}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-10"
              value={form.telephone}
              onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
              placeholder={t('profile.phone')}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
            {t('profile.newPassword')}
          </label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder={t('profile.newPasswordHint')}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="rounded-xl bg-[#145f7a] hover:bg-[#0f4d63] dark:bg-[#1ea0d6] dark:hover:bg-[#178bb8]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('profile.save')}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 flex items-start gap-3">
        <UserCircle2 className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-500">{t('profile.readOnlyHint')}</p>
      </div>
    </div>
  )
}

export default ProfilePage
