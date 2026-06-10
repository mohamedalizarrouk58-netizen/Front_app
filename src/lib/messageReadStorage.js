const KEY_PREFIX = 'gmao_messages_read_'

export function loadReadMap(userId) {
  if (!userId) {
    return {}
  }

  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveReadMap(userId, map) {
  if (!userId) {
    return
  }
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(map))
}
