import { createCrudService, parseListResponse } from './crudService'
import { api } from '../../lib/api'

const interventionsService = createCrudService('/api/interventions/')

interventionsService.listMine = async function listMyInterventions(params) {
	const response = await api.get('/api/interventions/me/', { params })
	return parseListResponse(response.data)
}

export default interventionsService
