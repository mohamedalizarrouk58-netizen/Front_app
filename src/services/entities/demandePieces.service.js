import { createCrudService } from './crudService'
import { api } from '../../lib/api'

const baseCrud = createCrudService('/api/demande-pieces/')

const demandePiecesService = {
  ...baseCrud,
  assignerFournisseur: async (id, fournisseurId) => {
    const response = await api.post(`/api/demande-pieces/${id}/assigner-fournisseur/`, { fournisseur_id: fournisseurId })
    return response.data
  },
  reponseFournisseur: async (id, decision, payload = {}) => {
    const response = await api.post(`/api/demande-pieces/${id}/reponse-fournisseur/`, { decision, ...payload })
    return response.data
  },
  receptionLivraison: async (id, payload) => {
    const response = await api.post(`/api/demande-pieces/${id}/reception-livraison/`, payload)
    return response.data
  },
  livrerStock: async (id) => {
    const response = await api.post(`/api/demande-pieces/${id}/livrer-stock/`)
    return response.data
  }
}

export default demandePiecesService
