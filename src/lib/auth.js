import { jwtDecode } from 'jwt-decode'
import { api, extractApiErrorMessage } from './api'

const AUTH_STORAGE_KEY = 'gestionmt_auth'

export const ROLE_ROUTES = {
  administrateur: '/admin',
  admin: '/admin',
  manager: '/manager',
  technicien: '/technicien',
  chefstock: '/chefstock',
  receptioniste: '/receptioniste',
  fournisseur: '/fournisseur',
}

const ROLE_ALIAS = {
  administrateur: 'admin',
  admin: 'admin',
  administrator: 'admin',
  manager: 'manager',
  technicien: 'technicien',
  technician: 'technicien',
  chefstock: 'chefstock',
  chefdestock: 'chefstock',
  stockmanager: 'chefstock',
  receptioniste: 'receptioniste',
  receptionist: 'receptioniste',
  fournisseur: 'fournisseur',
  supplier: 'fournisseur',
}

export function normalizeRole(value) {
  if (!value) {
    return ''
  }

  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^role[_:-]?/, '')
    .replace(/[\s_-]+/g, '')

  return ROLE_ALIAS[cleaned] ?? ''
}

export function decodeToken(token) {
  try {
    return jwtDecode(token)
  } catch {
    return null
  }
}

export function extractRoleFromPayload(payload) {
  if (!payload) {
    return ''
  }

  const candidates = [
    payload.role,
    payload.user_role,
    payload.user?.role,
    payload.roles?.[0],
    payload.authorities?.[0],
    payload.groups?.[0],
  ]

  for (const candidate of candidates) {
    const role = normalizeRole(candidate)
    if (role) {
      return role
    }
  }

  return ''
}

export function extractUserIdFromPayload(payload) {
  if (!payload) {
    return null
  }

  const candidates = [
    payload.user_id,
    payload.userId,
    payload.id,
    payload.sub,
    payload.user?.id,
  ]

  for (const candidate of candidates) {
    const userId = Number(candidate)
    if (Number.isInteger(userId) && userId > 0) {
      return userId
    }
  }

  return null
}

function getAuthHeaders(accessToken) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    skipAuth: true,
  }
}

function readRoleFromUserRecord(userRecord) {
  return normalizeRole(userRecord?.role)
}

function normalizeUserCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

function inferRoleFromUsername(username) {
  if (!username) {
    return ''
  }

  const normalized = normalizeRole(username)
  if (normalized) {
    return normalized
  }

  const compact = String(username)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (compact.includes('administrateur') || compact.includes('admin')) {
    return 'admin'
  }

  if (compact.includes('manager')) {
    return 'manager'
  }

  if (compact.includes('technicien') || compact.includes('technician')) {
    return 'technicien'
  }

  if (compact.includes('chefstock') || compact.includes('stock')) {
    return 'chefstock'
  }

  if (compact.includes('receptioniste') || compact.includes('reception')) {
    return 'receptioniste'
  }

  return ''
}

async function fetchUserById(accessToken, userId) {
  if (!accessToken || !userId) {
    return null
  }

  try {
    const response = await api.get(`/api/users/${userId}/`, getAuthHeaders(accessToken))
    return response.data ?? null
  } catch {
    return null
  }
}

async function fetchCurrentUser(accessToken) {
  if (!accessToken) {
    return null
  }

  try {
    const response = await api.get('/api/users/me/', getAuthHeaders(accessToken))
    return response.data ?? null
  } catch {
    return null
  }
}

async function fetchUsers(accessToken, params) {
  if (!accessToken) {
    return []
  }

  try {
    const response = await api.get('/api/users/', {
      ...getAuthHeaders(accessToken),
      params,
    })

    return normalizeUserCollection(response.data)
  } catch {
    return []
  }
}

export function getStoredAuth() {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue)

    if (parsed?.userId && parsed?.role) {
      return parsed
    }

    const decodedAccess = decodeToken(parsed?.access)
    const derivedUserId = extractUserIdFromPayload(decodedAccess)
    const derivedRole = normalizeRole(parsed?.role) || extractRoleFromPayload(decodedAccess)

    if (!derivedUserId && !derivedRole) {
      return parsed
    }

    const enrichedAuth = {
      ...parsed,
      userId: parsed?.userId ?? derivedUserId,
      role: parsed?.role ?? derivedRole,
    }

    storeAuth(enrichedAuth)
    return enrichedAuth
  } catch {
    return null
  }
}

export function storeAuth(authPayload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getRouteForRole(role) {
  const normalizedRole = normalizeRole(role)
  return ROLE_ROUTES[normalizedRole] ?? '/login'
}

export function getProfilePath(role) {
  const base = getRouteForRole(role)
  if (!base || base === '/login') {
    return '/login'
  }
  return `${base.replace(/\/$/, '')}/profile`
}

export function isAuthValid(auth) {
  if (!auth?.access || !auth?.role) {
    return false
  }

  if (!auth.exp) {
    return true
  }

  return Date.now() < auth.exp * 1000
}

async function resolveRoleFromApi(accessToken, userId, username) {
  const userById = await fetchUserById(accessToken, userId)
  const roleFromUserById = readRoleFromUserRecord(userById)
  if (roleFromUserById) {
    return roleFromUserById
  }

  const currentUser = await fetchCurrentUser(accessToken)
  const roleFromMe = readRoleFromUserRecord(currentUser)
  if (roleFromMe) {
    return roleFromMe
  }

  const listedUsersByFilter = await fetchUsers(accessToken, { username })
  const matchedFilteredUser = listedUsersByFilter.find((user) => {
    const sameId = userId && Number(user?.id) === Number(userId)
    const sameUsername =
      username &&
      String(user?.username ?? '').toLowerCase() === String(username).toLowerCase()

    return sameId || sameUsername
  })

  const roleFromFilteredUser = readRoleFromUserRecord(matchedFilteredUser)
  if (roleFromFilteredUser) {
    return roleFromFilteredUser
  }

  const listedUsers = listedUsersByFilter.length
    ? listedUsersByFilter
    : await fetchUsers(accessToken)

  const matchedUser = listedUsers.find((user) => {
    const sameId = userId && Number(user?.id) === Number(userId)
    const sameUsername =
      username &&
      String(user?.username ?? '').toLowerCase() === String(username).toLowerCase()

    return sameId || sameUsername
  })

  const roleFromList = readRoleFromUserRecord(matchedUser)
  if (roleFromList) {
    return roleFromList
  }

  return inferRoleFromUsername(username)
}

export async function loginWithCredentials({ username, password }) {
  let payload = {}

  try {
    const response = await api.post('/api/token/', {
      username,
      password,
    }, {
      skipAuth: true,
    })

    payload = response.data ?? {}
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Invalid username or password.'))
  }

  if (!payload.access || !payload.refresh) {
    throw new Error('Token response is incomplete.')
  }

  const decodedAccess = decodeToken(payload.access)
  const userId = extractUserIdFromPayload(decodedAccess)
  let role = extractRoleFromPayload(decodedAccess)

  if (!role) {
    role = await resolveRoleFromApi(payload.access, userId, username)
  }

  if (!role || !ROLE_ROUTES[role]) {
    throw new Error('Login succeeded but user role is missing or unsupported.')
  }

  const authData = {
    access: payload.access,
    refresh: payload.refresh,
    role,
    username,
    userId,
    exp: decodedAccess?.exp ?? null,
  }

  storeAuth(authData)
  return authData
}

export async function registerUser({ username, password, email, role, telephone, first_name, last_name }) {
  try {
    const response = await api.post('/api/users/register/', {
      username,
      password,
      email,
      role,
      telephone,
      first_name,
      last_name,
    }, {
      skipAuth: true,
    })
    return response.data
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Registration failed.'))
  }
}

// ===== OTP / EMAIL AUTH =====

export async function sendOtp({ email, purpose }) {
  try {
    const response = await api.post('/api/auth/send-otp/', { email, purpose }, { skipAuth: true })
    return response.data
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Impossible d\'envoyer le code.'))
  }
}

export async function resetPassword({ email, code, new_password }) {
  try {
    const response = await api.post('/api/auth/reset-password/', { email, code, new_password }, { skipAuth: true })
    return response.data
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Réinitialisation échouée.'))
  }
}

export async function send2faOtpForLogin({ username, password }) {
  try {
    const response = await api.post('/api/auth/send-2fa-otp/', { username, password }, { skipAuth: true })
    return response.data  // { requires_2fa, email_hint? } or { access, refresh, role, username }
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Identifiants invalides.'))
  }
}

export async function loginWith2fa({ username, code }) {
  try {
    const response = await api.post('/api/auth/login-2fa/', { username, code }, { skipAuth: true })
    return response.data  // { access, refresh, role, username }
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Code invalide ou expiré.'))
  }
}

export async function toggle2fa(enabled) {
  try {
    const response = await api.post('/api/auth/toggle-2fa/', { enabled })
    return response.data
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, 'Impossible de modifier le paramètre 2FA.'))
  }
}

export async function get2faStatus() {
  try {
    const response = await api.get('/api/auth/2fa-status/')
    return response.data  // { two_factor_enabled: bool }
  } catch {
    return { two_factor_enabled: false }
  }
}
