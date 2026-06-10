/** Canonical values aligned with back_end/users/models.py */

export const USER_ROLES = [
  'admin',
  'manager',
  'technicien',
  'chefstock',
  'receptioniste',
  'fournisseur',
]

export const DEMANDE_MAINTENANCE_STATUTS = [
  'en_attente',
  'en_cours',
  'termine',
  'refuse',
]

export const INTERVENTION_STATUTS = [
  'en_attente',
  'en_cours',
  'termine',
  'refuse',
]

export const DEMANDE_PIECE_STATUTS = [
  'demandee',
  'hors_stock',
  'en_attente_fournisseur',
  'acceptee_fournisseur',
  'refusee_fournisseur',
  'reaffectee',
  'commandee',
  'livree',
  'annulee',
]

export const PIECE_STATUTS_STOCK = [
  'en_stock',
  'stock_faible',
  'hors_stock',
]

export const PRIORITES = ['faible', 'moyenne', 'haute']

export const PAIEMENT_MODES = ['especes', 'cheque', 'virement']

/** Dashboard grouping for DemandePiece charts */
export const DEMANDE_PIECE_DASHBOARD_GROUPS = {
  pending: ['demandee', 'hors_stock', 'en_attente_fournisseur', 'reaffectee'],
  approved: ['acceptee_fournisseur', 'commandee', 'livree'],
  refused: ['refusee_fournisseur', 'annulee'],
}

export function isAdminRole(role) {
  return role === 'admin' || role === 'administrateur'
}
