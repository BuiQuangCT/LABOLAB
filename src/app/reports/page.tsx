'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { DollarSign, FileText, CheckCircle2, Loader2, TrendingUp, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

type Entry = {
  id: string
  date: string
  clinicName: string
  caseType: string
  quantity: number
  unitPrice: number
  is_anomaly: boolean
  is_paid: boolean
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
      supabase.from('entries').select('*').gte('date', startOfMonth).lte('date', endOfMonth).order('date', { ascending: false }),
      supabase.from('predictions').select('*').order('prediction_date', { ascending: true })
    ])

    if (entriesRes.data) setEntries(entriesRes.data)
    if (forecastRes.data) setForecasts(forecastRes.data)
    
    setLoading(false)
  }

  // Calculate KPIs
  const totalCases = entries.reduce((sum, e) => sum + e.quantity, 0)
  const totalRevenue = entries.reduce((sum, e) => sum + (e.quantity * e.unitPrice), 0)
  const collectedRevenue = entries.filter(e => e.is_paid).reduce((sum, e) => sum + (e.quantity * e.unitPrice), 0)
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
  const historicalWeekly = entries.reduce((acc, e) => {
    const d = e.date
    if (!acc[d]) acc[d] = { date: d, historical_revenue: 0 }
    acc[d].historical_revenue += (e.quantity * e.unitPrice)
    return acc
  }, {} as Record<string, { date: string, historical_revenue: number }>)
  
  let timeSeriesData = Object.values(historicalWeekly).sort((a, b) => a.date.localeCompare(b.date))
  
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

  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 mt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard & Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Analytics and machine learning insights</p>
        </div>
        <div className="flex bg-white p-1 rounded-sm shadow-sm border border-slate-200">
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 bg-transparent border-none outline-none font-medium text-slate-700 cursor-pointer text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-teal-600" size={32} /></div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-4">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-sm"><FileText size={20} /></div>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Total Cases</p>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{totalCases}</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-teal-50 border border-teal-100 text-teal-600 rounded-sm"><DollarSign size={20} /></div>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-sm"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Collected</p>
                <p className="text-2xl font-bold text-emerald-700 leading-tight">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(collectedRevenue)}</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-sm"><TrendingUp size={20} /></div>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Outstanding</p>
                <p className="text-2xl font-bold text-rose-600 leading-tight">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(outstandingRevenue)}</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Clinics Chart */}
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex flex-col">
              <h2 className="font-semibold text-slate-800 text-sm mb-4">Top Clinics by Revenue</h2>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={(val) => `${val / 1000000}M`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[0, 2, 2, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* ML Workload Forecasting */}
            <motion.div variants={fadeUp} className="bg-white p-5 rounded-md shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="text-teal-600" size={16} /> Workload Forecasting (ML)
                </h2>
              </div>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => val.split('-').slice(1).join('/')} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}M`} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line type="monotone" name="Actual Revenue" dataKey="historical_revenue" stroke="#0d9488" strokeWidth={2.5} dot={{r: 3, fill: '#0d9488', strokeWidth: 0}} activeDot={{r: 5}} />
                    <Line type="monotone" name="Forecasted" dataKey="forecasted_revenue" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{r: 3, fill: '#f59e0b', strokeWidth: 0}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Ledger Table */}
          <motion.div variants={fadeUp} className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <h2 className="font-semibold text-xs uppercase tracking-widest text-slate-600">Detailed Ledger</h2>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Clinic</th>
                    <th className="px-5 py-3 font-semibold">Case Info</th>
                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No records found.</td></tr>
                  ) : entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 text-xs font-mono">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{entry.clinicName}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700">{entry.caseType}</div>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Qty: {entry.quantity}</div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {entry.is_paid ? (
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider">Paid</span>
                        ) : (
                          <span className="bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider">Unpaid</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.unitPrice * entry.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
