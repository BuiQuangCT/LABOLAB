'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { DollarSign, FileText, CheckCircle2, Loader2, TrendingUp, Filter } from 'lucide-react'

type Entry = {
  id: string
  date: string
  clinicName: string
  caseType: string
  quantity: number
  unitPrice: number
  is_anomaly: boolean
  payments: { paid: string }[]
}

export default function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  
  // Forecast Data
  const [forecasts, setForecasts] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [month])

  const fetchData = async () => {
    setLoading(true)
    const startOfMonth = `${month}-01`
    const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0]

    const [entriesRes, forecastRes] = await Promise.all([
      supabase.from('entries').select('*, payments(paid)').gte('date', startOfMonth).lte('date', endOfMonth).order('date', { ascending: false }),
      supabase.from('predictions').select('*').order('prediction_date', { ascending: true })
    ])

    if (entriesRes.data) setEntries(entriesRes.data)
    if (forecastRes.data) setForecasts(forecastRes.data)
    
    setLoading(false)
  }

  // Calculate KPIs
  const totalCases = entries.reduce((sum, e) => sum + e.quantity, 0)
  const totalRevenue = entries.reduce((sum, e) => sum + (e.quantity * e.unitPrice), 0)
  const collectedRevenue = entries.filter(e => e.payments?.[0]?.paid === '1').reduce((sum, e) => sum + (e.quantity * e.unitPrice), 0)
  const outstandingRevenue = totalRevenue - collectedRevenue

  // Chart Data Preparation (Revenue by Clinic)
  const revenueByClinic = entries.reduce((acc, e) => {
    const revenue = e.quantity * e.unitPrice
    if (!acc[e.clinicName]) acc[e.clinicName] = { name: e.clinicName, revenue: 0, cases: 0 }
    acc[e.clinicName].revenue += revenue
    acc[e.clinicName].cases += e.quantity
    return acc
  }, {} as Record<string, { name: string, revenue: number, cases: number }>)
  
  const clinicChartData = Object.values(revenueByClinic).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Workload Forecasting Data Preparation
  // Combining historical cases per week with predicted cases
  const historicalWeekly = entries.reduce((acc, e) => {
    // simplified grouping by day for chart since we filter by month
    const d = e.date
    if (!acc[d]) acc[d] = { date: d, historical_revenue: 0 }
    acc[d].historical_revenue += (e.quantity * e.unitPrice)
    return acc
  }, {} as Record<string, { date: string, historical_revenue: number }>)
  
  let timeSeriesData = Object.values(historicalWeekly).sort((a, b) => a.date.localeCompare(b.date))
  
  // Append forecast data if any
  forecasts.forEach(f => {
    if (f.metric === 'revenue') {
       timeSeriesData.push({
         date: f.prediction_date,
         historical_revenue: 0, // eslint-disable-next-line @typescript-eslint/ban-ts-comment
         // @ts-ignore
         forecasted_revenue: f.value
       })
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard & Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and machine learning insights</p>
        </div>
        <div className="flex bg-white p-2 rounded-xl shadow-sm border border-border">
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-0 font-medium text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={48} /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><FileText size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                  <p className="text-2xl font-bold text-foreground">{totalCases}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(collectedRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><TrendingUp size={24} /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold text-foreground">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(outstandingRevenue)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clinics Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <h2 className="font-bold text-lg mb-6">Top Clinics by Revenue</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(val) => `${val / 1000000}M`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                    <Tooltip formatter={(val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ML Workload Forecasting */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="text-primary" /> Workload Forecasting (ML)
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">AI Powered</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}M`} tick={{fontSize: 12}} />
                    <Tooltip formatter={(val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} />
                    <Legend />
                    <Line type="monotone" name="Actual Revenue" dataKey="historical_revenue" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    <Line type="monotone" name="Forecasted (4 weeks)" dataKey="forecasted_revenue" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">Data points represent daily historical revenue and future weekly forecasts generated by Machine Learning.</p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30 flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <h2 className="font-semibold">Detailed Ledger</h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Clinic</th>
                    <th className="px-6 py-4 font-medium">Case Info</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No records found.</td></tr>
                  ) : entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{entry.clinicName}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{entry.caseType}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Qty: {entry.quantity}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.payments?.[0]?.paid === '1' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">Paid</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium">Unpaid</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.unitPrice * entry.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
