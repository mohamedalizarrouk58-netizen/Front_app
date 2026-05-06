const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? ''

function deriveWsBaseUrl() {
  if (WS_BASE_URL) {
    return WS_BASE_URL.replace(/\/$/, '')
  }

  try {
    const parsed = new URL(API_BASE_URL)
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${parsed.host}`
  } catch {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }
}

export function buildMessagesSocketUrl(token) {
  if (!token) {
    return ''
  }

  const wsBase = deriveWsBaseUrl()
  const encodedToken = encodeURIComponent(token)
  return `${wsBase}/ws/messages/?token=${encodedToken}`
}

export function connectMessagesSocket(token, callbacks = {}) {
  const url = buildMessagesSocketUrl(token)
  if (!url) {
    return null
  }

  const socket = new WebSocket(url)

  socket.onopen = () => {
    callbacks.onOpen?.()
  }

  socket.onclose = () => {
    callbacks.onClose?.()
  }

  socket.onerror = () => {
    callbacks.onError?.()
  }

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      callbacks.onMessage?.(payload)
    } catch {
      callbacks.onMessage?.(null)
    }
  }

  return socket
}
