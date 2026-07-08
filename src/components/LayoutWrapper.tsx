'use client'
import { useAuth } from './AuthProvider'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Building2, Receipt, BarChart3, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
  if (!user && pathname === '/login') return <>{children}</>
  if (!user) return null

  const allNavItems = [
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

  if (pathname === '/') {
    return (
      <div className="flex flex-col h-screen bg-secondary/30">
        <header className="flex justify-between items-center p-4 bg-white shadow-sm md:hidden">
          <h1 className="text-xl font-bold text-primary">LaboLab</h1>
          <button onClick={handleLogout} className="text-muted-foreground p-2"><LogOut size={20} /></button>
        </header>
        <div className="flex-1 md:flex">
          <aside className="hidden md:flex w-64 flex-col bg-white border-r z-10">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-primary tracking-tight">LaboLab</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-foreground transition-all">
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive w-full transition-all">
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </aside>

          <main className="flex-1 p-4 flex flex-col items-center justify-center">
             <div className="grid grid-cols-2 gap-4 w-full max-w-sm md:hidden animate-in fade-in zoom-in duration-300">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path} className="group flex flex-col items-center justify-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-border hover:border-primary hover:shadow-md transition-all">
                    <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                      <item.icon size={32} className="text-primary" />
                    </div>
                    <span className="font-medium text-center text-sm">{item.name}</span>
                  </Link>
                ))}
             </div>
             <div className="hidden md:flex flex-col items-center justify-center w-full h-full text-muted-foreground animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Building2 size={48} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to LaboLab Dashboard</h2>
                <p>Select a module from the sidebar to begin managing your tasks.</p>
             </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-secondary/30">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r shadow-sm z-10">
        <div className="p-6">
          <Link href="/"><h1 className="text-2xl font-bold text-primary tracking-tight">LaboLab</h1></Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary text-foreground'}`}>
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive w-full transition-all">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="flex md:hidden items-center justify-between p-4 bg-white border-b shadow-sm z-10">
           <Link href="/" className="text-primary font-bold text-xl">LaboLab</Link>
           <button onClick={handleLogout} className="text-muted-foreground p-2"><LogOut size={20} /></button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  )
}
