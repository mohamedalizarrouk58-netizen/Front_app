export function toUserRef(value, usersById = new Map()) {
  if (value && typeof value === 'object') {
    const id = Number(value.id)
    const username = String(value.username ?? value.nom ?? value.name ?? '').trim()
    const role = String(value.role ?? '').trim()

    return {
      id: Number.isInteger(id) && id > 0 ? id : null,
      username,
      role,
      displayName: username || (Number.isInteger(id) && id > 0 ? `User #${id}` : 'Unknown user'),
    }
  }

  const id = Number(value)
  if (Number.isInteger(id) && id > 0) {
    const fromUsers = usersById.get(id)

    if (fromUsers) {
      return {
        id,
        username: String(fromUsers.username ?? '').trim(),
        role: String(fromUsers.role ?? '').trim(),
        displayName: String(fromUsers.username ?? '').trim() || `User #${id}`,
      }
    }

    return {
      id,
      username: '',
      role: '',
      displayName: `User #${id}`,
    }
  }

  return {
    id: null,
    username: String(value ?? '').trim(),
    role: '',
    displayName: String(value ?? '').trim() || 'Unknown user',
  }
}

export function toConversationKey(userRef) {
  if (userRef?.id) {
    return `user:${userRef.id}`
  }

  const fallback = String(userRef?.username ?? userRef?.displayName ?? 'unknown')
    .trim()
    .toLowerCase()

  return `name:${fallback || 'unknown'}`
}

export function parseTimestamp(value) {
  const stamp = Date.parse(value ?? '')
  return Number.isFinite(stamp) ? stamp : 0
}

export function formatMessageTime(value) {
  const stamp = parseTimestamp(value)
  if (!stamp) {
    return '--:--'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp)
}

export function formatConversationTime(value) {
  const stamp = parseTimestamp(value)
  if (!stamp) {
    return ''
  }

  const now = new Date()
  const date = new Date(stamp)
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return formatMessageTime(value)
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function isMessageFromCurrentUser(message, currentUserId, currentUsername) {
  const senderRef = toUserRef(message?.expediteur)

  if (currentUserId && senderRef.id) {
    return senderRef.id === currentUserId
  }

  if (currentUsername) {
    return senderRef.username.toLowerCase() === currentUsername
  }

  return false
}

export function resolveOtherParty(message, currentUserId, currentUsername, usersById) {
  const sender = toUserRef(message?.expediteur, usersById)
  const recipient = toUserRef(message?.destinataire, usersById)

  const senderIsCurrent =
    (currentUserId && sender.id && sender.id === currentUserId) ||
    (currentUsername && sender.username.toLowerCase() === currentUsername)

  if (senderIsCurrent) {
    return recipient
  }

  return sender
}

export function isMessageDeleted(message) {
  return Boolean(message?.is_deleted)
}

export function normalizeMessageRecord(message) {
  if (!message) {
    return message
  }

  const deleted = isMessageDeleted(message)
  const fichierUrl = deleted ? null : resolveMediaUrl(message.fichier_url || message.fichier)

  return {
    ...message,
    type_message: deleted ? 'text' : message.type_message || 'text',
    contenu: deleted ? '' : message.contenu,
    fichier_url: deleted ? null : fichierUrl || message.fichier_url || null,
    fichier_name: deleted ? null : message.fichier_name || null,
    is_deleted: deleted,
  }
}

export function removeMessageById(previousRows, messageId) {
  const id = Number(messageId)
  if (!Number.isInteger(id) || id <= 0) {
    return previousRows
  }
  return previousRows.filter((item) => Number(item?.id) !== id)
}

export function upsertMessage(previousRows, message) {
  const normalized = normalizeMessageRecord(message)

  if (!normalized?.id) {
    return [normalized, ...previousRows]
  }

  const existingIndex = previousRows.findIndex((item) => item.id === normalized.id)
  if (existingIndex >= 0) {
    const next = [...previousRows]
    const previous = next[existingIndex]
    const mergedDeleted = normalized.is_deleted || previous.is_deleted
    next[existingIndex] = {
      ...previous,
      ...normalized,
      is_deleted: mergedDeleted,
      contenu: mergedDeleted ? '' : normalized.contenu ?? previous.contenu,
      fichier_url: mergedDeleted
        ? null
        : normalized.fichier_url || previous.fichier_url,
      fichier_name: mergedDeleted
        ? null
        : normalized.fichier_name || previous.fichier_name,
      type_message: mergedDeleted
        ? 'text'
        : normalized.type_message || previous.type_message,
    }
    return next
  }

  return [normalized, ...previousRows]
}

export function getMessageType(message) {
  return message?.type_message || 'text'
}

import { API_BASE_URL } from './apiConfig'

export function resolveMediaUrl(url) {
  if (!url) {
    return null
  }

  const value = String(url).trim()
  if (!value) {
    return null
  }

  if (value.startsWith('blob:') || value.startsWith('data:')) {
    return value
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value)
      const pageOrigin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : null

      // HTTPS page + HTTP media URL → mixed content blocked; route via Vite /media proxy.
      if (
        pageOrigin &&
        window.location.protocol === 'https:' &&
        parsed.protocol === 'http:' &&
        parsed.pathname.startsWith('/media/')
      ) {
        return `${pageOrigin}${parsed.pathname}${parsed.search}`
      }

      const isLoopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
      if (
        isLoopback &&
        typeof window !== 'undefined' &&
        window.location?.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        if (window.location.protocol === 'https:' && pageOrigin) {
          return `${pageOrigin}${parsed.pathname}${parsed.search}`
        }
        const port = parsed.port || '8000'
        return `${parsed.protocol}//${window.location.hostname}:${port}${parsed.pathname}${parsed.search}`
      }
    } catch {
      // Keep original URL.
    }
    return value
  }

  const base = API_BASE_URL.replace(/\/$/, '')
  return `${base}${value.startsWith('/') ? value : `/${value}`}`
}

export function getMessageMediaUrl(message) {
  return resolveMediaUrl(message?.fichier_url || message?.fichier)
}

export function getMessagePreview(message, t) {
  if (isMessageDeleted(message)) {
    return t?.('messages.deleted') ?? 'Message deleted'
  }

  const type = getMessageType(message)

  if (type === 'image') {
    return t?.('messages.photoPreview') ?? 'Photo'
  }

  if (type === 'audio') {
    return t?.('messages.voicePreview') ?? 'Voice message'
  }

  if (type === 'file') {
    const name = String(message?.fichier_name || '').trim()
    return name || (t?.('messages.filePreview') ?? 'Attachment')
  }

  return String(message?.contenu ?? '').trim()
}

export function buildConversations(rows, currentUserId, currentUsername, usersById) {
  const buckets = new Map()
  const seenMessageIds = new Set()

  for (const message of rows) {
    const messageId = Number(message?.id)
    if (Number.isInteger(messageId) && messageId > 0) {
      if (seenMessageIds.has(messageId)) {
        continue
      }
      seenMessageIds.add(messageId)
    }

    const party = resolveOtherParty(message, currentUserId, currentUsername, usersById)
    const key = toConversationKey(party)

    const previous = buckets.get(key)
    const nextMessages = previous ? [...previous.messages, message] : [message]
    const sorted = nextMessages.sort(
      (a, b) => parseTimestamp(a?.date_envoi) - parseTimestamp(b?.date_envoi),
    )

    buckets.set(key, {
      key,
      party,
      messages: sorted,
      lastMessage: sorted[sorted.length - 1] ?? null,
    })
  }

  return [...buckets.values()].sort(
    (a, b) => parseTimestamp(b?.lastMessage?.date_envoi) - parseTimestamp(a?.lastMessage?.date_envoi),
  )
}
