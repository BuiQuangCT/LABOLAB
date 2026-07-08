'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Building2, Receipt, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayCases: 0,
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
          .limit(100)

        // Fetch total unique clinics
        const { data: clinics } = await supabase
          .from('clinics')
          .select('clinic')

        if (entries) {
          const todayCases = entries.filter(e => e.date === todayStr).length
          const monthlyRevenue = entries
            .filter(e => e.date.startsWith(monthStr))
            .reduce((sum, e) => sum + (e.unitPrice * e.quantity), 0)

          setStats({
            todayCases,
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
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back! Here is your lab's performance overview.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calendar size={24} className="text-primary" />
            </div>
            <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground font-semibold">Cases Today</h3>
          </div>
          <div className="text-4xl font-bold text-foreground">{stats.todayCases}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp size={24} className="text-primary" />
            </div>
            <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground font-semibold">Revenue ({new Date().toLocaleString('en-US', { month: 'short' })})</h3>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.monthlyRevenue)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 size={24} className="text-primary" />
            </div>
            <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground font-semibold">Total Clinics</h3>
          </div>
          <div className="text-4xl font-bold text-foreground">{stats.totalClinics}</div>
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
            <thead className="text-xs text-muted-foreground uppercase bg-white border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Clinic & Doctor</th>
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Case Type</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentEntries.map((entry) => (
                <tr key={entry.id} className={`hover:bg-[#f8f9fb] transition-colors ${entry.is_anomaly ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {entry.date.split('-').slice(1).join('/')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-foreground">{entry.clinicName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{entry.doctorName || '-'}</div>
                  </td>
                  <td className="px-5 py-3 font-medium">{entry.patientName}</td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-primary text-xs bg-primary/5 px-2 py-1 rounded-md">{entry.caseType}</span>
                    {entry.is_anomaly && (
                      <span className="ml-2 inline-flex items-center text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        <AlertTriangle size={10} className="mr-0.5"/> Anomaly
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-foreground">
                    {new Intl.NumberFormat('vi-VN').format(entry.unitPrice * entry.quantity)}
                  </td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm font-mono">
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
