'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit, Building, Tags, Search, Loader2, AlertTriangle, UserPlus, X } from 'lucide-react'

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

  // Form states
  const [showClinicForm, setShowClinicForm] = useState(false)
  const [clinicForm, setClinicForm] = useState({ clinic: '', doctor: '', address: '', phone: '', email: '' })
  
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [priceForm, setPriceForm] = useState({ item: '', unit: 'Răng', price: 0, category: 'fixed', teeth_group: 'A' })

  // Modals for updating and adding doctors
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

  // Group clinics by name
  const groupedClinics = useMemo(() => {
    const map = new Map<string, GroupedClinic>()
    clinics.forEach(c => {
      if (!map.has(c.clinic)) {
        map.set(c.clinic, { name: c.clinic, address: '', phone: '', email: '', doctors: [], rowIds: [] })
      }
      const group = map.get(c.clinic)!
      group.rowIds.push(c.id)
      if (c.doctor) group.doctors.push({ id: c.id, name: c.doctor })
      
      // Use the first available contact info
      if (!group.address && c.address) group.address = c.address
      if (!group.phone && c.phone) group.phone = c.phone
      if (!group.email && c.email) group.email = c.email
    })
    return Array.from(map.values())
  }, [clinics])

  const filteredGroupedClinics = groupedClinics.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.doctors.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredPrices = priceList.filter(p => 
    p.item.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      // Cascading update for entries if clinic name changed
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
      // Cascading update for entries if doctor name changed
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
          // Last doctor in clinic, just clear the name to keep the clinic alive
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Master Data</h1>
          <p className="text-muted-foreground mt-1">Manage your clinics and price lists</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-border w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('clinics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'clinics' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Building size={16} /> Clinics
          </button>
          <button 
            onClick={() => setActiveTab('pricelist')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'pricelist' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Tags size={16} /> Price List
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <button 
            onClick={() => activeTab === 'clinics' ? setShowClinicForm(!showClinicForm) : setShowPriceForm(!showPriceForm)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={18} /> Add New {activeTab === 'clinics' ? 'Clinic' : 'Item'}
          </button>
        </div>

        {/* Add Clinic Form */}
        {showClinicForm && activeTab === 'clinics' && (
          <form onSubmit={handleAddClinic} className="p-6 bg-secondary/30 border-b border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
            <input required placeholder="Clinic Name" value={clinicForm.clinic} onChange={e => setClinicForm({...clinicForm, clinic: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none" />
            <input required placeholder="Doctor Name" value={clinicForm.doctor} onChange={e => setClinicForm({...clinicForm, doctor: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none" />
            <input placeholder="Phone" value={clinicForm.phone} onChange={e => setClinicForm({...clinicForm, phone: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none" />
            <input type="email" placeholder="Email" value={clinicForm.email} onChange={e => setClinicForm({...clinicForm, email: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none" />
            <input placeholder="Address" value={clinicForm.address} onChange={e => setClinicForm({...clinicForm, address: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none md:col-span-2" />
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowClinicForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg shadow-sm">Save Clinic</button>
            </div>
          </form>
        )}

        {/* Add Price Form */}
        {showPriceForm && activeTab === 'pricelist' && (
          <form onSubmit={handleAddPrice} className="p-6 bg-secondary/30 border-b border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 animate-in slide-in-from-top-2">
            <input required placeholder="Item Name" value={priceForm.item} onChange={e => setPriceForm({...priceForm, item: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none md:col-span-2" />
            <input type="number" required placeholder="Price" value={priceForm.price || ''} onChange={e => setPriceForm({...priceForm, price: Number(e.target.value)})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none" />
            <select value={priceForm.category} onChange={e => setPriceForm({...priceForm, category: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none bg-white">
              <option value="fixed">Fixed</option>
              <option value="removable">Removable</option>
            </select>
            <select value={priceForm.teeth_group} onChange={e => setPriceForm({...priceForm, teeth_group: e.target.value})} className="p-2.5 rounded-lg border focus:ring-2 focus:ring-primary outline-none bg-white">
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="C">Group C</option>
            </select>
            <div className="md:col-span-5 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowPriceForm(false)} className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg shadow-sm">Save Price Item</button>
            </div>
          </form>
        )}

        {/* Data Container */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p>Loading data...</p>
            </div>
          ) : activeTab === 'clinics' ? (
            // Grouped Clinics Layout
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 md:p-6 bg-[#f8f9fb]">
              {filteredGroupedClinics.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">No clinics found.</div>
              ) : filteredGroupedClinics.map(clinic => (
                <div key={clinic.name} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-primary/20 transition-all hover:shadow-md">
                  
                  {/* Clinic Header */}
                  <div className="p-5 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building size={18} className="text-primary/70" />
                        <h3 className="font-bold text-lg text-foreground">{clinic.name}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground mt-3">
                        <div className="flex items-center gap-2">
                          <span className="opacity-50">📍</span> {clinic.address || <span className="italic opacity-50">No address</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="opacity-50">📞</span> {clinic.phone || <span className="italic opacity-50">No phone</span>}
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <span className="opacity-50">✉️</span> {clinic.email || <span className="italic opacity-50">No email</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => setEditingClinic({ ...clinic, originalName: clinic.name })} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors bg-secondary/50">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => setDeleteModal({ type: 'clinic_group', id: clinic.name, name: clinic.name })} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors bg-secondary/50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Doctors Section */}
                  <div className="p-5 bg-secondary/20 border-t border-border flex-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex justify-between items-center">
                      <span>Doctors ({clinic.doctors.length})</span>
                      <button onClick={() => setAddingDoctorTo(clinic)} className="text-primary hover:text-primary/80 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-primary/20 shadow-sm transition-all hover:shadow">
                        <UserPlus size={14} /> Add Doctor
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {clinic.doctors.map(d => (
                        <div key={d.id} className="inline-flex items-center pl-3 pr-1 py-1.5 bg-white text-foreground border border-border rounded-full text-sm shadow-sm hover:border-primary/40 transition-colors">
                          <span className="font-medium text-emerald-700 mr-1.5">Dr.</span> {d.name}
                          <div className="flex items-center gap-0.5 ml-2">
                            <button onClick={() => setEditingDoctor({ id: d.id, clinic: clinic.name, originalName: d.name, name: d.name })} className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Sửa tên">
                              <Edit size={12} />
                            </button>
                            <button onClick={() => setDeleteModal({ type: 'doctor', id: d.id, name: d.name })} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors" title="Xóa bác sĩ">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {clinic.doctors.length === 0 && <span className="text-sm text-muted-foreground italic bg-white px-3 py-1.5 rounded-full border border-dashed border-border">No doctors added.</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Prices Layout
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Item Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Price</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrices.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No price items found.</td></tr>
                ) : filteredPrices.map(item => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{item.item}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.category === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground border px-2 py-0.5 rounded-md bg-white shadow-sm">Group {item.teeth_group}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-primary">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDeleteModal({ type: 'price', id: item.id, name: item.item })} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
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
      {editingClinic && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveEditClinic} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-secondary/30">
              <h3 className="text-xl font-bold text-foreground">Edit Clinic</h3>
              <p className="text-muted-foreground text-sm mt-1">Updating details for <strong>{editingClinic.originalName}</strong> will sync to all past records.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clinic Name</label>
                <input required value={editingClinic.name} onChange={e => setEditingClinic({...editingClinic, name: e.target.value})} className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-primary focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</label>
                <input value={editingClinic.address} onChange={e => setEditingClinic({...editingClinic, address: e.target.value})} className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-primary focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
                  <input value={editingClinic.phone} onChange={e => setEditingClinic({...editingClinic, phone: e.target.value})} className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-primary focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                  <input type="email" value={editingClinic.email} onChange={e => setEditingClinic({...editingClinic, email: e.target.value})} className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-primary focus:bg-white transition-colors" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => setEditingClinic(null)} className="px-5 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-sm transition-all">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {/* Adding Doctor Modal */}
      {addingDoctorTo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveNewDoctor} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-emerald-50">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <UserPlus size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Add Doctor</h3>
              <p className="text-muted-foreground text-sm mt-1">Add a new doctor to <strong>{addingDoctorTo.name}</strong></p>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Doctor Name</label>
              <input required autoFocus value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} placeholder="e.g. John Doe" className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white transition-colors" />
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => { setAddingDoctorTo(null); setNewDoctorName(''); }} className="px-5 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm transition-all">Add Doctor</button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Doctor Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveEditDoctor} className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-blue-50">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Edit size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Rename Doctor</h3>
              <p className="text-muted-foreground text-sm mt-1">Rename <strong>Dr. {editingDoctor.originalName}</strong> in <strong>{editingDoctor.clinic}</strong>.</p>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Doctor Name</label>
              <input required autoFocus value={editingDoctor.name} onChange={e => setEditingDoctor({...editingDoctor, name: e.target.value})} placeholder="e.g. John Doe" className="w-full mt-1.5 p-2.5 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => setEditingDoctor(null)} className="px-5 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-all">Save Name</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Xác nhận xóa</h3>
              <p className="text-muted-foreground text-sm">
                Bạn có chắc chắn muốn xóa {deleteModal.type === 'clinic_group' ? 'phòng khám' : deleteModal.type === 'doctor' ? 'bác sĩ' : 'dịch vụ'} <strong>{deleteModal.name}</strong> không? Hành động này không thể hoàn tác.
              </p>
              {deleteModal.type === 'clinic_group' && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs text-left border border-rose-100">
                  <strong>Cảnh báo:</strong> Việc này sẽ xóa toàn bộ các bác sĩ thuộc phòng khám này!
                </div>
              )}
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 bg-white border border-border rounded-xl text-muted-foreground font-semibold hover:bg-[#f0f2f5] transition-colors">Hủy</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-500 border border-red-600 rounded-xl text-white font-bold hover:bg-red-600 shadow-sm transition-all">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
