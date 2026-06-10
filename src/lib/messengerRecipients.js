export function getAvailableRecipients(users, currentUserId) {
  return users.filter((user) => {
    if (!currentUserId) {
      return true
    }
    return Number(user?.id) !== currentUserId
  })
}

export function getNewConversationRecipients(availableRecipients, conversations) {
  const existingUserIds = new Set(
    conversations
      .map((conversation) => Number(conversation.party?.id))
      .filter((id) => Number.isInteger(id) && id > 0),
  )

  return availableRecipients.filter((user) => {
    const id = Number(user.id)
    return Number.isInteger(id) && id > 0 && !existingUserIds.has(id)
  })
}

export function filterRecipientsByQuery(recipients, searchQuery) {
  const token = String(searchQuery || '').trim().toLowerCase()
  if (!token) {
    return recipients
  }

  return recipients.filter((user) => {
    const name = String(user.username || user.nom || user.name || '').toLowerCase()
    const role = String(user.role || '').toLowerCase()
    return name.includes(token) || role.includes(token)
  })
}

export function getUserDisplayName(user, fallback = 'Unknown user') {
  return String(user?.username || user?.nom || user?.name || fallback).trim() || fallback
}
