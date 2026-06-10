import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  Wrench,
  FileText,
  Receipt,
  Users,
  ShieldCheck,
  Building2,
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, Cell } from 'recharts';
import { entityServices } from '../../services/entities';
import { parseListResponse } from '../../services/entities/crudService';
import { extractApiErrorMessage } from '../../lib/api';

function listItemsFromSettled(result) {
  if (result?.status !== 'fulfilled') {
    return [];
  }
  return parseListResponse(result.value).items;
}

const AdminOverviewPage = () => {
  const { t } = useTranslation()
  const [dataCounts, setDataCounts] = useState({
    users: 0,
    departments: 0,
    demandes: 0,
    interventions: 0,
    fiches: 0,
    factures: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        usersRes,
        departmentsRes,
        demandesRes,
        interventionsRes,
        fichesRes,
        facturesRes
      ] = await Promise.allSettled([
        entityServices.users.list(),
        entityServices.departments.list(),
        entityServices['demande-maintenances'].list(),
        entityServices.interventions.list(),
        entityServices['fiche-reparations'].list(),
        entityServices.factures.list()
      ]);

      const getCount = (res) => {
        if (res.status !== 'fulfilled') return 0
        return parseListResponse(res.value).count
      };
      
      setDataCounts({
        users: getCount(usersRes),
        departments: getCount(departmentsRes),
        demandes: getCount(demandesRes),
        interventions: getCount(interventionsRes),
        fiches: getCount(fichesRes),
        factures: getCount(facturesRes)
      });

      // Generate chart data based on loaded items
      const mDemandes = listItemsFromSettled(demandesRes);
      const mInterventions = listItemsFromSettled(interventionsRes);

      // Create a rolling 7-day window
      const today = new Date();
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return {
          date: d.toISOString().slice(0, 10), // YYYY-MM-DD
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          requests: 0,
          completed: 0
        };
      });

      // Map requests
      mDemandes.forEach(d => {
        if (!d.date_creation) return;
        const dateStr = d.date_creation.slice(0, 10);
        const day = last7Days.find(day => day.date === dateStr);
        if (day) day.requests += 1;
      });

      // Map completed interventions
      mInterventions.forEach(i => {
        if (!i.date_fin) return;
        const dateStr = i.date_fin.slice(0, 10);
        const day = last7Days.find(day => day.date === dateStr);
        if (day && i.statut === 'termine') day.completed += 1;
      });

      setChartData(last7Days);

    } catch (err) {
      setError(extractApiErrorMessage(err, t('error.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpiData = [
    { title: t('User'), count: dataCounts.users, icon: Users, description: t('role.admin'), color: 'blue' },
    { title: t('Modules'), count: dataCounts.departments, icon: Building2, description: t('dashboard.activeModules'), color: 'indigo' },
    { title: t('dashboard.pendingDemandes'), count: dataCounts.demandes, icon: ClipboardList, description: t('status.en_cours'), color: 'amber' },
    { title: t('nav.modules'), count: dataCounts.interventions, icon: Wrench, description: t('status.en_cours'), color: 'emerald' },
    { title: t('crud.records'), count: dataCounts.fiches, icon: FileText, description: t('status.termine'), color: 'violet' },
    { title: t('dashboard.totalRecords'), count: dataCounts.factures, icon: Receipt, description: t('status.payee'), color: 'rose' },
  ];

  // Map arbitrary colors to Tailwind classes safely
  const colorMap = {
    blue: 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    indigo: 'bg-indigo-100/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    amber: 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    violet: 'bg-violet-100/50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    rose: 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white">
            System Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live diagnostics and operations center
          </p>
        </div>
        <button onClick={loadData} disabled={loading} className="text-sm flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {kpiData.map((kpi, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="full-glass hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-xl border ${colorMap[kpi.color]}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display text-slate-800 dark:text-slate-100">
                  {loading ? '...' : kpi.count}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {kpi.description}
                  </span>
                  <Badge variant="outline" className="bg-[#1ea0d6]/10 text-[#1ea0d6] border-[#1ea0d6]/20 shadow-none text-[10px] px-1.5 py-0 h-5">
                    Live
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="full-glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <TrendingUp className="h-5 w-5 text-[#1ea0d6]" />
                Volume of Requests
              </CardTitle>
              <CardDescription>7-day rolling window of maintenance activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#145f7a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#145f7a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1ea0d6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1ea0d6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#145f7a" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                    <Area type="monotone" dataKey="completed" stroke="#1ea0d6" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="full-glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                System Health & Access
              </CardTitle>
              <CardDescription>Platform analytics and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mt-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">System Status</p>
                      <p className="text-xs text-slate-500">All services operational</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm">Secure</Badge>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Sessions</p>
                      <p className="text-xs text-slate-500">Currently authenticated</p>
                    </div>
                  </div>
                  <span className="font-display font-bold text-lg text-slate-800 dark:text-slate-200">18</span>
                </div>
                
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">System Load</p>
                      <p className="text-xs text-slate-500">Server resource utilization</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg text-slate-800 dark:text-slate-200">12%</span>
                    <Badge variant="outline" className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 shadow-none">Low</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
