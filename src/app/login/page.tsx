'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập Email và Mật khẩu để đăng ký')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      setError(error.message)
    } else {
      if (data.user) {
        const assignedRole = email === 'admin@gmail.com' ? 'admin' : 'technician'
        await supabase.from('profiles').insert({ id: data.user.id, role: assignedRole })
      }
      alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.')
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-primary p-8 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LaboLab</h1>
          <p className="text-primary-foreground/80 mt-2">Dental Lab Management</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 text-center animate-in shake">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lab.com"
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="w-full py-3 px-4 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 focus:outline-none transition-all disabled:opacity-50"
              >
                Đăng ký
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {loading ? 'Đang tải...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground border-t border-border pt-4">
            <p className="font-medium text-foreground mb-1">Tài khoản Admin (Toàn quyền):</p>
            <p className="bg-secondary/50 inline-block px-3 py-1 rounded-md">admin@gmail.com / 123456</p>
            <p className="mt-3 text-xs opacity-80">Các bác sĩ đăng ký email mới sẽ tự động được cấp quyền Kỹ thuật viên (chỉ xem Daily Record).</p>
          </div>
        </div>
      </div>
    </div>
  )
}
