export const MAX_PROFILE_IMAGE_BYTES = 20 * 1024 * 1024

export function getUserAvatarSrc(imageValue, fallbackName = '') {
  if (imageValue && typeof imageValue === 'string' && imageValue.trim()) {
    const trimmed = imageValue.trim()
    if (trimmed.startsWith('data:image')) {
      return trimmed
    }
    return `data:image/png;base64,${trimmed}`
  }

  return null
}

export function getUserDisplayName(user) {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  return full || user?.username || 'User'
}

export function getUserInitials(user) {
  const name = getUserDisplayName(user)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function fileToBase64DataUrl(file, maxBytes = MAX_PROFILE_IMAGE_BYTES) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('')
      return
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are allowed.'))
      return
    }

    if (file.size > maxBytes) {
      reject(new Error('Image must be 20 MB or smaller.'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}
