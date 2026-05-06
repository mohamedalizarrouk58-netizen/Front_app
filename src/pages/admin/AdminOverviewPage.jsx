import { Activity, Bell, RefreshCw, BarChart3 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
} from '../../components/ui/card'
import { ADMIN_DASHBOARD_ENDPOINTS, adminEntityPath } from '../../lib/adminEntities'
import { extractApiErrorMessage } from '../../lib/api'
import { entityServices } from '../../services/entities'

function AdminOverviewPage() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncedAt, setSyncedAt] = useState('')

  const loadCounts = useCallback(async () => {
    setLoading(true)

    const requests = ADMIN_DASHBOARD_ENDPOINTS.map(async (item) => {
      try {
        const service = entityServices[item.serviceKey]
        const rows = service ? await service.list() : []

        return {
          key: item.key,
          count: rows.length,
          error: '',
        }
      } catch (error) {
        return {
          key: item.key,
          count: 0,
          error: extractApiErrorMessage(error, 'Failed to load'),
        }
      }
    })

    const results = await Promise.all(requests)

    const nextCounts = {}
    const nextErrors = {}

    for (const result of results) {
      nextCounts[result.key] = result.count
      nextErrors[result.key] = result.error
    }

    setCounts(nextCounts)
    setErrors(nextErrors)
    setSyncedAt(new Date().toISOString())
    setLoading(false)
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadCounts()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [loadCounts])

  // const metrics = useMemo(() => {
  //   const users = counts.users || 0
  //   const requests = counts['demande-maintenances'] || 0
  //   const interventions = counts.interventions || 0
  //   const factures = counts.factures || 0
  //   const messages = counts.messages || 0

  //   return [
  //     { label: 'Users', value: users },
  //     { label: 'Maintenance Requests', value: requests },
  //     { label: 'Interventions', value: interventions },
  //     { label: 'Factures', value: factures },
  //     { label: 'Messages', value: messages },
  //   ]
  // }, [counts])

  return (
    <div className="space-y-4">
      <header className="glass-panel animate-rise p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Central view of the platform. Use the fixed sidebar to open each entity CRUD page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="bg-white/70 dark:bg-slate-900/70">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Activity className="h-4 w-4" />
          {syncedAt ? `Last sync ${new Date(syncedAt).toLocaleTimeString()}` : 'No sync yet'}
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ADMIN_DASHBOARD_ENDPOINTS.map((item, index) => {
          const Icon = item.icon
          const hasError = Boolean(errors[item.key])

          return (
            <motion.div 
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-white/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden rounded-2xl cursor-pointer"
                onClick={() => navigate(adminEntityPath(item.key))}
              >
                {/* Accent line and background glow */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-80" />
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500 opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity" />
                
                <CardContent className="pt-6 pb-5 relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {item.label}
                      </p>
                      <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Platform Data</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                        {loading ? (
                          <span className="inline-block w-12 h-10 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
                        ) : (
                          counts[item.key] ?? 0
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      {hasError ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-rose-600 dark:text-rose-400">ERROR</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-wider">SYNCED</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                      Admin access only
                    </span>
                    <motion.div 
                      whileHover={{ x: 3 }}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-red-500 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* <Card className="animate-rise delay-1">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Current volume by key operational areas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 dark:bg-slate-800/80 px-3 py-2"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{metric.label}</span>    
              <Badge className="border-[#145f7a]/20 bg-[#145f7a]/10 text-[#145f7a] dark:border-[#7fb5c6]/30 dark:bg-[#7fb5c6]/20 dark:text-[#7fb5c6]">
                {metric.value}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card> */}
    </div>
  )
}

export default AdminOverviewPage
