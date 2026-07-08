'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Printer, CheckCircle2, Building, Calendar as CalendarIcon, Loader2 } from 'lucide-react'

type Entry = {
  id: string
  date: string
  clinicName: string
  doctorName: string
  patientName: string
  caseType: string
  teethNo: string
  quantity: number
  unitPrice: number
}

type GroupedVoucher = {
  clinicName: string
  doctorName: string
  entries: Entry[]
  totalAmount: number
}

export default function VoucherPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [vouchers, setVouchers] = useState<GroupedVoucher[]>([])
  const [labInfo, setLabInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVoucher, setSelectedVoucher] = useState<GroupedVoucher | null>(null)

  useEffect(() => {
    fetchVouchers()
  }, [month])

  const fetchVouchers = async () => {
    setLoading(true)
    setSelectedVoucher(null)
    
    // Fetch Lab Info
    const { data: labData } = await supabase.from('labinfo').select('*').eq('id', 1).single()
    if (labData) setLabInfo(labData)

    // Lấy các entry trong tháng chưa thanh toán
    const startOfMonth = `${month}-01`
    const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0).toISOString().split('T')[0]

    // Fetch entries with no payment or unpaid payment
    const { data: entriesData } = await supabase
      .from('entries')
      .select(`
        *,
        payments ( paid )
      `)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (entriesData) {
      // Filter out paid ones
      const unpaidEntries = entriesData.filter(e => !e.payments || e.payments.length === 0 || e.payments[0].paid === '0')

      // Group by clinic and doctor
      const grouped = unpaidEntries.reduce((acc, entry) => {
        const key = `${entry.clinicName}-${entry.doctorName}`
        if (!acc[key]) {
          acc[key] = {
            clinicName: entry.clinicName,
            doctorName: entry.doctorName,
            entries: [],
            totalAmount: 0
          }
        }
        acc[key].entries.push(entry)
        acc[key].totalAmount += (entry.unitPrice * entry.quantity)
        return acc
      }, {} as Record<string, GroupedVoucher>)

      setVouchers(Object.values(grouped))
    }
    setLoading(false)
  }

  const markAsPaid = async (voucher: GroupedVoucher) => {
    if (!confirm('Are you sure you want to mark these items as paid?')) return
    
    const entryIds = voucher.entries.map(e => e.id)
    
    // Insert into payments table
    const paymentsPayload = entryIds.map(id => ({
      entryId: id,
      paid: '1'
    }))
    
    await supabase.from('payments').upsert(paymentsPayload, { onConflict: 'entryId' })
    
    alert('Voucher marked as paid!')
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
          <p className="text-muted-foreground mt-1">Generate invoices for unpaid cases</p>
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

      <div className="print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voucher List */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-border overflow-hidden h-[calc(100vh-200px)] flex flex-col">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold">Unpaid Vouchers ({vouchers.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>
            ) : vouchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" />
                <p>No unpaid cases for this month.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vouchers.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVoucher(v)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedVoucher === v ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-border hover:bg-secondary/50 hover:border-border/80'}`}
                  >
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      {v.clinicName}
                      <span className="text-primary font-bold text-sm">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.totalAmount)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Dr. {v.doctorName}</div>
                    <div className="text-xs text-muted-foreground mt-2 bg-secondary inline-block px-2 py-1 rounded-md">
                      {v.entries.length} cases
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Voucher Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-border overflow-hidden h-[calc(100vh-200px)] flex flex-col relative">
          {!selectedVoucher ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-secondary/5">
               <Printer size={48} className="mb-4 opacity-20" />
               <p>Select a voucher from the list to preview and print.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center print:hidden">
                <h2 className="font-semibold">Invoice Preview</h2>
                <div className="flex gap-2">
                  <button onClick={() => markAsPaid(selectedVoucher)} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 font-medium rounded-lg hover:bg-emerald-200 transition-colors">
                    <CheckCircle2 size={16} /> Mark as Paid
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    <Printer size={16} /> Print
                  </button>
                </div>
              </div>
              
              {/* Printable Area */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12 print:p-0 print:overflow-visible">
                <div className="max-w-3xl mx-auto space-y-8" id="printable-voucher">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-primary pb-6">
                    <div>
                      <h1 className="text-3xl font-extrabold text-primary tracking-tight">{labInfo?.name || 'DENTAL LAB'}</h1>
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        <p>{labInfo?.address}</p>
                        <p>Phone: {labInfo?.phone}</p>
                        <p>Email: {labInfo?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-4xl font-bold text-foreground/10 uppercase tracking-widest">Invoice</h2>
                      <div className="mt-4 text-sm font-medium">
                        <p>Date: {new Date().toLocaleDateString()}</p>
                        <p className="mt-1 text-muted-foreground">Billing Month: {month}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div className="bg-secondary/30 p-6 rounded-xl border border-border">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Bill To</h3>
                    <p className="text-xl font-bold text-foreground">{selectedVoucher.clinicName}</p>
                    <p className="text-muted-foreground font-medium">Attn: Dr. {selectedVoucher.doctorName}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-sm text-left mt-8">
                    <thead className="text-xs text-muted-foreground uppercase border-b-2 border-border">
                      <tr>
                        <th className="py-3 font-bold">Date</th>
                        <th className="py-3 font-bold">Patient</th>
                        <th className="py-3 font-bold">Case Info / Teeth</th>
                        <th className="py-3 font-bold text-center">Qty</th>
                        <th className="py-3 font-bold text-right">Unit Price</th>
                        <th className="py-3 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedVoucher.entries.map(entry => (
                        <tr key={entry.id}>
                          <td className="py-4 text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="py-4 font-medium">{entry.patientName}</td>
                          <td className="py-4">
                            <div className="font-semibold">{entry.caseType}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Teeth: {entry.teethNo || 'N/A'}</div>
                          </td>
                          <td className="py-4 text-center">{entry.quantity}</td>
                          <td className="py-4 text-right text-muted-foreground">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice)}
                          </td>
                          <td className="py-4 text-right font-medium">
                            {new Intl.NumberFormat('vi-VN').format(entry.unitPrice * entry.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="flex justify-end pt-6 border-t-2 border-border">
                    <div className="w-64 space-y-3">
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
        }
      `}} />
    </div>
  )
}
