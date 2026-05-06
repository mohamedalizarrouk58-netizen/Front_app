import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const interventionsService = createCrudService('/api/interventions/')

interventionsService.listMine = async function listMyInterventions(params) {
	const response = await api.get('/api/interventions/me/', { params })
	const payload = response.data

	if (Array.isArray(payload)) {
		return payload
	}

	if (Array.isArray(payload?.results)) {
		return payload.results
	}

	return []
}

export default interventionsService
