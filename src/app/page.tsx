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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here is your lab's performance overview.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/daily-record" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-semibold rounded-xl hover:bg-primary/20 transition-colors shadow-sm">
            <Plus size={18} /> New Record
          </Link>
          <Link href="/voucher" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
            <Receipt size={18} /> Vouchers
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors translate-x-1/3 -translate-y-1/3"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Calendar size={20} />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground">Cases Today</h2>
          </div>
          <div className="mt-auto relative z-10">
            <span className="text-4xl font-bold text-foreground font-sans tracking-tight">{stats.todayCases}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors translate-x-1/3 -translate-y-1/3"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
              <ClipboardList size={20} />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground">Cases This Month</h2>
          </div>
          <div className="mt-auto relative z-10">
            <span className="text-4xl font-bold text-foreground font-sans tracking-tight">{stats.monthlyCases}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors translate-x-1/3 -translate-y-1/3"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground">Revenue ({new Date().toLocaleString('en-US', { month: 'short' })})</h2>
          </div>
          <div className="mt-auto relative z-10">
            <span className="text-3xl font-bold text-foreground font-sans tracking-tight">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue)}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors translate-x-1/3 -translate-y-1/3"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Building2 size={20} />
            </div>
            <h2 className="text-sm font-semibold text-muted-foreground">Total Clinics</h2>
          </div>
          <div className="mt-auto relative z-10">
            <span className="text-4xl font-bold text-foreground font-sans tracking-tight">{stats.totalClinics}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30">
          <div>
            <h2 className="font-bold text-lg text-foreground font-serif tracking-tight">Recent Activity</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Latest cases across all clinics</p>
          </div>
          <Link href="/daily-record" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10">
            View All <TrendingUp size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-5 py-4 w-12 text-center">No</th>
                <th className="px-5 py-4 w-24">Date</th>
                <th className="px-5 py-4 w-40">Clinic</th>
                <th className="px-5 py-4 w-40">Doctor</th>
                <th className="px-5 py-4 w-40">Patient</th>
                <th className="px-5 py-4 min-w-[200px]">Case</th>
                <th className="px-5 py-4 w-20">Shade</th>
                <th className="px-5 py-4 w-32">Teeth No.</th>
                <th className="px-5 py-4 w-16 text-center">Qty</th>
                <th className="px-5 py-4">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentEntries.map((entry, idx) => (
                <tr key={entry.id} className={`hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${entry.is_anomaly ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-5 py-4 text-center text-muted-foreground text-xs font-mono">{idx + 1}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{entry.date.split('-').slice(1).join('/') + '/' + entry.date.split('-')[0]}</td>
                  <td className="px-5 py-4 font-medium text-foreground">{entry.clinicName}</td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.doctorName || '-'}</td>
                  <td className="px-5 py-4 font-medium text-foreground">{entry.patientName}</td>
                  <td className="px-5 py-4 text-foreground">
                    {entry.caseType}
                    {entry.is_anomaly && (
                      <span className="ml-2 inline-flex items-center text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md text-[10px] font-bold" title="Anomaly Detected">
                        <AlertTriangle size={10} className="mr-1"/> Anomaly
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{entry.shade || '-'}</td>
                  <td className="px-5 py-4 font-mono text-xs text-primary bg-primary/5 rounded px-2">{Array.isArray(entry.teethNo) ? entry.teethNo.join(' ') : (entry.teethNo || '-')}</td>
                  <td className="px-5 py-4 text-center font-semibold text-foreground">{entry.quantity}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground truncate max-w-[200px]">{entry.remark || '-'}</td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground text-sm">
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
