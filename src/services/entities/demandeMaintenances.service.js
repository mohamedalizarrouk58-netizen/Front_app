import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const demandeMaintenancesService = createCrudService('/api/demande-maintenances/')

demandeMaintenancesService.listMine = async function listMyDemandes(params) {
	const response = await api.get('/api/demande-maintenances/me/', { params })
	const payload = response.data

	if (Array.isArray(payload)) {
		return payload
	}

	if (Array.isArray(payload?.results)) {
		return payload.results
	}

	return []
}

export default demandeMaintenancesService
