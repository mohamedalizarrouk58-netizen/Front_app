import {
  ArrowLeft,
  Camera,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { AppModal } from '../../components/ui/AppModal'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { DataFiltersBar } from '../../components/ui/DataFiltersBar'
import { RecordCard, RecordField } from '../../components/ui/RecordCard'
import { useViewMode, viewContainerClass } from '../../hooks/useViewMode'
import { USER_ROLES } from '../../lib/domainConstants'
import { extractApiErrorMessage } from '../../lib/api'
import {
  fileToBase64DataUrl,
  getUserAvatarSrc,
  getUserDisplayName,
  getUserInitials,
} from '../../lib/userImage'
import { useOperationFeedback } from '../../context/OperationFeedbackContext'
import { entityServices } from '../../services/entities'

const ROLE_COLORS = {
  admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  manager: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  technicien: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  chefstock: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  receptioniste: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  fournisseur: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: '',
  telephone: '',
  department_id: '',
  image: '',
}

function UserAvatar({ user, size = 'md' }) {
  const src = getUserAvatarSrc(user?.image)
  const sizeClass =
    size === 'lg' ? 'h-16 w-16 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'

  if (src) {
    return (
      <img
        src={src}
        alt={getUserDisplayName(user)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white ring-2 ring-white dark:ring-slate-800 shadow-sm`}
    >
      {getUserInitials(user)}
    </div>
  )
}

function UserFormModal({ open, mode, initialUser, departments, onClose, onSaved }) {
  const { t } = useTranslation()
  const { runWithFeedback } = useOperationFeedback()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setImageError('')
    if (mode === 'edit' && initialUser) {
      setForm({
        username: initialUser.username ?? '',
        email: initialUser.email ?? '',
        password: '',
        first_name: initialUser.first_name ?? '',
        last_name: initialUser.last_name ?? '',
        role: initialUser.role ?? '',
        telephone: initialUser.telephone ?? '',
        department_id: initialUser.department?.id ? String(initialUser.department.id) : '',
        image: initialUser.image ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, mode, initialUser])

  const previewUser = {
    username: form.username || 'user',
    first_name: form.first_name,
    last_name: form.last_name,
    image: form.image,
  }

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageError('')
    try {
      const dataUrl = await fileToBase64DataUrl(file)
      setForm((prev) => ({ ...prev, image: dataUrl }))
    } catch (err) {
      setImageError(err.message)
    }
    event.target.value = ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      role: form.role,
      telephone: form.telephone.trim(),
      department_id: form.department_id ? Number(form.department_id) : null,
      image: form.image || '',
    }

    if (mode === 'create') {
      payload.password = form.password
    } else if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    try {
      await runWithFeedback(
        async () => {
          if (mode === 'create') {
            await entityServices.users.create(payload)
          } else {
            await entityServices.users.update(initialUser.id, payload)
          }
        },
        {
          action: mode === 'create' ? 'create' : 'update',
          entity: t('users.title'),
        },
      )
      onSaved()
      onClose()
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow={mode === 'create' ? t('users.createTitle') : t('users.editTitle')}
      title={t('users.modalSubtitle')}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onClose}>{t('crud.cancel')}</Button>
          <Button type="submit" form="user-form-modal" disabled={saving} className="min-w-[140px] bg-sky-600 hover:bg-sky-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? t('crud.saving') : t('crud.save')}
          </Button>
        </div>
      }
    >
        <form id="user-form-modal" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="relative shrink-0">
              <UserAvatar user={previewUser} size="lg" />
              <label
                className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-500"
              >
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              </label>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.photo')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('users.photoHint')}</p>
              {form.image ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                >
                  {t('users.removePhoto')}
                </Button>
              ) : null}
              {imageError ? <p className="text-xs text-rose-600">{imageError}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.username')} *</span>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.email')} *</span>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.firstName')}</span>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.lastName')}</span>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {mode === 'create' ? t('users.password') + ' *' : t('users.newPassword')}
              </span>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={mode === 'create'}
                placeholder={mode === 'edit' ? t('users.passwordOptional') : ''}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.role')} *</span>
              <select
                className="flex h-11 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
              >
                <option value="">{t('crud.select')}</option>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>{t(`role.${role}`)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('fournisseur.telephone')}</span>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('users.department')}</span>
              <select
                className="flex h-11 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">{t('crud.select')}</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.nom_dept}</option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          ) : null}

        </form>
    </AppModal>
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const { runWithFeedback } = useOperationFeedback()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [viewMode, setViewMode] = useViewMode('admin-users')
  const [modal, setModal] = useState({ open: false, mode: 'create', user: null })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersData, deptData] = await Promise.all([
        entityServices.users.listAll(),
        entityServices.departments.listAll(),
      ])
      setUsers(usersData)
      setDepartments(deptData)
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredUsers = useMemo(() => {
    let result = users
    if (filterRole !== 'all') {
      result = result.filter((user) => user.role === filterRole)
    }
    const q = search.trim().toLowerCase()
    if (!q) return result
    return result.filter((user) => {
      const blob = [
        user.username,
        user.email,
        user.first_name,
        user.last_name,
        user.role,
        user.telephone,
        user.department?.nom_dept,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [users, search, filterRole])

  const hasActiveFilters = filterRole !== 'all' || search.trim().length > 0

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await runWithFeedback(
        async () => {
          await entityServices.users.remove(deleteTarget.id)
        },
        { action: 'delete', entity: getUserDisplayName(deleteTarget) },
      )
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t('users.title')}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('users.subtitle')}</p>
            </div>
          </div>
          <Button
            onClick={() => setModal({ open: true, mode: 'create', user: null })}
            className="bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('users.addNew')}
          </Button>
        </div>

      </header>

      <DataFiltersBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('users.searchPlaceholder')}
        shown={filteredUsers.length}
        total={users.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch('')
          setFilterRole('all')
        }}
        filters={[
          {
            id: 'role',
            label: t('users.role'),
            value: filterRole,
            onChange: setFilterRole,
            options: [
              { value: 'all', label: t('common.allRoles') },
              ...USER_ROLES.map((role) => ({ value: role, label: t(`role.${role}`, role) })),
            ],
          },
        ]}
      />

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('crud.loading')}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 dark:border-slate-700">
          <UserCircle2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500">{t('users.empty')}</p>
        </div>
      ) : (
        <div className={viewContainerClass(viewMode)}>
          {filteredUsers.map((user) => (
            viewMode === 'cards' ? (
              <RecordCard key={user.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{getUserDisplayName(user)}</h3>
                    <p className="text-sm text-slate-500">@{user.username}</p>
                  </div>
                  <Badge className={`ml-auto shrink-0 ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {t(`role.${user.role}`, user.role)}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RecordField label={t('users.email')} value={user.email} />
                  <RecordField label={t('columns.telephone', 'Phone')} value={user.telephone || '-'} />
                  <RecordField label={t('users.department')} value={user.department?.nom_dept || '-'} />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setModal({ open: true, mode: 'edit', user })}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t('crud.edit')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(user)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('crud.delete')}
                  </Button>
                </div>
              </RecordCard>
            ) : (
            <motion.div
              key={user.id}
              layout
              className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <UserAvatar user={user} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {getUserDisplayName(user)}
                    </h3>
                    <Badge className={ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}>
                      {t(`role.${user.role}`, user.role)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </span>
                    {user.telephone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {user.telephone}
                      </span>
                    ) : null}
                    {user.department?.nom_dept ? (
                      <span>{user.department.nom_dept}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModal({ open: true, mode: 'edit', user })}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t('crud.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                  onClick={() => setDeleteTarget(user)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('crud.delete')}
                </Button>
              </div>
            </motion.div>
            )
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal.open ? (
          <UserFormModal
            open={modal.open}
            mode={modal.mode}
            initialUser={modal.user}
            departments={departments}
            onClose={() => setModal({ open: false, mode: 'create', user: null })}
            onSaved={loadData}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('users.deleteConfirm')}
        message={
          deleteTarget
            ? `${getUserDisplayName(deleteTarget)} (@${deleteTarget.username})`
            : ''
        }
        loading={deleting}
      />
    </div>
  )
}
