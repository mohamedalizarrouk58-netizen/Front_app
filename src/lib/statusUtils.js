import { DEMANDE_PIECE_STATUTS } from './domainConstants'

export const DEMANDE_PIECE_STATUS_STYLES = {
  demandee: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300',
  hors_stock: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300',
  en_attente_fournisseur: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300',
  acceptee_fournisseur: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300',
  refusee_fournisseur: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300',
  reaffectee: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300',
  commandee: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300',
  livree: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300',
  annulee: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
}

export function getDemandePieceStatusStyle(statut) {
  return DEMANDE_PIECE_STATUS_STYLES[statut] || 'bg-slate-50 text-slate-600 border-slate-200'
}

export function formatStatusLabel(statut, t) {
  if (!statut) return '—'
  const key = `status.${statut}`
  const translated = t?.(key)
  if (translated && translated !== key) return translated
  return statut.replace(/_/g, ' ')
}

export function isValidDemandePieceStatut(statut) {
  return DEMANDE_PIECE_STATUTS.includes(statut)
}
