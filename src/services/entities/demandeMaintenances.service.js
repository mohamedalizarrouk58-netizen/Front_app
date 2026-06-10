import { createCrudService, parseListResponse } from './crudService'
import { api } from '../../lib/api'

const demandeMaintenancesService = createCrudService('/api/demande-maintenances/')

demandeMaintenancesService.envoyerFactureClient = async function envoyerFactureClient(id) {
	const response = await api.post(`/api/demande-maintenances/${id}/envoyer-facture-client/`)
	return response.data
}

demandeMaintenancesService.listMine = async function listMyDemandes(params) {
	const response = await api.get('/api/demande-maintenances/me/', { params })
	return parseListResponse(response.data)
}

export default demandeMaintenancesService
