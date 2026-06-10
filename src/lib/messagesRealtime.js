import { API_BASE_URL, useDevWebSocketProxy } from './apiConfig'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? ''

function deriveWsBaseUrl() {
  if (WS_BASE_URL) {
    return WS_BASE_URL.replace(/\/$/, '')
  }

  if (useDevWebSocketProxy() && typeof window !== 'undefined' && window.location?.host) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${window.location.host}`
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

function createSocketConnection(token, dispatch) {
  const url = buildMessagesSocketUrl(token)
  if (!url) {
    return null
  }

  const socket = new WebSocket(url)
  let closedByClient = false

  socket.onopen = () => {
    dispatch({ type: 'open' })
  }

  socket.onclose = () => {
    if (!closedByClient) {
      dispatch({ type: 'close' })
    }
  }

  socket.onerror = () => {
    if (!closedByClient) {
      dispatch({ type: 'error' })
    }
  }

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      dispatch({ type: 'message', payload })
    } catch {
      dispatch({ type: 'message', payload: null })
    }
  }

  socket.closeConnection = () => {
    closedByClient = true
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close()
    }
  }

  return socket
}

/** Shared socket survives React StrictMode remounts in development. */
let sharedSocket = null
let sharedToken = ''
let subscriberCount = 0
let disconnectTimer = null
const subscribers = new Set()

function dispatchSocketEvent(event) {
  subscribers.forEach((callbacks) => {
    if (event.type === 'open') {
      callbacks.onOpen?.()
    } else if (event.type === 'close') {
      callbacks.onClose?.()
    } else if (event.type === 'error') {
      callbacks.onError?.()
    } else if (event.type === 'message') {
      callbacks.onMessage?.(event.payload)
    }
  })
}

function ensureSharedSocket(token) {
  if (!token) {
    return null
  }

  if (
    sharedSocket &&
    sharedToken === token &&
    (sharedSocket.readyState === WebSocket.CONNECTING || sharedSocket.readyState === WebSocket.OPEN)
  ) {
    return sharedSocket
  }

  if (sharedSocket) {
    sharedSocket.closeConnection()
    sharedSocket = null
  }

  sharedToken = token
  sharedSocket = createSocketConnection(token, dispatchSocketEvent)
  return sharedSocket
}

function scheduleSharedDisconnect() {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer)
  }

  disconnectTimer = setTimeout(() => {
    if (subscriberCount === 0 && sharedSocket) {
      sharedSocket.closeConnection()
      sharedSocket = null
      sharedToken = ''
    }
  }, 300)
}

export function subscribeMessagesSocket(token, callbacks = {}) {
  subscriberCount += 1
  if (disconnectTimer) {
    clearTimeout(disconnectTimer)
    disconnectTimer = null
  }

  subscribers.add(callbacks)
  const socket = ensureSharedSocket(token)

  if (socket?.readyState === WebSocket.OPEN) {
    callbacks.onOpen?.()
  }

  return () => {
    subscribers.delete(callbacks)
    subscriberCount = Math.max(0, subscriberCount - 1)
    scheduleSharedDisconnect()
  }
}

export function getMessagesSocket() {
  return sharedSocket
}

/** @deprecated Use subscribeMessagesSocket — kept for direct tests. */
export function connectMessagesSocket(token, callbacks = {}) {
  return createSocketConnection(token, (event) => {
    if (event.type === 'open') callbacks.onOpen?.()
    if (event.type === 'close') callbacks.onClose?.()
    if (event.type === 'error') callbacks.onError?.()
    if (event.type === 'message') callbacks.onMessage?.(event.payload)
  })
}
