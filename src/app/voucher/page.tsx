'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, CheckCircle2, Building, Calendar as CalendarIcon, Loader2, XCircle, AlertTriangle } from 'lucide-react'

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
  id: string // Add a unique ID for the grouped voucher
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

    // Lấy các entry trong tháng
    const startOfMonth = `${month}-01`
    const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0]

    // Fetch entries
    const { data: entriesData } = await supabase
      .from('entries')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (entriesData) {
      // Group by clinic and doctor
      const grouped = entriesData.reduce((acc, entry) => {
        const key = `${entry.clinicName}-${entry.doctorName}`
        if (!acc[key]) {
          acc[key] = {
            id: key,
            clinicName: entry.clinicName,
            doctorName: entry.doctorName,
            entries: [],
            totalAmount: 0,
            isPaid: true // We assume true until we find an unpaid entry
          }
        }
        acc[key].entries.push(entry)
        acc[key].totalAmount += (entry.unitPrice * entry.quantity)
        
        // If any entry is unpaid, the whole voucher is considered unpaid
        if (!entry.is_paid) {
          acc[key].isPaid = false
        }
        
        return acc
      }, {} as Record<string, GroupedVoucher>)

      const groupedArray = (Object.values(grouped) as GroupedVoucher[]).sort((a, b) => {
        // Sort unpaid first, then alphabetically
        if (a.isPaid === b.isPaid) {
          return a.clinicName.localeCompare(b.clinicName)
        }
        return a.isPaid ? 1 : -1
      })

      setVouchers(groupedArray)
      
      // Update selected voucher if there was one
      if (selectedVoucher) {
        const updatedSelected = groupedArray.find(v => v.id === selectedVoucher.id)
        if (updatedSelected) {
          setSelectedVoucher(updatedSelected)
        } else {
          setSelectedVoucher(null)
        }
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
    
    // Update is_paid on entries table directly
    const isPaidValue = newStatus === '1'
    const { error } = await supabase.from('entries').update({ is_paid: isPaidValue }).in('id', entryIds)
    
    if (error) {
      console.error("Payment update error:", error)
      alert("Lỗi cập nhật: " + error.message)
    }
    
    setPaymentConfirmModal(null)
    fetchVouchers() // Refresh
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Vouchers & Billing</h1>
          <p className="text-muted-foreground mt-1">Manage and print invoices for your clients</p>
        </div>
        <div className="flex bg-white p-2 rounded-xl shadow-sm border border-border">
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            className="px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-0 font-medium text-foreground cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 print:block gap-6">
        {/* Voucher List */}
        <div className="lg:col-span-1 print:hidden bg-white rounded-2xl shadow-sm border border-border overflow-hidden h-[calc(100vh-200px)] flex flex-col">
          <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Vouchers ({vouchers.length})</h2>
          </div>
          
          {/* Summary */}
          {!loading && vouchers.length > 0 && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-white border-b border-border">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Collected</div>
                <div className="text-sm font-bold text-emerald-700">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vouchers.filter(v => v.isPaid).reduce((sum, v) => sum + v.totalAmount, 0))}
                </div>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Unpaid</div>
                <div className="text-sm font-bold text-rose-700">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vouchers.filter(v => !v.isPaid).reduce((sum, v) => sum + v.totalAmount, 0))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>
            ) : vouchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" />
                <p>No cases found for this month.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vouchers.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoucher(v)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedVoucher?.id === v.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-border hover:bg-secondary/50 hover:border-border/80'}`}
                  >
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span className="truncate pr-2">{v.clinicName}</span>
                      {v.isPaid ? (
                         <span className="shrink-0 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">PAID</span>
                      ) : (
                         <span className="shrink-0 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">UNPAID</span>
                      )}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Dr. {v.doctorName}</div>
                        <div className="text-xs text-muted-foreground mt-1 bg-secondary inline-block px-2 py-0.5 rounded-md">
                          {v.entries.length} cases
                        </div>
                      </div>
                      <span className="text-primary font-bold text-sm">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.totalAmount)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Voucher Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-border overflow-hidden print:overflow-visible h-[calc(100vh-200px)] print:h-auto flex flex-col print:block relative print:border-none print:shadow-none">
          {!selectedVoucher ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-secondary/5">
               <Printer size={48} className="mb-4 opacity-20" />
               <p>Select a voucher from the list to preview and print.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center print:hidden">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Invoice Preview</h2>
                <div className="flex gap-2">
                  {!selectedVoucher.isPaid ? (
                    <button onClick={() => togglePaymentStatus(selectedVoucher, '1')} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-lg hover:bg-emerald-200 transition-colors text-sm">
                      <CheckCircle2 size={16} /> Mark as Paid
                    </button>
                  ) : (
                    <button onClick={() => togglePaymentStatus(selectedVoucher, '0')} className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 font-bold rounded-lg hover:bg-rose-200 transition-colors text-sm">
                      <XCircle size={16} /> Mark as Unpaid
                    </button>
                  )}
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors text-sm shadow-sm">
                    <Printer size={16} /> Print PDF
                  </button>
                </div>
              </div>
              
              {/* Printable Area */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12 print:p-0 print:overflow-visible relative">
                <div className="max-w-3xl mx-auto space-y-8 relative" id="printable-voucher">
                  
                  {/* PAID STAMP */}
                  {selectedVoucher.isPaid && (
                    <div className="vdoc-paid-stamp">PAID</div>
                  )}

                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-primary pb-6">
                    <div>
                      <h1 className="text-3xl font-extrabold text-primary tracking-tight font-serif">{labInfo?.name || 'DENTAL LAB'}</h1>
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        <p>{labInfo?.address}</p>
                        <p>Phone: {labInfo?.phone}</p>
                        <p>Email: {labInfo?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-4xl font-bold text-foreground/10 uppercase tracking-widest">Invoice</h2>
                      <div className="mt-4 text-sm font-medium">
                        <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                        <p className="mt-1 text-muted-foreground">Billing Month: {month}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="bg-secondary/30 p-6 rounded-xl border border-border">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Bill To</h3>
                    <p className="text-xl font-bold text-foreground font-serif">{selectedVoucher.clinicName}</p>
                    <p className="text-muted-foreground font-medium">Attn: Dr. {selectedVoucher.doctorName}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-sm text-left mt-8">
                    <thead className="text-[11px] text-muted-foreground uppercase tracking-wider border-b-2 border-border bg-secondary/20">
                      <tr>
                        <th className="py-3 px-2 font-bold">Date</th>
                        <th className="py-3 px-2 font-bold">Patient</th>
                        <th className="py-3 px-2 font-bold">Case Info / Teeth</th>
                        <th className="py-3 px-2 font-bold text-center">Qty</th>
                        <th className="py-3 px-2 font-bold text-right">Unit Price</th>
                        <th className="py-3 px-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedVoucher.entries.map(entry => (
                        <tr key={entry.id}>
                          <td className="py-4 px-2 text-muted-foreground">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                          <td className="py-4 px-2 font-medium">{entry.patientName}</td>
                          <td className="py-4 px-2">
                            <div className="font-semibold">{entry.caseType}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-mono">Teeth: {Array.isArray(entry.teethNo) && entry.teethNo.length > 0 ? entry.teethNo.join(', ') : 'N/A'}</div>
                          </td>
                          <td className="py-4 px-2 text-center">{entry.quantity}</td>
                          <td className="py-4 px-2 text-right text-muted-foreground">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice)}
                          </td>
                          <td className="py-4 px-2 text-right font-bold">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice * entry.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="flex justify-end pt-6 border-t-2 border-border">
                    <div className="w-72 space-y-3 bg-secondary/20 p-4 rounded-xl">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVoucher.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-primary border-t border-border pt-3">
                        <span>Total Due</span>
                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVoucher.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Thank you for your business!</p>
                    <p className="mt-1">{labInfo?.notes}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {paymentConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${paymentConfirmModal.newStatus === '1' ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>
                {paymentConfirmModal.newStatus === '1' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
              </div>
              <h3 className="text-xl font-bold text-foreground">Xác nhận</h3>
              <p className="text-muted-foreground text-sm">
                Bạn có chắc chắn muốn đánh dấu hóa đơn của <strong>{paymentConfirmModal.voucher.clinicName}</strong> là <strong className={paymentConfirmModal.newStatus === '1' ? 'text-emerald-600' : 'text-rose-600'}>{paymentConfirmModal.newStatus === '1' ? 'PAID' : 'UNPAID'}</strong> không?
              </p>
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex gap-3">
              <button onClick={() => setPaymentConfirmModal(null)} className="flex-1 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-[#f0f2f5] transition-colors">Hủy</button>
              <button onClick={confirmTogglePayment} className={`flex-1 py-2.5 rounded-xl text-white font-bold shadow-sm transition-all ${paymentConfirmModal.newStatus === '1' ? 'bg-emerald-500 hover:bg-emerald-600 border border-emerald-600' : 'bg-rose-500 hover:bg-rose-600 border border-rose-600'}`}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

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
