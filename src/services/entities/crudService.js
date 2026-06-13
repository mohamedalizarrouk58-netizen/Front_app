import { api } from '../../lib/api'

export const DEFAULT_PAGE_SIZE = 25

export function parseListResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
    }
  }

  // Already normalized by createCrudService.list()
  if (payload && Array.isArray(payload.items)) {
    return {
      items: payload.items,
      count: Number(payload.count ?? payload.items.length),
      next: payload.next ?? null,
      previous: payload.previous ?? null,
    }
  }

  const items = Array.isArray(payload?.results) ? payload.results : []

  return {
    items,
    count: Number(payload?.count ?? items.length),
    next: payload?.next ?? null,
    previous: payload?.previous ?? null,
  }
}

/** @deprecated Use list() which returns { items, count } or listAll() for full datasets. */
export function normalizeListPayload(payload) {
  return parseListResponse(payload).items
}

export function createCrudService(endpoint) {
  return {
    endpoint,

    async list(params = {}) {
      const response = await api.get(endpoint, { params })
      return parseListResponse(response.data)
    },

    async listAll(params = {}, options = {}) {
      const pageSize = options.pageSize ?? 100
      const maxPages = options.maxPages ?? 50
      let page = 1
      let allItems = []
      let total = 0

      while (page <= maxPages) {
        const { items, count, next } = await this.list({
          ...params,
          page,
          page_size: pageSize,
        })
        total = count || allItems.length + items.length
        allItems = allItems.concat(items)
        if (!next || items.length === 0) {
          break
        }
        page += 1
      }

      return allItems
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
