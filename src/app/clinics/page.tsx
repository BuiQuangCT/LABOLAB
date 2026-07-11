'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit, Building, Tags, Search, Loader2, AlertTriangle, UserPlus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ClinicRow = { id: string, clinic: string, doctor: string, address: string, phone: string, email: string }
type PriceItem = { id: string, item: string, unit: string, price: number, category: string, teeth_group: string }

type GroupedClinic = {
  name: string
  address: string
  phone: string
  email: string
  doctors: { id: string, name: string }[]
  rowIds: string[]
}

export default function ClinicsAndPricePage() {
  const [activeTab, setActiveTab] = useState<'clinics' | 'pricelist'>('clinics')
  const [clinics, setClinics] = useState<ClinicRow[]>([])
  const [priceList, setPriceList] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ type: 'clinic_group' | 'doctor' | 'price', id: string, name?: string } | null>(null)

  const [showClinicForm, setShowClinicForm] = useState(false)
  const [clinicForm, setClinicForm] = useState({ clinic: '', doctor: '', address: '', phone: '', email: '' })
  
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [priceForm, setPriceForm] = useState({ item: '', unit: 'Răng', price: 0, category: 'fixed', teeth_group: 'A' })

  const [editingClinic, setEditingClinic] = useState<(GroupedClinic & { originalName: string }) | null>(null)
  const [addingDoctorTo, setAddingDoctorTo] = useState<GroupedClinic | null>(null)
  const [newDoctorName, setNewDoctorName] = useState('')
  const [editingDoctor, setEditingDoctor] = useState<{ id: string, clinic: string, originalName: string, name: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [clinicsRes, priceRes] = await Promise.all([
      supabase.from('clinics').select('*').order('created_at', { ascending: false }),
      supabase.from('pricelist').select('*').order('created_at', { ascending: false })
    ])
    if (clinicsRes.data) setClinics(clinicsRes.data)
    if (priceRes.data) setPriceList(priceRes.data)
    setLoading(false)
  }

  const groupedClinics = useMemo(() => {
    const map = new Map<string, GroupedClinic>()
    clinics.forEach(c => {
      if (!map.has(c.clinic)) {
        map.set(c.clinic, { name: c.clinic, address: '', phone: '', email: '', doctors: [], rowIds: [] })
      }
      const group = map.get(c.clinic)!
      group.rowIds.push(c.id)
      if (c.doctor) group.doctors.push({ id: c.id, name: c.doctor })
      
      if (!group.address && c.address) group.address = c.address
      if (!group.phone && c.phone) group.phone = c.phone
      if (!group.email && c.email) group.email = c.email
    })
    return Array.from(map.values())
  }, [clinics])

  const filteredGroupedClinics = useMemo(() => groupedClinics.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.doctors.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [groupedClinics, searchTerm])

  const filteredPrices = useMemo(() => priceList.filter(p => 
    p.item.toLowerCase().includes(searchTerm.toLowerCase())
  ), [priceList, searchTerm])

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from('clinics').insert([clinicForm]).select()
    if (data) {
      setClinics([data[0], ...clinics])
      setShowClinicForm(false)
      setClinicForm({ clinic: '', doctor: '', address: '', phone: '', email: '' })
    }
  }

  const handleSaveEditClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClinic) return
    const payload = { clinic: editingClinic.name, address: editingClinic.address, phone: editingClinic.phone, email: editingClinic.email }
    const { data, error } = await supabase.from('clinics').update(payload).in('id', editingClinic.rowIds).select()
    if (!error) {
      if (editingClinic.name !== editingClinic.originalName) {
        await supabase.from('entries').update({ clinicName: editingClinic.name }).eq('clinicName', editingClinic.originalName)
      }
      setClinics(clinics.map(c => editingClinic.rowIds.includes(c.id) ? { ...c, ...payload } : c))
      setEditingClinic(null)
    } else {
      alert("Error updating clinic: " + error.message)
    }
  }

  const handleSaveEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDoctor || !editingDoctor.name.trim()) return
    const newName = editingDoctor.name.trim()
    const { error } = await supabase.from('clinics').update({ doctor: newName }).eq('id', editingDoctor.id)
    if (!error) {
      if (newName !== editingDoctor.originalName) {
        await supabase.from('entries')
          .update({ doctorName: newName })
          .eq('clinicName', editingDoctor.clinic)
          .eq('doctorName', editingDoctor.originalName)
      }
      setClinics(clinics.map(c => c.id === editingDoctor.id ? { ...c, doctor: newName } : c))
      setEditingDoctor(null)
    } else {
      alert("Error updating doctor: " + error.message)
    }
  }

  const handleSaveNewDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addingDoctorTo || !newDoctorName.trim()) return
    const payload = {
      clinic: addingDoctorTo.name,
      doctor: newDoctorName.trim(),
      address: addingDoctorTo.address,
      phone: addingDoctorTo.phone,
      email: addingDoctorTo.email
    }
    const { data, error } = await supabase.from('clinics').insert([payload]).select()
    if (data) {
      setClinics([data[0], ...clinics])
      setAddingDoctorTo(null)
      setNewDoctorName('')
    } else {
      alert("Error adding doctor: " + error?.message)
    }
  }

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from('pricelist').insert([priceForm]).select()
    if (data) {
      setPriceList([data[0], ...priceList])
      setShowPriceForm(false)
      setPriceForm({ item: '', unit: 'Răng', price: 0, category: 'fixed', teeth_group: 'A' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteModal) return
    const { type, id } = deleteModal
    
    if (type === 'clinic_group') {
      const group = groupedClinics.find(g => g.name === id)
      if (group) {
        await supabase.from('clinics').delete().in('id', group.rowIds)
        setClinics(clinics.filter(c => c.clinic !== id))
      }
    } else if (type === 'doctor') {
      const row = clinics.find(c => c.id === id)
      if (row) {
        const group = groupedClinics.find(g => g.name === row.clinic)
        if (group && group.rowIds.length === 1) {
          await supabase.from('clinics').update({ doctor: '' }).eq('id', id)
          setClinics(clinics.map(c => c.id === id ? { ...c, doctor: '' } : c))
        } else {
          await supabase.from('clinics').delete().eq('id', id)
          setClinics(clinics.filter(c => c.id !== id))
        }
      }
    } else if (type === 'price') {
      await supabase.from('pricelist').delete().eq('id', id)
      setPriceList(priceList.filter(p => p.id !== id))
    }
    
    setDeleteModal(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Master Data</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your clinics and price lists</p>
        </div>
        <div className="flex bg-white p-1 rounded-sm shadow-sm border border-slate-200 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('clinics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm text-sm font-medium transition-all ${activeTab === 'clinics' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Building size={16} /> Clinics
          </button>
          <button 
            onClick={() => setActiveTab('pricelist')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-sm text-sm font-medium transition-all ${activeTab === 'pricelist' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Tags size={16} /> Price List
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => activeTab === 'clinics' ? setShowClinicForm(!showClinicForm) : setShowPriceForm(!showPriceForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-sm hover:bg-teal-700 transition-all shadow-sm"
          >
            <Plus size={16} /> Add {activeTab === 'clinics' ? 'Clinic' : 'Item'}
          </button>
        </div>

        {/* Add Clinic Form */}
        <AnimatePresence>
          {showClinicForm && activeTab === 'clinics' && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
              onSubmit={handleAddClinic}
            >
              <div className="p-5 bg-teal-50/50 border-b border-teal-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <input required placeholder="Clinic Name" value={clinicForm.clinic} onChange={e => setClinicForm({...clinicForm, clinic: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm" />
                <input required placeholder="Doctor Name" value={clinicForm.doctor} onChange={e => setClinicForm({...clinicForm, doctor: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm" />
                <input placeholder="Phone" value={clinicForm.phone} onChange={e => setClinicForm({...clinicForm, phone: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm" />
                <input type="email" placeholder="Email" value={clinicForm.email} onChange={e => setClinicForm({...clinicForm, email: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm" />
                <input placeholder="Address" value={clinicForm.address} onChange={e => setClinicForm({...clinicForm, address: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm md:col-span-2" />
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowClinicForm(false)} className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-sm font-medium shadow-sm transition-colors">Save Clinic</button>
                </div>
              </div>
            </motion.form>
          )}

          {/* Add Price Form */}
          {showPriceForm && activeTab === 'pricelist' && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
              onSubmit={handleAddPrice}
            >
              <div className="p-5 bg-teal-50/50 border-b border-teal-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <input required placeholder="Item Name" value={priceForm.item} onChange={e => setPriceForm({...priceForm, item: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm md:col-span-2" />
                <input type="number" required placeholder="Price" value={priceForm.price || ''} onChange={e => setPriceForm({...priceForm, price: Number(e.target.value)})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm" />
                <select value={priceForm.category} onChange={e => setPriceForm({...priceForm, category: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm cursor-pointer">
                  <option value="fixed">Fixed</option>
                  <option value="removable">Removable</option>
                </select>
                <select value={priceForm.teeth_group} onChange={e => setPriceForm({...priceForm, teeth_group: e.target.value})} className="p-2 text-sm bg-white rounded-sm border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none shadow-sm cursor-pointer">
                  <option value="A">Group A</option>
                  <option value="B">Group B</option>
                  <option value="C">Group C</option>
                </select>
                <div className="md:col-span-5 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowPriceForm(false)} className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-sm font-medium shadow-sm transition-colors">Save Price</button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Data Container */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-3">
              <Loader2 className="animate-spin text-teal-600" size={32} />
              <p className="text-sm">Loading data...</p>
            </div>
          ) : activeTab === 'clinics' ? (
            // Grouped Clinics Layout
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5 bg-slate-50/50">
              {filteredGroupedClinics.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm">No clinics found.</div>
              ) : filteredGroupedClinics.map(clinic => (
                <div key={clinic.name} className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col transition-all hover:border-slate-300">
                  
                  {/* Clinic Header */}
                  <div className="p-4 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building size={16} className="text-teal-600" />
                        <h3 className="font-semibold text-base text-slate-900">{clinic.name}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">📍</span> {clinic.address || <span className="italic text-slate-400 font-normal">No address</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">📞</span> {clinic.phone || <span className="italic text-slate-400 font-normal">No phone</span>}
                        </div>
                        <div className="flex items-center gap-1.5 md:col-span-2">
                          <span className="text-slate-300">✉️</span> {clinic.email || <span className="italic text-slate-400 font-normal">No email</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingClinic({ ...clinic, originalName: clinic.name })} className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-sm transition-colors" title="Edit Clinic">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDeleteModal({ type: 'clinic_group', id: clinic.name, name: clinic.name })} className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-sm transition-colors" title="Delete Clinic">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Doctors Section */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                      <span>Doctors ({clinic.doctors.length})</span>
                      <button onClick={() => setAddingDoctorTo(clinic)} className="text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-white px-2 py-1 rounded-sm border border-slate-200 hover:border-teal-200 transition-colors shadow-sm">
                        <UserPlus size={12} /> Add Doctor
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {clinic.doctors.map(d => (
                        <div key={d.id} className="inline-flex items-center pl-2.5 pr-1 py-1 bg-white text-slate-800 border border-slate-200 rounded-sm text-xs shadow-sm group">
                          <span className="font-semibold text-teal-700 mr-1.5">Dr.</span> {d.name}
                          <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingDoctor({ id: d.id, clinic: clinic.name, originalName: d.name, name: d.name })} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors" title="Edit Doctor">
                              <Edit size={10} />
                            </button>
                            <button onClick={() => setDeleteModal({ type: 'doctor', id: d.id, name: d.name })} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors" title="Remove Doctor">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {clinic.doctors.length === 0 && <span className="text-xs text-slate-400 italic bg-white px-3 py-1.5 rounded-sm border border-dashed border-slate-300">No doctors added.</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Prices Layout
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold text-right">Price</th>
                  <th className="px-5 py-3 font-semibold text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrices.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500 text-sm">No price items found.</td></tr>
                ) : filteredPrices.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{item.item}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${item.category === 'fixed' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        {item.category}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-sm bg-white font-medium uppercase tracking-wider">Group {item.teeth_group}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setDeleteModal({ type: 'price', id: item.id, name: item.item })} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-sm transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Editing Clinic Modal */}
      <AnimatePresence>
        {editingClinic && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onSubmit={handleSaveEditClinic} 
              className="bg-white rounded-md w-full max-w-lg overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Edit Clinic</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Updating details will sync to all past records.</p>
                </div>
                <button type="button" onClick={() => setEditingClinic(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-sm transition-colors"><X size={16}/></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinic Name</label>
                  <input required value={editingClinic.name} onChange={e => setEditingClinic({...editingClinic, name: e.target.value})} className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</label>
                  <input value={editingClinic.address} onChange={e => setEditingClinic({...editingClinic, address: e.target.value})} className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                    <input value={editingClinic.phone} onChange={e => setEditingClinic({...editingClinic, phone: e.target.value})} className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                    <input type="email" value={editingClinic.email} onChange={e => setEditingClinic({...editingClinic, email: e.target.value})} className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingClinic(null)} className="px-5 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-sm text-sm font-medium hover:bg-teal-700 shadow-sm transition-all">Save Changes</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adding Doctor Modal */}
      <AnimatePresence>
        {addingDoctorTo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onSubmit={handleSaveNewDoctor} 
              className="bg-white rounded-md w-full max-w-sm overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 border border-teal-100 text-teal-600 rounded-sm flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Add Doctor</h3>
                    <p className="text-slate-500 text-xs">to {addingDoctorTo.name}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setAddingDoctorTo(null); setNewDoctorName(''); }} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-sm transition-colors"><X size={16}/></button>
              </div>
              <div className="p-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Doctor Name</label>
                <input required autoFocus value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="e.g. John Doe" className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-sm" />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => { setAddingDoctorTo(null); setNewDoctorName(''); }} className="px-5 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-sm text-sm font-medium hover:bg-teal-700 shadow-sm transition-all">Add Doctor</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing Doctor Modal */}
      <AnimatePresence>
        {editingDoctor && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onSubmit={handleSaveEditDoctor} 
              className="bg-white rounded-md w-full max-w-sm overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 border border-blue-100 text-blue-600 rounded-sm flex items-center justify-center">
                    <Edit size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Rename Doctor</h3>
                    <p className="text-slate-500 text-xs">Dr. {editingDoctor.originalName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEditingDoctor(null)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-sm transition-colors"><X size={16}/></button>
              </div>
              <div className="p-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Name</label>
                <input required autoFocus value={editingDoctor.name} onChange={e => setEditingDoctor({...editingDoctor, name: e.target.value})} className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-sm" />
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingDoctor(null)} className="px-5 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-sm text-sm font-medium hover:bg-blue-700 shadow-sm transition-all">Save Name</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-md w-full max-w-sm overflow-hidden shadow-xl flex flex-col border border-slate-200"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
                <p className="text-slate-500 text-sm">
                  Are you sure you want to delete {deleteModal.type === 'clinic_group' ? 'the clinic' : deleteModal.type === 'doctor' ? 'the doctor' : 'the service'} <strong>{deleteModal.name}</strong>? This cannot be undone.
                </p>
                {deleteModal.type === 'clinic_group' && (
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-sm text-xs text-left border border-rose-200 font-medium">
                    Warning: This will delete all doctors associated with this clinic!
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 bg-white border border-slate-300 rounded-sm text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 border border-red-700 rounded-sm text-white text-sm font-medium hover:bg-red-700 shadow-sm transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
