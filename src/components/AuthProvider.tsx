'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

type AuthContextType = {
  user: User | null
  session: Session | null
  role: 'admin' | 'technician' | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, role: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<'admin' | 'technician' | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (data) setRole(data.role)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) fetchRole(session.user.id)
      setLoading(false)
      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) fetchRole(session.user.id)
      else setRole(null)
      setLoading(false)
      if (!session && pathname !== '/login') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  return (
    <AuthContext.Provider value={{ user, session, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
