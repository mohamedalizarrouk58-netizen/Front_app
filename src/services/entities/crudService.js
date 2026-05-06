import { api } from '../../lib/api'

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

export function createCrudService(endpoint) {
  return {
    endpoint,

    async list(params) {
      const response = await api.get(endpoint, { params })
      return normalizeListPayload(response.data)
    },

    async retrieve(id) {
      const response = await api.get(`${endpoint}${id}/`)
      return response.data
    },

    async create(payload) {
      const response = await api.post(endpoint, payload)
      return response.data
    },

    async update(id, payload) {
      const response = await api.patch(`${endpoint}${id}/`, payload)
      return response.data
    },

    async remove(id) {
      const response = await api.delete(`${endpoint}${id}/`)
      return response.data
    },
  }
}
