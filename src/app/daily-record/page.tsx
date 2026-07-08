'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TeethChart } from '@/components/TeethChart'
import { Plus, Trash2, Calendar, User, Save, AlertTriangle } from 'lucide-react'

type CaseRow = {
  id: string
  category: 'fixed' | 'removable'
  caseType: string
  shade: string
  teethNo: string[]
  quantity: number
  unitPrice: number
  remark: string
}

type Clinic = { clinic: string, doctor: string }
type PriceItem = { item: string, category: string, price: number }

export default function DailyRecordPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [clinicName, setClinicName] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [patientName, setPatientName] = useState('')
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [clinicsRes, priceRes, entriesRes] = await Promise.all([
        supabase.from('clinics').select('clinic, doctor'),
        supabase.from('pricelist').select('item, category, price'),
        supabase.from('entries').select('*').order('created_at', { ascending: false }).limit(50)
      ])
      if (clinicsRes.data) setClinics(clinicsRes.data)
      if (priceRes.data) setPriceList(priceRes.data)
      if (entriesRes.data) setEntries(entriesRes.data)

      // Add first empty row
      addEmptyRow()
      setLoading(false)
    }
    fetchData()
  }, [])

  const addEmptyRow = () => {
    setRows(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      category: 'fixed',
      caseType: '',
      shade: '',
      teethNo: [],
      quantity: 1,
      unitPrice: 0,
      remark: ''
    }])
  }

  const updateRow = (id: string, field: keyof CaseRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value }

        // Auto-calculate quantity based on teeth selection
        if (field === 'teethNo') {
          newRow.quantity = value.length > 0 ? value.length : 1
        }

        // Auto-fill price when caseType changes
        if (field === 'caseType') {
          const itemInfo = priceList.find(p => p.item === value)
          if (itemInfo) {
            newRow.unitPrice = itemInfo.price
          }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicName || !patientName || rows.some(r => !r.caseType)) {
      alert("Please fill all required fields")
      return
    }

    const payload = rows.map(row => ({
      date,
      clinicName,
      doctorName,
      patientName,
      caseType: row.caseType,
      shade: row.shade,
      teethNo: row.teethNo.join(' '),
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      remark: row.remark,
      // is_anomaly is handled by DB trigger, we just send false or ignore it
    }))

    const { data, error } = await supabase.from('entries').insert(payload).select()
    if (error) {
      alert("Error saving record: " + error.message)
    } else {
      alert("Record saved successfully!")
      setEntries(prev => [...(data || []), ...prev])
      // Reset form
      setPatientName('')
      setRows([])
    }
  }

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

  const handleSaveNewMaterial = async (rowId: string, category: string) => {
    if (!newMaterialName.trim()) return
    const name = newMaterialName.trim()
    const { data, error } = await supabase.from('pricelist').insert({ item: name, category, price: 0 }).select().single()
    if (!error && data) {
      setPriceList([...priceList, data])
      updateRow(rowId, 'caseType', data.item)
      setAddingMaterialRowId(null)
      setNewMaterialName('')
    } else if (error) { alert("Lỗi: " + error.message) }
  }

  // Get unique clinics for dropdown
  const uniqueClinics = Array.from(new Set(clinics.map(c => c.clinic).filter(Boolean)))

  // Get doctors for selected clinic
  const availableDoctors = Array.from(new Set(clinics.filter(c => c.clinic === clinicName && c.doctor).map(c => c.doctor)))

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Record</h1>
        <p className="text-muted-foreground mt-1">Record new lab cases and manage daily operations</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="p-6 bg-secondary/20 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-4">
            <User size={20} className="text-primary" /> Patient Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-10 p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Clinic</label>
              {isAddingClinic ? (
                <div className="flex gap-2">
                  <input autoFocus value={newClinicName} onChange={e => setNewClinicName(e.target.value)} placeholder="Tên Clinic mới" className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                  <button type="button" onClick={handleSaveNewClinic} className="bg-primary text-white px-3 rounded-xl font-medium text-sm">Lưu</button>
                  <button type="button" onClick={() => setIsAddingClinic(false)} className="bg-secondary px-3 rounded-xl font-medium text-sm hover:bg-secondary/80">Hủy</button>
                </div>
              ) : (
                <select required value={clinicName} onChange={e => {
                  if (e.target.value === '__NEW__') setIsAddingClinic(true)
                  else { setClinicName(e.target.value); setDoctorName('') }
                }} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white">
                  <option value="">Select Clinic</option>
                  {uniqueClinics.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__NEW__" className="font-bold text-primary bg-primary/5">+ Thêm Clinic mới</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Doctor</label>
              {isAddingDoctor ? (
                <div className="flex gap-2">
                  <input autoFocus value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="Tên Doctor mới" className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                  <button type="button" onClick={handleSaveNewDoctor} className="bg-primary text-white px-3 rounded-xl font-medium text-sm">Lưu</button>
                  <button type="button" onClick={() => setIsAddingDoctor(false)} className="bg-secondary px-3 rounded-xl font-medium text-sm hover:bg-secondary/80">Hủy</button>
                </div>
              ) : (
                <select value={doctorName} onChange={e => {
                  if (e.target.value === '__NEW__') setIsAddingDoctor(true)
                  else setDoctorName(e.target.value)
                }} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white">
                  <option value="">Select Doctor</option>
                  {availableDoctors.map(d => <option key={d} value={d}>Dr. {d}</option>)}
                  <option value="__NEW__" className="font-bold text-primary bg-primary/5">+ Thêm Doctor mới</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient Name</label>
              <input required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Patient Name" className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white" />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Plus size={20} className="text-primary" /> Case Details
          </h2>

          {rows.map((row, index) => {
            const caseTypes = priceList.filter(p => p.category === row.category).map(p => p.item)

            return (
              <div key={row.id} className="relative p-6 bg-secondary/10 border border-border rounded-2xl space-y-6">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white">
                  {index + 1}
                </div>

                {rows.length > 1 && (
                  <button type="button" onClick={() => deleteRow(row.id)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive bg-white rounded-full hover:bg-destructive/10 shadow-sm transition-all">
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <select value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm">
                      <option value="fixed">Fixed</option>
                      <option value="removable">Removable</option>
                    </select>
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Type / Material</label>
                    {addingMaterialRowId === row.id ? (
                      <div className="flex gap-2">
                        <input autoFocus value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} placeholder="Tên Material mới" className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                        <button type="button" onClick={() => handleSaveNewMaterial(row.id, row.category)} className="bg-primary text-white px-3 rounded-xl font-medium text-sm">Lưu</button>
                        <button type="button" onClick={() => setAddingMaterialRowId(null)} className="bg-secondary px-3 rounded-xl font-medium text-sm hover:bg-secondary/80">Hủy</button>
                      </div>
                    ) : (
                      <select required value={row.caseType} onChange={e => {
                        if (e.target.value === '__NEW__') setAddingMaterialRowId(row.id)
                        else updateRow(row.id, 'caseType', e.target.value)
                      }} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm font-medium">
                        <option value="">Select Material</option>
                        {caseTypes.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__NEW__" className="font-bold text-primary bg-primary/5">+ Thêm Material mới</option>
                      </select>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Shade</label>
                    <input value={row.shade} onChange={e => updateRow(row.id, 'shade', e.target.value)} placeholder="e.g. A2" className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Qty</label>
                    <input type="number" min="1" value={row.quantity} onChange={e => updateRow(row.id, 'quantity', Number(e.target.value))} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Unit Price (VND)</label>
                    <input type="number" value={row.unitPrice} onChange={e => updateRow(row.id, 'unitPrice', Number(e.target.value))} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm text-primary font-semibold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Select Teeth</label>
                  <TeethChart selectedTeeth={row.teethNo} onChange={(teeth) => updateRow(row.id, 'teethNo', teeth)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Remark / Notes</label>
                  <input value={row.remark} onChange={e => updateRow(row.id, 'remark', e.target.value)} placeholder="Additional instructions..." className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-primary outline-none bg-white text-sm" />
                </div>
              </div>
            )
          })}

          <button type="button" onClick={addEmptyRow} className="w-full py-4 border-2 border-dashed border-primary/30 text-primary font-medium rounded-2xl hover:bg-primary/5 hover:border-primary transition-all flex items-center justify-center gap-2">
            <Plus size={20} /> Add Another Case Row
          </button>
        </div>

        <div className="p-6 bg-secondary/30 border-t border-border flex justify-end">
          <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-md hover:shadow-lg flex items-center gap-2">
            <Save size={20} /> Save Entire Record
          </button>
        </div>
      </form>

      {/* Recent Entries */}
      <div className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">Recent Entries</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Clinic</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Case Info</th>
                <th className="px-6 py-4 font-medium">Teeth</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(entry => (
                <tr key={entry.id} className={`hover:bg-secondary/30 transition-colors ${entry.is_anomaly ? 'bg-amber-50 hover:bg-amber-100/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{new Date(entry.date).toLocaleDateString()}</div>
                    <div className="text-muted-foreground mt-0.5">{entry.clinicName}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{entry.patientName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.caseType}</span>
                      {entry.is_anomaly && (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-bold" title="Anomaly Detected by ML model">
                          <AlertTriangle size={12} /> Anomaly
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Shade: {entry.shade || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono bg-secondary px-2 py-1 rounded inline-block">
                      {entry.teethNo || 'None'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Qty: {entry.quantity}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-primary">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.unitPrice * entry.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
