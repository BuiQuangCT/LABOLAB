'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TeethChart } from '@/components/TeethChart'
import { Plus, AlertTriangle, X, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="flex flex-col min-h-full pb-12 w-full max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Daily Record</h1>
          <p className="text-sm text-slate-500 mt-1">Manage cases for {todayFormatted}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openNewModal} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors shadow-sm">
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      <div className="w-full">
        {/* Main Table - Bento Box Style */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Table Header Controls */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="font-semibold text-slate-800 text-base">Monthly Records</h2>
            
            <div className="flex items-center gap-6">
              {/* Month Navigator */}
              <div className="flex items-center gap-2 bg-white rounded-sm border border-slate-200 px-1 py-1 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-50 rounded-sm text-slate-500 hover:text-slate-700 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="font-medium text-sm text-teal-700 w-28 text-center uppercase tracking-wider text-[11px]">
                  {monthFormatted}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-50 rounded-sm text-slate-500 hover:text-slate-700 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-medium uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">No</th>
                  <th className="px-5 py-3 w-24">Date</th>
                  <th className="px-5 py-3 w-40">Clinic</th>
                  <th className="px-5 py-3 w-40">Doctor</th>
                  <th className="px-5 py-3 w-40">Patient</th>
                  <th className="px-5 py-3 min-w-[200px]">Case</th>
                  <th className="px-5 py-3 w-20">Shade</th>
                  <th className="px-5 py-3 w-32">Teeth No.</th>
                  <th className="px-5 py-3 w-16 text-center">Qty</th>
                  <th className="px-5 py-3">Remark</th>
                  <th className="px-5 py-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {entries.map((entry, idx) => (
                    <motion.tr 
                      key={entry.id} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                      className={`hover:bg-slate-50 transition-colors ${entry.is_anomaly ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-5 py-3 text-center text-slate-400 text-xs font-mono">{entries.length - idx}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{entry.date.split('-').slice(1).join('/') + '/' + entry.date.split('-')[0]}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{entry.clinicName}</td>
                      <td className="px-5 py-3 text-slate-500">{entry.doctorName || '-'}</td>
                      <td className="px-5 py-3 text-slate-700">{entry.patientName}</td>
                      <td className="px-5 py-3 text-slate-700">
                        {entry.caseType}
                        {entry.is_anomaly && (
                          <span className="ml-2 inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm text-[10px] font-medium" title="Anomaly Detected">
                            <AlertTriangle size={10} className="mr-1"/> Anomaly
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{entry.shade || '-'}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        <span className="text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-1.5 py-0.5 inline-block">
                          {Array.isArray(entry.teethNo) ? entry.teethNo.join(' ') : (entry.teethNo || '-')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-slate-700">{entry.quantity}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 truncate max-w-[200px]">{entry.remark || '-'}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEditEntry(entry)} className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-sm transition-colors" title="Edit">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-sm transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {entries.length === 0 && !loading && (
                  <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-500 text-sm">No records found for {monthFormatted}.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={11} className="px-5 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-md w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col border border-slate-200"
            >
              {/* Header */}
              <div className="bg-slate-50 text-slate-800 px-6 py-4 font-semibold text-lg flex justify-between items-center sticky top-0 z-10 border-b border-slate-200">
                <span>{editingEntryId ? 'Edit Record' : 'New Record'}</span>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-sm transition-colors"><X size={18}/></button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Date & Category */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Date <span className="text-red-500">*</span></label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Category <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <button onClick={() => setGlobalCategory('fixed')} className={`flex-1 py-2 rounded-sm text-sm transition-all border ${globalCategory === 'fixed' ? 'bg-teal-50 border-teal-600 text-teal-700 font-medium shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        🔩 Fixed
                      </button>
                      <button onClick={() => setGlobalCategory('removable')} className={`flex-1 py-2 rounded-sm text-sm transition-all border ${globalCategory === 'removable' ? 'bg-teal-50 border-teal-600 text-teal-700 font-medium shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        🦷 Removable
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clinic & Doctor */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Clinic Name <span className="text-red-500">*</span></label>
                    {isAddingClinic ? (
                      <div className="flex gap-2">
                        <input autoFocus value={newClinicName} onChange={e => setNewClinicName(e.target.value)} placeholder="New Clinic..." className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-sm" />
                        <button onClick={handleSaveNewClinic} className="bg-teal-600 text-white px-3 rounded-sm text-xs font-medium hover:bg-teal-700">Save</button>
                        <button onClick={() => setIsAddingClinic(false)} className="bg-slate-100 text-slate-600 border border-slate-200 px-3 rounded-sm text-xs font-medium hover:bg-slate-200">Cancel</button>
                      </div>
                    ) : (
                      <select value={clinicName} onChange={e => {
                        if (e.target.value === '__NEW__') setIsAddingClinic(true)
                        else { setClinicName(e.target.value); setDoctorName('') }
                      }} className="w-full p-2.5 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 cursor-pointer shadow-sm">
                        <option value="">— Select Clinic —</option>
                        {uniqueClinics.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__NEW__" className="font-semibold text-teal-600 bg-teal-50">+ Add New Clinic</option>
                      </select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Doctor Name</label>
                    {isAddingDoctor ? (
                      <div className="flex gap-2">
                        <input autoFocus value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="New Doctor..." className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-sm" />
                        <button onClick={handleSaveNewDoctor} className="bg-teal-600 text-white px-3 rounded-sm text-xs font-medium hover:bg-teal-700">Save</button>
                        <button onClick={() => setIsAddingDoctor(false)} className="bg-slate-100 text-slate-600 border border-slate-200 px-3 rounded-sm text-xs font-medium hover:bg-slate-200">Cancel</button>
                      </div>
                    ) : (
                      <select value={doctorName} onChange={e => {
                        if (e.target.value === '__NEW__') setIsAddingDoctor(true)
                        else setDoctorName(e.target.value)
                      }} className="w-full p-2.5 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 cursor-pointer shadow-sm">
                        <option value="">— Select Doctor —</option>
                        {availableDoctors.map(d => <option key={d} value={d}>Dr. {d}</option>)}
                        <option value="__NEW__" className="font-semibold text-teal-600 bg-teal-50">+ Add New Doctor</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Dynamic Cases */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Case Details</span>
                    {!editingEntryId && <button onClick={addEmptyRow} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1"><Plus size={14}/> Add Case</button>}
                  </div>

                  {rows.map((row, idx) => {
                    const caseTypes = priceList.filter(p => p.category === globalCategory).map(p => p.item)
                    const standardPrice = priceList.find(p => p.item === row.caseType)?.price
                    const isAnomaly = standardPrice !== undefined && row.unitPrice !== standardPrice

                    return (
                      <div key={row.id} className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-200">
                          <span className="text-slate-600 text-[11px] font-mono tracking-widest font-semibold">CASE {idx + 1}</span>
                          <button onClick={() => deleteRow(row.id)} className="text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-sm p-1 px-2 text-xs font-medium transition-colors flex items-center gap-1"><Trash2 size={12}/> Remove</button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-3">
                            {addingMaterialRowId === row.id ? (
                              <div className="flex gap-2 flex-[1.5]">
                                <input autoFocus value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} placeholder="New Material..." className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600" />
                                <button onClick={() => handleSaveNewMaterial(row.id)} className="bg-teal-600 text-white px-3 rounded-sm text-xs font-medium">Save</button>
                                <button onClick={() => setAddingMaterialRowId(null)} className="bg-slate-100 border border-slate-200 text-slate-600 px-3 rounded-sm text-xs font-medium">Cancel</button>
                              </div>
                            ) : (
                              <select value={row.caseType} onChange={e => {
                                if (e.target.value === '__NEW__') setAddingMaterialRowId(row.id)
                                else updateRow(row.id, 'caseType', e.target.value)
                              }} className="flex-[1.5] p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 cursor-pointer">
                                <option value="">— Select Case —</option>
                                {caseTypes.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="__NEW__" className="font-semibold text-teal-600 bg-teal-50">+ Add New Material</option>
                              </select>
                            )}
                            <input value={row.patientName} onChange={e => updateRow(row.id, 'patientName', e.target.value)} placeholder="Patient Name" className="flex-1 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" />
                          </div>

                          {/* Teeth Section */}
                          {row.caseType && (
                            <div className="bg-slate-50 p-4 rounded-sm border border-slate-200">
                              {globalCategory === 'fixed' && (
                                <div className="mb-4">
                                  <TeethChart selectedTeeth={row.teethNo} onChange={teeth => updateRow(row.id, 'teethNo', teeth)} />
                                </div>
                              )}
                              {globalCategory === 'removable' && (
                                <div className="flex gap-2 mb-4">
                                  <button onClick={() => handleUpperLowerToggle(row.id, row, 'Upper')} className={`flex-1 py-2 rounded-sm text-xs font-medium transition-all border ${row.teethNo.includes('Upper') ? 'bg-teal-50 border-teal-600 text-teal-700' : 'bg-white border-slate-200 text-slate-500'}`}>Upper</button>
                                  <button onClick={() => handleUpperLowerToggle(row.id, row, 'Lower')} className={`flex-1 py-2 rounded-sm text-xs font-medium transition-all border ${row.teethNo.includes('Lower') ? 'bg-teal-50 border-teal-600 text-teal-700' : 'bg-white border-slate-200 text-slate-500'}`}>Lower</button>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Shade</span>
                                  <input value={row.shade} onChange={e => updateRow(row.id, 'shade', e.target.value)} placeholder="e.g. A2" className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Qty</span>
                                  <input type="number" min="1" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-center" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Unit Price</span>
                                  <div className="w-full flex items-center bg-white border border-slate-200 rounded-sm focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 overflow-hidden">
                                    <span className="pl-2 text-slate-400 text-xs">₫</span>
                                    <input type="number" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', Number(e.target.value))} className="w-full p-2 text-sm outline-none text-right font-medium text-slate-800" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Anomaly Warning */}
                              {isAnomaly && (
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-sm p-3 flex items-start gap-2">
                                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                  <div className="text-xs text-amber-800">
                                    <strong>Price Alert:</strong> The custom price differs from the standard pricelist ({new Intl.NumberFormat('vi-VN').format(standardPrice || 0)} ₫). This record will be marked as an anomaly.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <input value={row.remark} onChange={e => updateRow(row.id, 'remark', e.target.value)} placeholder="Case specific remark (optional)..." className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" />
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-md">
                <button onClick={closeModal} className="px-6 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="px-8 py-2 bg-teal-600 rounded-sm text-white text-sm font-medium hover:bg-teal-700 shadow-sm transition-all">
                  {editingEntryId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-md w-full max-w-sm overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
                <p className="text-slate-500 text-sm">Are you sure you want to delete this record? This action cannot be undone.</p>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onClick={() => setEntryToDelete(null)} className="flex-1 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 rounded-sm text-white text-sm font-medium hover:bg-red-700 shadow-sm transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
