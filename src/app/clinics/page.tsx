'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit, Building, Tags, Search, Loader2 } from 'lucide-react'

type Clinic = { id: string, clinic: string, doctor: string, address: string, phone: string, email: string }
type PriceItem = { id: string, item: string, unit: string, price: number, category: string, teeth_group: string }

export default function ClinicsAndPricePage() {
  const [activeTab, setActiveTab] = useState<'clinics' | 'pricelist'>('clinics')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [priceList, setPriceList] = useState<PriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Form states
  const [showClinicForm, setShowClinicForm] = useState(false)
  const [clinicForm, setClinicForm] = useState({ clinic: '', doctor: '', address: '', phone: '', email: '' })
  
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [priceForm, setPriceForm] = useState({ item: '', unit: 'Răng', price: 0, category: 'fixed', teeth_group: 'A' })

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

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from('clinics').insert([clinicForm]).select()
    if (data) {
      setClinics([data[0], ...clinics])
      setShowClinicForm(false)
      setClinicForm({ clinic: '', doctor: '', address: '', phone: '', email: '' })
    }
  }

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return
    await supabase.from('clinics').delete().eq('id', id)
    setClinics(clinics.filter(c => c.id !== id))
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

  const handleDeletePrice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this price item?')) return
    await supabase.from('pricelist').delete().eq('id', id)
    setPriceList(priceList.filter(p => p.id !== id))
  }

  const filteredClinics = clinics.filter(c => 
    c.clinic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.doctor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPrices = priceList.filter(p => 
    p.item.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

        {/* Data Tables */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p>Loading data...</p>
            </div>
          ) : activeTab === 'clinics' ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Clinic & Doctor</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Contact</th>
                  <th className="px-6 py-4 font-medium hidden lg:table-cell">Address</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClinics.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No clinics found.</td></tr>
                ) : filteredClinics.map(clinic => (
                  <tr key={clinic.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{clinic.clinic}</div>
                      <div className="text-muted-foreground mt-0.5">Dr. {clinic.doctor}</div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div>{clinic.phone || '-'}</div>
                      <div className="text-muted-foreground">{clinic.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                      {clinic.address || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteClinic(clinic.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
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
                      <span className="ml-2 text-xs text-muted-foreground border px-2 py-0.5 rounded-md">Group {item.teeth_group}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-primary">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeletePrice(item.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
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
    </div>
  )
}
