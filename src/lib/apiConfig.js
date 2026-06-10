const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT ?? '8000'
const FALLBACK_API_BASE_URL = `http://127.0.0.1:${DEFAULT_API_PORT}`

function useDevOriginProxy() {
  return import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL
}

/**
 * API base URL for REST and media.
 * - Dev (no VITE_API_BASE_URL): same origin — Vite proxies /api and /media to Django (HTTPS + mic on LAN).
 * - VITE_API_BASE_URL set: explicit backend URL.
 * - Production: same hostname as the page on the API port.
 */
export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured) {
    return String(configured).replace(/\/$/, '')
  }

  if (useDevOriginProxy() && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    return `${protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`
  }

  return FALLBACK_API_BASE_URL
}

export const API_BASE_URL = getApiBaseUrl()

export function useDevWebSocketProxy() {
  return useDevOriginProxy()
}
