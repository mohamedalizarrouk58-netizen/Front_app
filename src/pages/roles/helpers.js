import i18n from '../../i18n'

export function displayRoleValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? i18n.t('Yes') : i18n.t('No')
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

    if (value.nom) {
      return value.nom
    }

    if (value.numero_serie) {
      return value.numero_serie
    }

    if (value.id) {
      return `#${value.id}`
    }

    return JSON.stringify(value)
  }

  if (typeof value === 'string') {
    if (value === 'refuse') return 'Non résolu'
    if (value === 'termine') return 'Terminé'
    if (value === 'en_cours') return 'En cours'
    if (value === 'en_attente') return 'En attente'

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
