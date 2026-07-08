'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles').select('role_name').eq('user_id', data.user.id).single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role_name)) {
      await supabase.auth.signOut()
      toast.error('Access denied. Admin only.')
      setLoading(false); return
    }
    toast.success('Welcome back, Admin!')
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })
    if (error) toast.error(error.message)
    else toast.success('Reset link sent! Check your email.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10"
            style={{
              width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
              background: 'radial-gradient(circle, #3b82f6, transparent)',
              top: `${10 + i * 15}%`, left: `${5 + i * 16}%`,
              animation: `float ${4 + i}s ease-in-out infinite alternate`
            }} />
        ))}
      </div>
      <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}`}</style>

      <div className="relative w-full max-w-md mx-4 fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-2xl">S</div>
          <h1 className="text-2xl font-bold text-white">Saanvi Royal Travels</h1>
          <p className="text-blue-300 text-sm mt-1 flex items-center justify-center gap-1">
            <Shield size={13} /> Admin Panel
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-xl font-bold text-white mb-1">{forgotMode ? 'Reset Password' : 'Admin Login'}</h2>
          <p className="text-sm text-blue-300 mb-6">{forgotMode ? 'Enter your email to receive reset link' : 'Enter your credentials to continue'}</p>

          <form onSubmit={forgotMode ? handleForgotPassword : handleLogin} className="space-y-4">
            <div>
              <label className="text-blue-200 text-xs font-semibold mb-1 block">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@saanvitravel.com"
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder-white/40"
                  style={{ borderRadius: '10px' }} />
              </div>
            </div>
            {!forgotMode && (
              <div>
                <label className="text-blue-200 text-xs font-semibold mb-1 block">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder-white/40"
                    style={{ borderRadius: '10px' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
            {!forgotMode && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-blue-200 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-blue-500" style={{ width: '16px' }} />
                  Remember me
                </label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-blue-400 hover:text-white transition">Forgot password?</button>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1e40af, #f97316)', opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : null}
              {loading ? 'Please wait...' : forgotMode ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          {forgotMode && (
            <button onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-blue-400 hover:text-white mt-4 transition">
              ← Back to login
            </button>
          )}
        </div>
        <p className="text-center text-blue-400/50 text-xs mt-6">Saanvi Royal Travels © {new Date().getFullYear()} · Admin Only</p>
      </div>
    </div>
  )
}
