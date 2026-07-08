'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TeethChart } from '@/components/TeethChart'
import { Plus, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react'

type CaseRow = {
  id: string
  caseType: string
  patientName: string
  shade: string
  teethNo: string[]
  quantity: number
  unitPrice: number
  remark: string
}

type Clinic = { clinic: string, doctor: string }
type PriceItem = { item: string, category: string, price: number }

const GROUP_A = ['Full Contour Zirconia','Multilayer Zirconia (4D Pro)','Porcelain Fused to Zirconia','Zirconia Veneer','Zirconia Post and Core','PMMA','PMMA Multilayer','Acrylic Teeth','Flexible Add One Unit','Flexible Base + One Unit','Upper Denture','Lower Denture','Upper Flexible','Lower Flexible']
const GROUP_B = ['Acrylic Full/Full','Flexible Full/Full','Acrylic Denture Base (QC20)','Rebasing (Heat Cure)','Repair','Acrylic Special Tray + Block','Clear Retainer (U+L)','Bleaching Tray Soft (U+L)','Reinforced Palatal/Lingual Bar','Dental Model Half (U or L)','Dental Model Half (U and L)','Dental Model One Cast (U or L)','Dental Model Full (U and L)']

export default function DailyRecordPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  
  const [globalCategory, setGlobalCategory] = useState<'fixed' | 'removable'>('fixed')
  const [clinicName, setClinicName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [rows, setRows] = useState<CaseRow[]>([])

  const [isAddingClinic, setIsAddingClinic] = useState(false)
  const [newClinicName, setNewClinicName] = useState('')
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)
  const [newDoctorName, setNewDoctorName] = useState('')
  const [addingMaterialRowId, setAddingMaterialRowId] = useState<string | null>(null)
  const [newMaterialName, setNewMaterialName] = useState('')

  const [clinics, setClinics] = useState<Clinic[]>([])
  const [priceList, setPriceList] = useState<PriceItem[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Format selected month
  const monthFormatted = selectedMonth.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  })

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + offset)
    setSelectedMonth(newDate)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0]

      const [clinicsRes, priceRes, entriesRes] = await Promise.all([
        supabase.from('clinics').select('clinic, doctor'),
        supabase.from('pricelist').select('item, category, price'),
        supabase.from('entries')
          .select('*')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
      ])
      
      if (clinicsRes.data) setClinics(clinicsRes.data)
      if (priceRes.data) setPriceList(priceRes.data)
      if (entriesRes.data) setEntries(entriesRes.data)
      setLoading(false)
    }
    fetchData()
  }, [selectedMonth])

  const addEmptyRow = () => {
    setRows(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      caseType: '',
      patientName: '',
      shade: '',
      teethNo: [],
      quantity: 1,
      unitPrice: 0,
      remark: ''
    }])
  }

  const openModal = () => {
    if (rows.length === 0) addEmptyRow()
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const getCaseGroup = (caseType: string) => {
    if (GROUP_A.includes(caseType)) return 'A'
    if (GROUP_B.includes(caseType)) return 'B'
    return 'C'
  }

  const updateRow = (id: string, field: keyof CaseRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value }
        
        if (field === 'teethNo') {
          newRow.quantity = value.length > 0 ? value.length : 1
        }
        
        if (field === 'caseType') {
          const itemInfo = priceList.find(p => p.item === value)
          if (itemInfo) newRow.unitPrice = itemInfo.price
          newRow.teethNo = [] // Reset teeth on case change
          newRow.quantity = 1
        }
        return newRow
      }
      return row
    }))
  }

  const deleteRow = (id: string) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter(row => row.id !== id))
  }

  const handleUpperLowerToggle = (rowId: string, row: CaseRow, val: 'Upper' | 'Lower') => {
    const current = [...row.teethNo]
    if (current.includes(val)) {
      updateRow(rowId, 'teethNo', current.filter(t => t !== val))
    } else {
      updateRow(rowId, 'teethNo', [...current, val])
    }
  }

  const handleSubmit = async () => {
    if (!clinicName || rows.some(r => !r.caseType || !r.patientName)) {
      alert("Please fill all required fields (Clinic, Case Type, Patient Name)")
      return
    }

    const payload = rows.map(row => ({
      date,
      clinicName,
      doctorName,
      patientName: row.patientName,
      caseType: row.caseType,
      shade: row.shade,
      teethNo: row.teethNo.join(' '),
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      remark: row.remark,
    }))

    const { data, error } = await supabase.from('entries').insert(payload).select()
    if (error) {
      alert("Error saving record: " + error.message)
    } else {
      alert("Record saved successfully!")
      // Refresh current month data if the new entry belongs to the selected month
      const entryMonth = new Date(date).getMonth()
      const entryYear = new Date(date).getFullYear()
      if (entryMonth === selectedMonth.getMonth() && entryYear === selectedMonth.getFullYear()) {
         setEntries(prev => [...(data || []), ...prev])
      }
      setRows([])
      closeModal()
    }
  }

  // --- Inline Handlers ---
  const handleSaveNewClinic = async () => {
    if (!newClinicName.trim()) return
    const name = newClinicName.trim()
    const { data, error } = await supabase.from('clinics').insert({ clinic: name, doctor: '' }).select().single()
    if (!error && data) {
      setClinics([...clinics, data])
      setClinicName(data.clinic)
      setDoctorName('')
      setIsAddingClinic(false)
      setNewClinicName('')
    } else if (error) { alert("Lỗi: " + error.message) }
  }

  const handleSaveNewDoctor = async () => {
    if (!newDoctorName.trim()) return
    if (!clinicName) {
      alert("Vui lòng chọn Clinic trước khi thêm Doctor!")
      return
    }
    const docName = newDoctorName.trim()
    const { data, error } = await supabase.from('clinics').insert({ clinic: clinicName, doctor: docName }).select().single()
    if (!error && data) {
      setClinics([...clinics, data])
      setDoctorName(data.doctor)
      setIsAddingDoctor(false)
      setNewDoctorName('')
    } else if (error) { alert("Lỗi: " + error.message) }
  }

  const handleSaveNewMaterial = async (rowId: string) => {
    if (!newMaterialName.trim()) return
    const name = newMaterialName.trim()
    const { data, error } = await supabase.from('pricelist').insert({ item: name, category: globalCategory, price: 0 }).select().single()
    if (!error && data) {
      setPriceList([...priceList, data])
      updateRow(rowId, 'caseType', data.item)
      setAddingMaterialRowId(null)
      setNewMaterialName('')
    } else if (error) { alert("Lỗi: " + error.message) }
  }

  const uniqueClinics = Array.from(new Set(clinics.map(c => c.clinic).filter(Boolean)))
  const availableDoctors = Array.from(new Set(clinics.filter(c => c.clinic === clinicName && c.doctor).map(c => c.doctor)))

  return (
    <div className="flex flex-col min-h-full pb-12 w-full mx-[-2rem] px-[2rem] mt-[-2rem] pt-[2rem]">
      
      {/* Top Header - Bleeds to edges */}
      <div className="bg-[#1a3324] text-white px-8 py-6 mb-6 mx-[-2rem] mt-[-2rem]">
        <h1 className="text-3xl font-serif tracking-tight">Daily Record</h1>
        <p className="text-[#a3d9b8] font-mono text-sm mt-1">{todayFormatted}</p>
      </div>

      <div className="w-full">
        {/* Main Table */}
        <div className="bg-white rounded-t-2xl border border-border overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs font-mono tracking-widest uppercase font-bold text-[#1a2035]">
              Monthly Records
            </span>
            
            <div className="flex items-center gap-6">
              {/* Month Navigator */}
              <div className="flex items-center gap-4 bg-white rounded-xl border border-border px-2 py-1.5 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-mono text-sm font-bold text-primary w-28 text-center">
                  {monthFormatted}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Add Record Button */}
              <button onClick={openModal} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-[#15803d] flex items-center gap-2 transition-all text-sm">
                <Plus size={16} /> Add Record
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-white font-mono tracking-widest uppercase bg-[#1a3324] border-b border-[#14532d]">
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
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className={`hover:bg-[#dcfce7] transition-colors ${entry.is_anomaly ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs font-mono">{entries.length - idx}</td>
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
                    <td className="px-4 py-3 font-mono text-xs text-primary">{entry.teethNo || '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{entry.quantity}</td>
                    <td className="px-4 py-3 text-xs text-foreground truncate max-w-[200px]">{entry.remark || '-'}</td>
                  </tr>
                ))}
                {entries.length === 0 && !loading && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm font-mono">No records found for {monthFormatted}.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm font-mono">Loading data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#1a3324] text-[#a3d9b8] px-6 py-4 font-mono text-xs tracking-[0.1em] uppercase flex justify-between items-center sticky top-0 z-10">
              <span>New Entry</span>
              <button onClick={closeModal} className="text-white hover:text-primary-foreground transition-colors p-1"><X size={18}/></button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 flex-1">
              
              {/* Date & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Category <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <button onClick={() => setGlobalCategory('fixed')} className={`flex-1 py-2 rounded-xl text-sm transition-all ${globalCategory === 'fixed' ? 'bg-[#e8f5ee] border-2 border-primary text-primary font-bold' : 'bg-[#f8f9fb] border-2 border-border text-muted-foreground'}`}>
                      🔩 Fixed
                    </button>
                    <button onClick={() => setGlobalCategory('removable')} className={`flex-1 py-2 rounded-xl text-sm transition-all ${globalCategory === 'removable' ? 'bg-[#e8f5ee] border-2 border-primary text-primary font-bold' : 'bg-[#f8f9fb] border-2 border-border text-muted-foreground'}`}>
                      🦷 Removable
                    </button>
                  </div>
                </div>
              </div>

              {/* Clinic & Doctor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Clinic Name <span className="text-red-500">*</span></label>
                  {isAddingClinic ? (
                    <div className="flex gap-2">
                      <input autoFocus value={newClinicName} onChange={e => setNewClinicName(e.target.value)} placeholder="New Clinic..." className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary" />
                      <button onClick={handleSaveNewClinic} className="bg-primary text-white px-3 rounded-xl text-xs font-bold">Lưu</button>
                      <button onClick={() => setIsAddingClinic(false)} className="bg-secondary px-3 rounded-xl text-xs font-bold">Hủy</button>
                    </div>
                  ) : (
                    <select value={clinicName} onChange={e => {
                      if (e.target.value === '__NEW__') setIsAddingClinic(true)
                      else { setClinicName(e.target.value); setDoctorName('') }
                    }} className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary cursor-pointer">
                      <option value="">— Select Clinic —</option>
                      {uniqueClinics.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__NEW__" className="font-bold text-primary">+ Thêm Clinic mới</option>
                    </select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Doctor Name</label>
                  {isAddingDoctor ? (
                    <div className="flex gap-2">
                      <input autoFocus value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="New Doctor..." className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary" />
                      <button onClick={handleSaveNewDoctor} className="bg-primary text-white px-3 rounded-xl text-xs font-bold">Lưu</button>
                      <button onClick={() => setIsAddingDoctor(false)} className="bg-secondary px-3 rounded-xl text-xs font-bold">Hủy</button>
                    </div>
                  ) : (
                    <select value={doctorName} onChange={e => {
                      if (e.target.value === '__NEW__') setIsAddingDoctor(true)
                      else setDoctorName(e.target.value)
                    }} className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary cursor-pointer">
                      <option value="">— Select Doctor —</option>
                      {availableDoctors.map(d => <option key={d} value={d}>Dr. {d}</option>)}
                      <option value="__NEW__" className="font-bold text-primary">+ Thêm Doctor mới</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Dynamic Cases */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">Case Type & Patient Name</span>
                  <button onClick={addEmptyRow} className="bg-primary text-white rounded-md px-2 py-0.5 text-sm font-bold shadow-sm">+</button>
                </div>

                {rows.map((row, idx) => {
                  const caseTypes = priceList.filter(p => p.category === globalCategory).map(p => p.item)
                  const group = getCaseGroup(row.caseType)

                  return (
                    <div key={row.id} className="border-2 border-primary rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-[#e8f5ee] px-4 py-1.5 flex justify-between items-center border-b border-[#bbddd0]">
                        <span className="text-primary text-[11px] font-mono tracking-widest font-bold">CASE {idx + 1}</span>
                        <button onClick={() => deleteRow(row.id)} className="text-red-400 hover:text-red-600 border border-red-400 rounded-md px-2 py-0.5 text-xs font-bold bg-white leading-none">−</button>
                      </div>
                      <div className="p-3 space-y-3 bg-white">
                        <div className="flex flex-col sm:flex-row gap-2">
                          {addingMaterialRowId === row.id ? (
                            <div className="flex gap-2 flex-[1.5]">
                              <input autoFocus value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} placeholder="Tên Case mới" className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary" />
                              <button onClick={() => handleSaveNewMaterial(row.id)} className="bg-primary text-white px-3 rounded-xl text-xs font-bold">Lưu</button>
                              <button onClick={() => setAddingMaterialRowId(null)} className="bg-secondary px-3 rounded-xl text-xs font-bold">Hủy</button>
                            </div>
                          ) : (
                            <select value={row.caseType} onChange={e => {
                              if (e.target.value === '__NEW__') setAddingMaterialRowId(row.id)
                              else updateRow(row.id, 'caseType', e.target.value)
                            }} className="flex-[1.5] p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary cursor-pointer font-medium">
                              <option value="">— Select Case —</option>
                              {caseTypes.map(c => <option key={c} value={c}>{c}</option>)}
                              <option value="__NEW__" className="font-bold text-primary bg-primary/5">+ Thêm Case mới</option>
                            </select>
                          )}
                          <input value={row.patientName} onChange={e => updateRow(row.id, 'patientName', e.target.value)} placeholder="Patient Name" className="flex-1 p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary font-medium" />
                        </div>

                        {/* Teeth Section - Dynamic based on Group */}
                        {row.caseType && (
                          <div className="bg-[#f8f9fb] p-3 rounded-xl border border-border">
                            {group === 'A' && (
                              <div className="mb-3">
                                <TeethChart selectedTeeth={row.teethNo} onChange={teeth => updateRow(row.id, 'teethNo', teeth)} />
                              </div>
                            )}
                            {group === 'B' && (
                              <div className="flex gap-2 mb-3">
                                <button onClick={() => handleUpperLowerToggle(row.id, row, 'Upper')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${row.teethNo.includes('Upper') ? 'bg-[#e8f5ee] border-2 border-primary text-primary' : 'bg-white border-2 border-border text-muted-foreground'}`}>Upper</button>
                                <button onClick={() => handleUpperLowerToggle(row.id, row, 'Lower')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${row.teethNo.includes('Lower') ? 'bg-[#e8f5ee] border-2 border-primary text-primary' : 'bg-white border-2 border-border text-muted-foreground'}`}>Lower</button>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-3 items-center">
                              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                                <span className="text-xs text-muted-foreground">Shade:</span>
                                <input value={row.shade} onChange={e => updateRow(row.id, 'shade', e.target.value)} placeholder="e.g. A2" className="flex-1 p-2 bg-white border border-border rounded-lg text-sm outline-none focus:border-primary" />
                              </div>
                              <div className="flex items-center gap-2 w-24">
                                <span className="text-xs text-muted-foreground">Qty:</span>
                                <input type="number" min="1" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Number(e.target.value))} className="w-full p-2 bg-white border border-border rounded-lg text-sm outline-none focus:border-primary text-center font-bold" />
                              </div>
                              <div className="flex items-center gap-2 flex-[1.5] min-w-[140px]">
                                <span className="text-xs text-muted-foreground">Unit Price:</span>
                                <input type="number" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', Number(e.target.value))} className="w-full p-2 bg-white border border-border rounded-lg text-sm outline-none focus:border-primary text-right font-bold text-primary" />
                              </div>
                            </div>
                          </div>
                        )}

                        <input value={row.remark} onChange={e => updateRow(row.id, 'remark', e.target.value)} placeholder="Case specific remark (optional)..." className="w-full p-2.5 bg-[#f8f9fb] border border-border rounded-xl text-sm outline-none focus:border-primary" />
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-secondary/30 border-t border-border flex gap-3 sticky bottom-0 z-10 rounded-b-2xl">
              <button onClick={closeModal} className="flex-1 py-3 bg-[#f0f2f5] border border-border rounded-xl text-muted-foreground font-semibold hover:bg-[#e2e8f0] transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="flex-[2] py-3 bg-primary border border-[#15803d] rounded-xl text-white font-bold hover:bg-primary/90 shadow-md transition-all">+ Add to Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
