import { createCrudService } from './crudService'

const messagesService = createCrudService('/api/messages/')

export default messagesService
