import i18n from '../../i18n'

export function normalizeListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

export function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'object') {
    if (value.username) {
      return value.username
    }

    if (value.nom_complet) {
      return value.nom_complet
    }

    if (value.nom_dept) {
      return value.nom_dept
    }

    if (value.numero_serie) {
      return value.numero_serie
    }

    if (value.nom) {
      return value.nom
    }

    if (value.id) {
      return `#${value.id}`
    }

    return JSON.stringify(value)
  }

  if (typeof value === 'boolean') {
    return value ? i18n.t('Yes') : i18n.t('No')
  }

  if (typeof value === 'string') {
    const statusKey = `status.${value}`
    if (i18n.exists(statusKey)) return i18n.t(statusKey)
    const prioriteKey = `priorite.${value}`
    if (i18n.exists(prioriteKey)) return i18n.t(prioriteKey)

    const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (isoDateTimeRegex.test(value)) {
      const d = new Date(value.replace(' ', 'T'));
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '');
      }
    }

    if (isoDateRegex.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }
  }

  return String(value)
}

export function toInputValue(value, type) {
  if (value === null || value === undefined) {
    return ''
  }

  if (type === 'json') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }

  if (type === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (type === 'date') {
    const dateValue = new Date(value)
    if (Number.isNaN(dateValue.getTime())) {
      return ''
    }

    return dateValue.toISOString().slice(0, 10)
  }

  if (typeof value === 'object' && value !== null) {
    if (value.id !== undefined && value.id !== null) {
      return String(value.id)
    }

    return ''
  }

  return String(value)
}

export function coercePayloadValue(rawValue, fieldType) {
  if (rawValue === '' || rawValue === undefined) {
    return null
  }

  if (fieldType === 'json') {
    if (typeof rawValue !== 'string') {
      return rawValue
    }

    try {
      return JSON.parse(rawValue)
    } catch {
      return null
    }
  }

  if (fieldType === 'number') {
    const parsed = Number(rawValue)
    return Number.isNaN(parsed) ? null : parsed
  }

  if (fieldType === 'boolean') {
    if (rawValue === 'true' || rawValue === true) {
      return true
    }

    if (rawValue === 'false' || rawValue === false) {
      return false
    }

    return null
  }

  if (fieldType === 'lookup') {
    const id = Number(rawValue)
    return Number.isNaN(id) ? null : id
  }

  return rawValue
}
