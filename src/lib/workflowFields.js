/** Fields driven by workflow actions — never sent from create/edit forms unless an explicit action sets them. */
export const WORKFLOW_MANAGED_FIELDS = ['statut', 'statut_stock', 'est_payee']

export function stripWorkflowFields(payload) {
  const result = { ...payload }
  for (const key of WORKFLOW_MANAGED_FIELDS) {
    delete result[key]
  }
  return result
}
