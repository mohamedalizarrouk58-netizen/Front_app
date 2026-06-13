import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const ficheReparationsService = createCrudService('/api/fiche-reparations/')

ficheReparationsService.genererFacture = async function genererFacture(id) {
  const response = await api.post(`/api/fiche-reparations/${id}/generer-facture/`)
  return response.data
}

export default ficheReparationsService
