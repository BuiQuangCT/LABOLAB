'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Building2, Receipt, TrendingUp, AlertTriangle, Plus, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColorClass: string
  delay?: number
}

// Using Component Composition & Memoization from frontend-patterns skill
const StatCard = React.memo<StatCardProps>(({ title, value, icon, iconColorClass, delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white p-5 rounded-md border border-slate-200 flex flex-col hover:border-slate-300 transition-colors shadow-[2px_2px_0px_0px_rgba(226,232,240,0.5)]"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 bg-slate-50 border border-slate-100 rounded-sm ${iconColorClass}`}>
          {icon}
        </div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="mt-auto">
        <span className="text-3xl font-semibold text-slate-800 tracking-tight">{value}</span>
      </div>
    </motion.div>
  )
})
StatCard.displayName = 'StatCard'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayCases: 0,
    monthlyCases: 0,
    monthlyRevenue: 0,
    totalClinics: 0
  })
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const monthStr = todayStr.substring(0, 7) // "YYYY-MM"

      try {
        const { data: entries } = await supabase
          .from('entries')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(100)

        const { data: clinics } = await supabase
          .from('clinics')
          .select('clinic')

        if (entries) {
          const todayCases = entries.filter(e => e.date === todayStr).length
          const monthlyCases = entries.filter(e => e.date.startsWith(monthStr)).length
          const monthlyRevenue = entries
            .filter(e => e.date.startsWith(monthStr))
            .reduce((sum, e) => sum + (e.unitPrice * e.quantity), 0)

          setStats({
            todayCases,
            monthlyCases,
            monthlyRevenue,
            totalClinics: clinics ? new Set(clinics.map(c => c.clinic)).size : 0
          })

          setRecentEntries(entries.slice(0, 5))
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Memoizing heavy formatting calculation
  const formattedRevenue = useMemo(() => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue)
  }, [stats.monthlyRevenue])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Clinical overview and daily records</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/daily-record" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors shadow-sm">
            <Plus size={16} /> New Record
          </Link>
          <Link href="/voucher" className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors shadow-sm">
            <Receipt size={16} /> Vouchers
          </Link>
        </div>
      </div>

      {/* Quick Stats - Bento Box Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Cases Today" 
          value={stats.todayCases} 
          icon={<Calendar size={18} />} 
          iconColorClass="text-blue-600"
          delay={0.1}
        />
        <StatCard 
          title="Cases This Month" 
          value={stats.monthlyCases} 
          icon={<ClipboardList size={18} />} 
          iconColorClass="text-teal-600"
          delay={0.2}
        />
        <StatCard 
          title={`Revenue (${new Date().toLocaleString('en-US', { month: 'short' })})`} 
          value={formattedRevenue} 
          icon={<TrendingUp size={18} />} 
          iconColorClass="text-emerald-600"
          delay={0.3}
        />
        <StatCard 
          title="Total Clinics" 
          value={stats.totalClinics} 
          icon={<Building2 size={18} />} 
          iconColorClass="text-indigo-600"
          delay={0.4}
        />
      </div>

      {/* Recent Activity */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="font-semibold text-slate-800 text-base">Recent Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest clinical records</p>
          </div>
          <Link href="/daily-record" className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1 px-3 py-1.5 border border-teal-100 bg-teal-50 rounded-sm hover:bg-teal-100">
            View All <TrendingUp size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-medium uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 w-12 text-center">No</th>
                <th className="px-5 py-3 w-24">Date</th>
                <th className="px-5 py-3 w-40">Clinic</th>
                <th className="px-5 py-3 w-40">Doctor</th>
                <th className="px-5 py-3 w-40">Patient</th>
                <th className="px-5 py-3 min-w-[200px]">Case</th>
                <th className="px-5 py-3 w-20">Shade</th>
                <th className="px-5 py-3 w-32">Teeth No.</th>
                <th className="px-5 py-3 w-16 text-center">Qty</th>
                <th className="px-5 py-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {recentEntries.map((entry, idx) => (
                  <motion.tr 
                    key={entry.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.5 + (idx * 0.05) }}
                    className={`hover:bg-slate-50 transition-colors ${entry.is_anomaly ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="px-5 py-3 text-center text-slate-400 text-xs font-mono">{idx + 1}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{entry.date.split('-').slice(1).join('/') + '/' + entry.date.split('-')[0]}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{entry.clinicName}</td>
                    <td className="px-5 py-3 text-slate-500">{entry.doctorName || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{entry.patientName}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {entry.caseType}
                      {entry.is_anomaly && (
                        <span className="ml-2 inline-flex items-center text-amber-700 border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded-sm text-[10px] font-medium" title="Anomaly Detected">
                          <AlertTriangle size={10} className="mr-1"/> Anomaly
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{entry.shade || '-'}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      <span className="text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-1.5 py-0.5 inline-block">
                        {Array.isArray(entry.teethNo) ? entry.teethNo.join(' ') : (entry.teethNo || '-')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-medium text-slate-700">{entry.quantity}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 truncate max-w-[200px]">{entry.remark || '-'}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {recentEntries.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500 text-sm">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
