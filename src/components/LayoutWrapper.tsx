'use client'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Building2, Receipt, BarChart3, LogOut, Menu, X, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
  if (!user && pathname === '/login') return <>{children}</>
  if (!user) return null

  const allNavItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Daily Record', path: '/daily-record', icon: Calendar },
    { name: 'Clinics & Price', path: '/clinics', icon: Building2 },
    { name: 'Voucher', path: '/voucher', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ]

  const navItems = role === 'technician' 
    ? allNavItems.filter(i => i.path === '/daily-record')
    : allNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }



  return (
    <div className="flex h-screen print:h-auto bg-secondary/30 print:bg-white">
      <aside className="hidden md:flex print:hidden w-64 flex-col bg-white border-r shadow-sm z-10">
        <div className="p-6">
          <Link href="/"><h1 className="text-2xl font-bold text-primary tracking-tight">LaboLab</h1></Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-0.5 text-foreground'}`}>
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="flex items-center justify-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold w-full transition-all shadow-sm">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible relative">
        <header className="flex md:hidden print:hidden items-center justify-between p-4 bg-white border-b shadow-sm z-10">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-muted-foreground hover:bg-secondary p-2 rounded-md transition-colors">
               <Menu size={24} />
             </button>
             <Link href="/" className="text-primary font-bold text-xl">LaboLab</Link>
           </div>
           <button onClick={handleLogout} className="text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-600 p-2 rounded-lg transition-all shadow-sm flex items-center gap-2"><LogOut size={18} /><span className="text-sm font-bold">Logout</span></button>
        </header>
        <main className="flex-1 overflow-auto print:overflow-visible p-4 md:p-8 print:p-0 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-sm flex flex-col bg-white h-full shadow-2xl animate-in slide-in-from-left duration-200 ease-out">
            <div className="p-4 flex items-center justify-between border-b">
              <span className="text-2xl font-bold text-primary">LaboLab</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
                return (
                  <Link key={item.path} href={item.path} className={`flex items-center gap-3 p-4 rounded-lg transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:-translate-y-0.5 text-foreground'}`}>
                    <item.icon size={22} />
                    <span className="font-medium text-base">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t">
              <button onClick={handleLogout} className="flex items-center justify-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold w-full transition-all shadow-sm">
                <LogOut size={22} />
                <span className="text-base">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
