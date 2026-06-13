import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, FileText, Receipt, Users, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { entityServices } from '../../services/entities'
import { parseListResponse } from '../../services/entities/crudService'
import { extractApiErrorMessage } from '../../lib/api'

function AdminOverviewPage() {
  const { t } = useTranslation()
  const [counts, setCounts] = useState({
    users: 0,
    demandes: 0,
    interventions: 0,
    factures: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, demandesRes, interventionsRes, facturesRes] = await Promise.allSettled([
        entityServices.users.list(),
        entityServices['demande-maintenances'].list(),
        entityServices.interventions.list(),
        entityServices.factures.list(),
      ])

      const getCount = (res) => {
        if (res.status !== 'fulfilled') return 0
        return parseListResponse(res.value).count
      }

      setCounts({
        users: getCount(usersRes),
        demandes: getCount(demandesRes),
        interventions: getCount(interventionsRes),
        factures: getCount(facturesRes),
      })
    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const kpiData = [
    { title: t('User'), count: counts.users, icon: Users },
    { title: t('dashboard.pendingDemandes'), count: counts.demandes, icon: ClipboardList },
    { title: t('nav.modules'), count: counts.interventions, icon: FileText },
    { title: t('dashboard.totalRecords'), count: counts.factures, icon: Receipt },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('Dashboard')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.adminSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('crud.refresh')}
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-[#1ea0d6]" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? '…' : kpi.count}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default AdminOverviewPage
