'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, CheckCircle2, Building, Calendar as CalendarIcon, Loader2, XCircle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Entry = {
  id: string
  date: string
  clinicName: string
  doctorName: string
  patientName: string
  caseType: string
  teethNo: string[]
  quantity: number
  unitPrice: number
  is_paid: boolean
}

type GroupedVoucher = {
  id: string
  clinicName: string
  doctorName: string
  entries: Entry[]
  totalAmount: number
  isPaid: boolean
}

export default function VoucherPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [vouchers, setVouchers] = useState<GroupedVoucher[]>([])
  const [labInfo, setLabInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVoucher, setSelectedVoucher] = useState<GroupedVoucher | null>(null)
  const [paymentConfirmModal, setPaymentConfirmModal] = useState<{ voucher: GroupedVoucher, newStatus: string } | null>(null)

  useEffect(() => {
    fetchVouchers()
  }, [month])

  const fetchVouchers = async () => {
    setLoading(true)
    
    // Fetch Lab Info
    const { data: labData } = await supabase.from('labinfo').select('*').eq('id', 1).single()
    if (labData) setLabInfo(labData)

    const startOfMonth = `${month}-01`
    const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: entriesData } = await supabase
      .from('entries')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (entriesData) {
      const grouped = entriesData.reduce((acc, entry) => {
        const key = `${entry.clinicName}-${entry.doctorName}`
        if (!acc[key]) {
          acc[key] = {
            id: key,
            clinicName: entry.clinicName,
            doctorName: entry.doctorName,
            entries: [],
            totalAmount: 0,
            isPaid: true
          }
        }
        acc[key].entries.push(entry)
        acc[key].totalAmount += (entry.unitPrice * entry.quantity)
        
        if (!entry.is_paid) acc[key].isPaid = false
        
        return acc
      }, {} as Record<string, GroupedVoucher>)

      const groupedArray = (Object.values(grouped) as GroupedVoucher[]).sort((a, b) => {
        if (a.isPaid === b.isPaid) return a.clinicName.localeCompare(b.clinicName)
        return a.isPaid ? 1 : -1
      })

      setVouchers(groupedArray)
      
      if (selectedVoucher) {
        const updatedSelected = groupedArray.find(v => v.id === selectedVoucher.id)
        setSelectedVoucher(updatedSelected || null)
      }
    }
    setLoading(false)
  }

  const togglePaymentStatus = (voucher: GroupedVoucher, newStatus: string) => {
    setPaymentConfirmModal({ voucher, newStatus })
  }

  const confirmTogglePayment = async () => {
    if (!paymentConfirmModal) return
    const { voucher, newStatus } = paymentConfirmModal
    const entryIds = voucher.entries.map(e => e.id)
    
    if (entryIds.length === 0) return
    
    const isPaidValue = newStatus === '1'
    const { error } = await supabase.from('entries').update({ is_paid: isPaidValue }).in('id', entryIds)
    
    if (error) {
      console.error("Payment update error:", error)
      alert("Error updating payment: " + error.message)
    }
    
    setPaymentConfirmModal(null)
    fetchVouchers() // Refresh
  }

  const handlePrint = () => {
    window.print()
  }

  // Memoizing expensive total calculations
  const totals = useMemo(() => {
    const collected = vouchers.filter(v => v.isPaid).reduce((sum, v) => sum + v.totalAmount, 0)
    const unpaid = vouchers.filter(v => !v.isPaid).reduce((sum, v) => sum + v.totalAmount, 0)
    return {
      collected: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(collected),
      unpaid: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(unpaid)
    }
  }, [vouchers])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vouchers & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and print invoices for your clients</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 print:block gap-4">
        {/* Voucher List */}
        <div className="lg:col-span-1 print:hidden bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-xs uppercase tracking-widest text-slate-500">Vouchers ({vouchers.length})</h2>
          </div>
          
          {/* Summary */}
          {!loading && vouchers.length > 0 && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-white border-b border-slate-200">
              <div className="bg-emerald-50/50 p-3 rounded-sm border border-emerald-100 flex flex-col">
                <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest mb-1">Collected</div>
                <div className="text-sm font-bold text-emerald-700">{totals.collected}</div>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-sm border border-rose-100 flex flex-col">
                <div className="text-[10px] text-rose-600 uppercase font-bold tracking-widest mb-1">Unpaid</div>
                <div className="text-sm font-bold text-rose-700">{totals.unpaid}</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-teal-600" /></div>
            ) : vouchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckCircle2 size={48} className="text-teal-200 mb-3" />
                <p className="text-sm">No cases found for this month.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {vouchers.map((v, idx) => (
                    <motion.button
                      key={v.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.05, 0.5) }}
                      onClick={() => setSelectedVoucher(v)}
                      className={`w-full text-left p-3.5 rounded-sm border transition-all ${selectedVoucher?.id === v.id ? 'bg-teal-50 border-teal-200 shadow-sm ring-1 ring-teal-600/10' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                      <div className="font-semibold text-slate-800 flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{v.clinicName}</span>
                        {v.isPaid ? (
                           <span className="shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">PAID</span>
                        ) : (
                           <span className="shrink-0 bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">UNPAID</span>
                        )}
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <div className="text-xs text-slate-500">Dr. {v.doctorName}</div>
                          <div className="text-[10px] text-slate-500 mt-1.5 bg-slate-100 border border-slate-200 inline-block px-1.5 py-0.5 rounded-sm font-medium">
                            {v.entries.length} {v.entries.length === 1 ? 'case' : 'cases'}
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${v.isPaid ? 'text-slate-600' : 'text-teal-600'}`}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.totalAmount)}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Voucher Preview */}
        <div className="lg:col-span-2 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden print:overflow-visible h-[calc(100vh-200px)] print:h-auto flex flex-col print:block relative print:border-none print:shadow-none">
          {!selectedVoucher ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
               <Printer size={48} className="mb-4 opacity-30 text-slate-300" />
               <p className="text-sm">Select a voucher from the list to preview and print.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              key={selectedVoucher.id}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print:hidden">
                <h2 className="font-semibold text-xs uppercase tracking-widest text-slate-500">Invoice Preview</h2>
                <div className="flex gap-2">
                  {!selectedVoucher.isPaid ? (
                    <button onClick={() => togglePaymentStatus(selectedVoucher, '1')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium rounded-sm hover:bg-emerald-100 transition-colors text-xs">
                      <CheckCircle2 size={14} /> Mark as Paid
                    </button>
                  ) : (
                    <button onClick={() => togglePaymentStatus(selectedVoucher, '0')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-medium rounded-sm hover:bg-rose-100 transition-colors text-xs">
                      <XCircle size={14} /> Mark as Unpaid
                    </button>
                  )}
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 text-white font-medium rounded-sm hover:bg-teal-700 transition-colors text-xs shadow-sm">
                    <Printer size={14} /> Print PDF
                  </button>
                </div>
              </div>
              
              {/* Printable Area */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12 print:p-0 print:overflow-visible relative">
                <div className="max-w-3xl mx-auto space-y-8 relative" id="printable-voucher">
                  
                  {/* PAID STAMP */}
                  {selectedVoucher.isPaid && (
                    <div className="vdoc-paid-stamp opacity-10 border-teal-600 text-teal-600 font-sans tracking-widest rounded-md border-4">PAID</div>
                  )}

                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{labInfo?.name || 'DENTAL LAB'}</h1>
                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <p>{labInfo?.address}</p>
                        <p>Phone: {labInfo?.phone}</p>
                        <p>Email: {labInfo?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl font-bold text-slate-200 uppercase tracking-widest">Invoice</h2>
                      <div className="mt-4 text-xs font-medium text-slate-600">
                        <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                        <p className="mt-1">Billing Month: {month}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="bg-slate-50 p-5 rounded-sm border border-slate-200">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To</h3>
                    <p className="text-lg font-bold text-slate-800">{selectedVoucher.clinicName}</p>
                    <p className="text-slate-600 font-medium text-sm mt-1">Attn: Dr. {selectedVoucher.doctorName}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-sm text-left mt-8">
                    <thead className="text-[10px] text-slate-500 uppercase tracking-widest border-b-2 border-slate-800">
                      <tr>
                        <th className="py-3 px-2 font-bold">Date</th>
                        <th className="py-3 px-2 font-bold">Patient</th>
                        <th className="py-3 px-2 font-bold">Case Info / Teeth</th>
                        <th className="py-3 px-2 font-bold text-center">Qty</th>
                        <th className="py-3 px-2 font-bold text-right">Unit Price</th>
                        <th className="py-3 px-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVoucher.entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                          <td className="py-4 px-2 text-slate-500 text-xs font-mono">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                          <td className="py-4 px-2 font-medium text-slate-800">{entry.patientName}</td>
                          <td className="py-4 px-2">
                            <div className="font-semibold text-slate-700">{entry.caseType}</div>
                            <div className="text-xs text-slate-500 mt-1 font-mono">Teeth: {Array.isArray(entry.teethNo) && entry.teethNo.length > 0 ? entry.teethNo.join(', ') : 'N/A'}</div>
                          </td>
                          <td className="py-4 px-2 text-center font-medium">{entry.quantity}</td>
                          <td className="py-4 px-2 text-right text-slate-500">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice)}
                          </td>
                          <td className="py-4 px-2 text-right font-bold text-slate-800">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice * entry.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="flex justify-end pt-6 border-t-2 border-slate-800">
                    <div className="w-72 space-y-3 bg-slate-50 p-4 rounded-sm border border-slate-100">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="text-slate-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVoucher.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-teal-700 border-t border-slate-200 pt-3">
                        <span>Total Due</span>
                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVoucher.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
                    <p className="font-medium text-slate-700 text-sm">Thank you for your business!</p>
                    <p className="mt-1">{labInfo?.notes}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {paymentConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-md w-full max-w-sm overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-6 text-center space-y-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${paymentConfirmModal.newStatus === '1' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                  {paymentConfirmModal.newStatus === '1' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Confirm Payment</h3>
                <p className="text-slate-500 text-sm">
                  Mark all cases for <strong>{paymentConfirmModal.voucher.clinicName}</strong> as <strong className={paymentConfirmModal.newStatus === '1' ? 'text-emerald-600' : 'text-rose-600'}>{paymentConfirmModal.newStatus === '1' ? 'PAID' : 'UNPAID'}</strong>?
                </p>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onClick={() => setPaymentConfirmModal(null)} className="flex-1 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                <button onClick={confirmTogglePayment} className={`flex-1 py-2 rounded-sm text-white font-medium shadow-sm transition-all text-sm ${paymentConfirmModal.newStatus === '1' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-voucher, #printable-voucher * {
            visibility: visible;
          }
          #printable-voucher {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          /* Ensure colors are printed */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide sidebar and layout padding */
          aside, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          @page { margin: 1cm; size: A4; }
        }
      `}} />
    </div>
  )
}
