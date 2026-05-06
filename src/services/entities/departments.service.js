import { createCrudService } from './crudService'

const departmentsService = createCrudService('/api/departments/')

export default departmentsService
