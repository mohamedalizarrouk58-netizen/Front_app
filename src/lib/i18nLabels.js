import i18n from '../i18n'

export function tStatus(value) {
  if (!value) return '-'
  const key = `status.${value}`
  return i18n.exists(key) ? i18n.t(key) : String(value)
}

export function tPriority(value) {
  if (!value) return '-'
  const key = `priorite.${value}`
  return i18n.exists(key) ? i18n.t(key) : String(value)
}

export function tColumn(column) {
  if (!column) return '-'
  const key = `columns.${column}`
  return i18n.exists(key) ? i18n.t(key) : column.replace(/_/g, ' ')
}

export function tEntity(key) {
  return i18n.t(`entities.${key}`, { defaultValue: key })
}

export function tModule(key) {
  return i18n.t(`modules.${key}`, { defaultValue: key })
}

export function tWorkspace(role) {
  return i18n.t(`workspace.${role}.title`, { defaultValue: role })
}
