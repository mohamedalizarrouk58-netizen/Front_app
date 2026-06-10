import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const usersService = createCrudService('/api/users/')

usersService.getCurrent = async function getCurrentUser() {
	const response = await api.get('/api/users/me/')
	return response.data
}

usersService.updateMe = async function updateCurrentUser(payload) {
	const response = await api.patch('/api/users/me/', payload)
	return response.data
}

export default usersService
