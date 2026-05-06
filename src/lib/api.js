import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const AUTH_STORAGE_KEY = 'gestionmt_auth'

function getAccessTokenFromStorage() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return ''
    }

    const parsed = JSON.parse(raw)
    return parsed?.access ?? ''
  } catch {
    return ''
  }
}

function isAuthEndpoint(url = '') {
  return /\/api\/token\/?$/.test(url) || /\/api\/token\/refresh\/?$/.test(url)
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const shouldSkipAuth = config.skipAuth || isAuthEndpoint(config.url)

  if (shouldSkipAuth) {
    return config
  }

  const token = getAccessTokenFromStorage()
  if (!token) {
    return config
  }

  config.headers = config.headers ?? {}

  if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function extractApiErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (typeof data === 'string' && data.trim()) {
      return data
    }

    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message
    }

    if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
      return String(data.non_field_errors[0])
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
