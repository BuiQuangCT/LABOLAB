'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TeethChart } from '@/components/TeethChart'
import { Plus, AlertTriangle, X, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react'
import { motion } from 'framer-motion'

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

type Clinic = { clinic: string, doctor: string, address?: string, phone?: string, email?: string }
type PriceItem = { item: string, category: string, price: number }

const GROUP_A = ['Full Contour Zirconia','Multilayer Zirconia (4D Pro)','Porcelain Fused to Zirconia','Zirconia Veneer','Zirconia Post and Core','PMMA','PMMA Multilayer','Acrylic Teeth','Flexible Add One Unit','Flexible Base + One Unit','Upper Denture','Lower Denture','Upper Flexible','Lower Flexible']
const GROUP_B = ['Acrylic Full/Full','Flexible Full/Full','Acrylic Denture Base (QC20)','Rebasing (Heat Cure)','Repair','Acrylic Special Tray + Block','Clear Retainer (U+L)','Bleaching Tray Soft (U+L)','Reinforced Palatal/Lingual Bar','Dental Model Half (U or L)','Dental Model Half (U and L)','Dental Model One Cast (U or L)','Dental Model Full (U and L)']

export default function DailyRecordPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
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

  const openNewModal = () => {
    setEditingEntryId(null)
    setDate(new Date().toISOString().split('T')[0])
    setClinicName('')
    setDoctorName('')
    setRows([{
      id: Math.random().toString(36).substr(2, 9),
      caseType: '',
      patientName: '',
      shade: '',
      teethNo: [],
      quantity: 1,
      unitPrice: 0,
      remark: ''
    }])
    setIsModalOpen(true)
  }

  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id)
    setDate(entry.date)
    setClinicName(entry.clinicName)
    setDoctorName(entry.doctorName || '')
    const priceItem = priceList.find(p => p.item === entry.caseType)
    if (priceItem) {
      setGlobalCategory(priceItem.category as 'fixed' | 'removable')
    } else {
      setGlobalCategory('fixed')
    }
    
    setRows([{
      id: Math.random().toString(36).substr(2, 9),
      caseType: entry.caseType,
      patientName: entry.patientName,
      shade: entry.shade || '',
      teethNo: Array.isArray(entry.teethNo) ? entry.teethNo : [],
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      remark: entry.remark || ''
    }])
    setIsModalOpen(true)
  }

  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id)
  }

  const confirmDelete = async () => {
    if (!entryToDelete) return
    const { error } = await supabase.from('entries').delete().eq('id', entryToDelete)
    if (error) {
      alert("Lỗi khi xóa: " + error.message)
    } else {
      setEntries(prev => prev.filter(e => e.id !== entryToDelete))
      setEntryToDelete(null)
    }
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

    if (editingEntryId) {
      const row = rows[0]
      const standardPrice = priceList.find(p => p.item === row.caseType)?.price || 0
      const is_anomaly = row.unitPrice !== standardPrice

      const payload = {
        date,
        clinicName,
        doctorName,
        patientName: row.patientName,
        caseType: row.caseType,
        shade: row.shade,
        teethNo: row.teethNo,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        remark: row.remark,
        is_anomaly
      }
      const { data, error } = await supabase.from('entries').update(payload).eq('id', editingEntryId).select()
      if (error) {
        alert("Error updating record: " + error.message)
      } else {
        alert("Record updated successfully!")
        setEntries(prev => prev.map(e => e.id === editingEntryId ? (data?.[0] || e) : e))
        closeModal()
      }
    } else {
      const payload = rows.map(row => {
        const standardPrice = priceList.find(p => p.item === row.caseType)?.price || 0
        const is_anomaly = row.unitPrice !== standardPrice
        
        return {
          date,
          clinicName,
          doctorName,
          patientName: row.patientName,
          caseType: row.caseType,
          shade: row.shade,
          teethNo: row.teethNo,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          remark: row.remark,
          is_anomaly
        }
      })

      const { data, error } = await supabase.from('entries').insert(payload).select()
      if (error) {
        alert("Error saving record: " + error.message)
      } else {
        alert("Record saved successfully!")
        // Refresh current month data if the new entry belongs to the selected month
        const entryMonth = new Date(date).getMonth()
        const entryYear = new Date(date).getFullYear()
        if (entryMonth === selectedMonth.getMonth() && entryYear === selectedMonth.getFullYear()) {
           setEntries(prev => {
             const updated = [...(data || []), ...prev]
             return updated.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
           })
        }
        setRows([])
        closeModal()
      }
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
    
    // Tìm clinic hiện tại để sao chép địa chỉ, sđt, email
    const existingClinic = clinics.find(c => c.clinic === clinicName)
    const payload = {
      clinic: clinicName,
      doctor: docName,
      address: existingClinic?.address || '',
      phone: existingClinic?.phone || '',
      email: existingClinic?.email || ''
    }

    const { data, error } = await supabase.from('clinics').insert(payload).select().single()
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
    <div className="flex flex-col min-h-full pb-12 w-full">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Daily Record</h1>
          <p className="text-muted-foreground mt-1">Manage cases for {todayFormatted}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openNewModal} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
            <Plus size={18} /> New Record
          </button>
        </div>
      </div>

      <div className="w-full">
        {/* Main Table */}
        <div className="bg-white rounded-t-2xl border border-border overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="bg-secondary/30 border-b border-border px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-bold text-lg text-foreground font-serif">Monthly Records</h2>
            
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

            </div>
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
                  <th className="px-5 py-4 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry, idx) => (
                  <motion.tr 
                  key={entry.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.5) }}
                  className={`hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${entry.is_anomaly ? 'bg-amber-50/50' : ''}`}
                >
                    <td className="px-5 py-4 text-center text-muted-foreground text-xs font-mono">{entries.length - idx}</td>
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
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEditEntry(entry)} className="p-1.5 text-blue-500 hover:bg-blue-50 hover:shadow-sm rounded-md transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 hover:shadow-sm rounded-md transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {entries.length === 0 && !loading && (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-muted-foreground text-sm font-mono">No records found for {monthFormatted}.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={11} className="px-4 py-12 text-center text-muted-foreground text-sm font-mono">Loading data...</td></tr>
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
            <div className="bg-secondary/50 text-foreground px-6 py-4 font-serif font-bold text-xl flex justify-between items-center sticky top-0 z-10 border-b border-border">
              <span>{editingEntryId ? 'Edit Entry' : 'New Entry'}</span>
              <button onClick={closeModal} className="text-muted-foreground hover:bg-muted p-1.5 rounded-lg transition-colors"><X size={20}/></button>
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
                    <button onClick={() => setGlobalCategory('fixed')} className={`flex-1 py-2 rounded-xl text-sm transition-all border-2 ${globalCategory === 'fixed' ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' : 'bg-white border-transparent text-muted-foreground hover:bg-muted'}`}>
                      🔩 Fixed
                    </button>
                    <button onClick={() => setGlobalCategory('removable')} className={`flex-1 py-2 rounded-xl text-sm transition-all border-2 ${globalCategory === 'removable' ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' : 'bg-white border-transparent text-muted-foreground hover:bg-muted'}`}>
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
                  {!editingEntryId && <button onClick={addEmptyRow} className="bg-primary text-white rounded-md px-2 py-0.5 text-sm font-bold shadow-sm">+</button>}
                </div>

                {rows.map((row, idx) => {
                  const caseTypes = priceList.filter(p => p.category === globalCategory).map(p => p.item)
                  const group = getCaseGroup(row.caseType)
                  const standardPrice = priceList.find(p => p.item === row.caseType)?.price
                  const isAnomaly = standardPrice !== undefined && row.unitPrice !== standardPrice

                  return (
                    <div key={row.id} className="border-2 border-primary rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-primary/5 px-4 py-2 flex justify-between items-center border-b border-primary/20">
                        <span className="text-primary text-[11px] font-mono tracking-widest font-bold">CASE {idx + 1}</span>
                        <button onClick={() => deleteRow(row.id)} className="text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-md p-1 px-2 text-xs font-bold bg-white shadow-sm border border-rose-200 leading-none transition-colors">Delete</button>
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

                        {/* Teeth Section - Dynamic based on Category */}
                        {row.caseType && (
                          <div className="bg-[#f8f9fb] p-3 rounded-xl border border-border">
                            {globalCategory === 'fixed' && (
                              <div className="mb-3">
                                <TeethChart selectedTeeth={row.teethNo} onChange={teeth => updateRow(row.id, 'teethNo', teeth)} />
                              </div>
                            )}
                            {globalCategory === 'removable' && (
                              <div className="flex gap-2 mb-3">
                                <button onClick={() => handleUpperLowerToggle(row.id, row, 'Upper')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${row.teethNo.includes('Upper') ? 'bg-red-50 border-2 border-primary text-primary' : 'bg-white border-2 border-border text-muted-foreground'}`}>Upper</button>
                                <button onClick={() => handleUpperLowerToggle(row.id, row, 'Lower')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${row.teethNo.includes('Lower') ? 'bg-red-50 border-2 border-primary text-primary' : 'bg-white border-2 border-border text-muted-foreground'}`}>Lower</button>
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
                                <div className="flex-1 p-2 bg-white border border-border rounded-lg focus-within:border-primary">
                                  <input type="number" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', Number(e.target.value))} className="w-full text-sm outline-none text-right font-bold text-primary" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Anomaly Warning */}
                            {isAnomaly && (
                              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-700">
                                  <strong>Cảnh báo:</strong> Giá tiền không khớp với bảng giá chuẩn (giá chuẩn: {new Intl.NumberFormat('vi-VN').format(standardPrice || 0)}). Đơn hàng sẽ được gắn cờ Anomaly.
                                </div>
                              </div>
                            )}
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
              <button onClick={closeModal} className="flex-1 py-3 bg-secondary border border-border rounded-xl text-muted-foreground font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="flex-[2] py-3 bg-primary rounded-xl text-primary-foreground font-bold hover:bg-primary/90 shadow-sm transition-all">
                {editingEntryId ? 'Update Record' : '+ Add to Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Xác nhận xóa</h3>
              <p className="text-muted-foreground text-sm">Bạn có chắc chắn muốn xóa record này không? Hành động này không thể hoàn tác.</p>
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex gap-3">
              <button onClick={() => setEntryToDelete(null)} className="flex-1 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-[#f0f2f5] transition-colors">Hủy</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 border border-red-600 rounded-xl text-white font-bold hover:bg-red-600 shadow-sm transition-all">Xóa record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
