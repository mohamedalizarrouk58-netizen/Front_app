import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const facturesService = createCrudService('/api/factures/')

facturesService.envoyerEmailClient = async function envoyerEmailClient(id) {
  const response = await api.post(`/api/factures/${id}/envoyer-email-client/`)
  return response.data
}

export default facturesService
