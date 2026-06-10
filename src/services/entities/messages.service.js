import { api } from '../../lib/api'
import { createCrudService } from './crudService'

const endpoint = '/api/messages/'
const baseService = createCrudService(endpoint)

const messagesService = {
  ...baseService,

  async createWithFile(formData) {
    const response = await api.post(endpoint, formData)
    return response.data
  },
}

export default messagesService
