'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Building2, Receipt, TrendingUp, AlertTriangle, Plus, ClipboardList } from 'lucide-react'
import Link from 'next/link'

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
        // Fetch all recent entries to calculate stats & show activity
        const { data: entries } = await supabase
          .from('entries')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(100)

        // Fetch total unique clinics
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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back! Here is your lab's performance overview.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/daily-record" className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors text-sm shadow-sm">
            <Plus size={16} /> New Record
          </Link>
          <Link href="/voucher" className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors text-sm shadow-sm">
            <Receipt size={16} /> Vouchers
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <Calendar size={24} className="text-primary" />
            </div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cases Today</h2>
          </div>
          <div className="mt-auto">
            <span className="text-3xl font-extrabold text-foreground">{stats.todayCases}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <ClipboardList size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cases This Month</h2>
          </div>
          <div className="mt-auto">
            <span className="text-3xl font-extrabold text-foreground">{stats.monthlyCases}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <TrendingUp size={24} className="text-primary" />
            </div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenue ({new Date().toLocaleString('en-US', { month: 'short' })})</h2>
          </div>
          <div className="mt-auto">
            <span className="text-3xl font-extrabold text-foreground">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue)}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <Building2 size={24} className="text-primary" />
            </div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Clinics</h2>
          </div>
          <div className="mt-auto">
            <span className="text-3xl font-extrabold text-foreground">{stats.totalClinics}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 bg-[#f8f9fb] border-b border-border flex justify-between items-center">
          <h2 className="font-mono text-xs tracking-[0.1em] uppercase font-bold text-foreground">Recent Activity</h2>
          <Link href="/daily-record" className="text-xs font-bold text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-white font-mono tracking-widest uppercase bg-red-950 border-b border-red-900">
              <tr>
                <th className="px-4 py-4 font-bold w-12 text-center">No</th>
                <th className="px-4 py-4 font-bold w-24">Date</th>
                <th className="px-4 py-4 font-bold w-40">Clinic</th>
                <th className="px-4 py-4 font-bold w-40">Doctor</th>
                <th className="px-4 py-4 font-bold w-40">Patient</th>
                <th className="px-4 py-4 font-bold min-w-[200px]">Case</th>
                <th className="px-4 py-4 font-bold w-20">Shade</th>
                <th className="px-4 py-4 font-bold w-32">Teeth No.</th>
                <th className="px-4 py-4 font-bold w-16 text-center">Qty</th>
                <th className="px-4 py-4 font-bold">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentEntries.map((entry, idx) => (
                <tr key={entry.id} className={`hover:bg-red-50 transition-colors ${entry.is_anomaly ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.date.split('-').slice(1).join('/') + '/' + entry.date.split('-')[0]}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.clinicName}</td>
                  <td className="px-4 py-3 text-foreground">{entry.doctorName || '-'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.patientName}</td>
                  <td className="px-4 py-3 text-foreground">
                    {entry.caseType}
                    {entry.is_anomaly && (
                      <span className="ml-2 inline-flex items-center text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Anomaly Detected">
                        <AlertTriangle size={10} className="mr-0.5"/> Anomaly
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{entry.shade || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{Array.isArray(entry.teethNo) ? entry.teethNo.join(' ') : (entry.teethNo || '-')}</td>
                  <td className="px-4 py-3 text-center font-semibold text-foreground">{entry.quantity}</td>
                  <td className="px-4 py-3 text-xs text-foreground truncate max-w-[200px]">{entry.remark || '-'}</td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-muted-foreground text-sm font-mono">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
