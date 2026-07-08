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
