import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

/* 32 deterministic stars */
const STARS = Array.from({ length: 32 }, (_, i) => ({
  top:   `${((Math.sin(i * 137.5 + 1) + 1) / 2) * 82 + 4}%`,
  left:  `${((Math.cos(i * 97.3 + 2) + 1) / 2) * 88 + 4}%`,
  size:  i % 5 === 0 ? 3 : i % 3 === 0 ? 2.5 : 1.8,
  dur:   `${2.2 + (i % 7) * 0.4}s`,
  delay: `${(i % 9) * 0.35}s`,
}))

const DEMO_USERS = [
  { label: 'Jordy (Owner)', email: 'jordy@nelayan.id' },
  { label: 'April (Admin)', email: 'april@nelayan.id' },
  { label: 'Bimbim (Staff)', email: 'bimbim@nelayan.id' },
  { label: 'Wowo (Staff)',   email: 'wowo@nelayan.id' },
]

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { signIn }  = useAuth()
  const navigate    = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email atau kata sandi salah. Coba lagi.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  const canSubmit = email && password && !loading

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #040e2b 0%, #071a4a 30%, #093070 60%, #0e4d8c 85%, #1a6aaa 100%)' }}
      >
        {/* Stars */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white star-twinkle"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              '--dur': s.dur, '--delay': s.delay,
            }}
          />
        ))}

        {/* Moon */}
        <div
          className="absolute moon-glow rounded-full"
          style={{
            top: '9%', right: '18%',
            width: 76, height: 76,
            background: 'radial-gradient(circle at 38% 38%, #ffe08a, #f4a820 55%, #d4820a)',
          }}
        />
        {/* Moon shadow crater */}
        <div
          className="absolute rounded-full"
          style={{
            top: 'calc(9% + 14px)', right: 'calc(18% + 8px)',
            width: 18, height: 18,
            background: 'rgba(0,0,0,0.12)',
          }}
        />

        {/* Content wrapper — full height flex column */}
        <div className="relative z-10 flex flex-col h-full px-10 py-9">

          {/* Brand — top */}
          <div className="anim-slide-right" style={{ animationDelay: '0.1s' }}>
            <p className="text-white font-black tracking-[0.22em] text-[11px] uppercase">
              UD. Nelayan Widya Jaya
            </p>
            <p className="text-blue-300 text-[9px] tracking-[0.35em] mt-0.5 uppercase">Supplier</p>
          </div>

          {/* Hero — vertical center */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="anim-badge-pop" style={{ animationDelay: '0.3s' }}>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] text-white/75 tracking-wide"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block" />
                Shrimp Supplier Management System
              </span>
            </div>

            <div className="mt-5 anim-fade-up" style={{ animationDelay: '0.45s' }}>
              <p className="text-blue-300/80 text-[10px] tracking-[0.32em] uppercase mb-3 font-semibold">
                Sistem Manajemen Terintegrasi
              </p>
              <h1 className="text-white font-extrabold text-[38px] leading-[1.15] tracking-tight">
                Kelola Bisnis<br />Udang Lebih<br />Mudah &amp; Efisien
              </h1>
              <p className="text-blue-200/60 text-[13px] mt-4 leading-relaxed max-w-[280px]">
                Pantau stok, pengiriman, penjualan, dan absensi karyawan dalam satu platform terpadu.
              </p>
            </div>

            {/* Feature pills */}
            <div
              className="flex flex-wrap gap-2 mt-7 anim-fade-up"
              style={{ animationDelay: '0.6s' }}
            >
              {['Manajemen Order', 'Stok Real-time', 'Absensi', 'Laporan'].map(f => (
                <span key={f}
                  className="text-[10px] text-blue-200/70 px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom — waves + shrimp */}
          <div className="relative h-28 -mx-10 -mb-9 mt-4">
            <svg viewBox="0 0 800 120" preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full wave-1"
              style={{ opacity: 0.25 }}>
              <path fill="#1a7bc4"
                d="M0,70 C100,30 200,90 300,60 C400,30 500,80 600,55 C700,30 750,75 800,60 L800,120 L0,120 Z"/>
            </svg>
            <svg viewBox="0 0 800 120" preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full wave-2"
              style={{ opacity: 0.18 }}>
              <path fill="#0e9fd4"
                d="M0,85 C150,55 250,100 400,75 C550,50 650,95 800,70 L800,120 L0,120 Z"/>
            </svg>
            {/* Shrimp */}
            <div
              className="absolute bottom-5 left-10 text-[32px] shrimp-float"
              style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.5))', animationDelay: '0.5s' }}>
              🦐
            </div>
            <div
              className="absolute bottom-8 left-24 text-[18px] shrimp-float opacity-50"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))', animationDelay: '1.2s' }}>
              🐟
            </div>
            <div
              className="absolute bottom-4 left-36 text-[14px] shrimp-float opacity-35"
              style={{ animationDelay: '0.8s' }}>
              🦑
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Mobile brand bar */}
        <div
          className="lg:hidden px-6 py-4 text-white"
          style={{ background: 'linear-gradient(90deg, #040e2b, #0e4d8c)' }}>
          <p className="font-black tracking-[0.2em] text-[11px] uppercase">UD. Nelayan Widya Jaya</p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 sm:px-14 lg:px-16">
          <div className="max-w-[360px] w-full mx-auto">

            {/* Icon */}
            <div className="flex justify-center mb-6 anim-fade-up" style={{ animationDelay: '0.2s' }}>
              <div
                className="w-[62px] h-[62px] rounded-[18px] flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1a4dbf 0%, #2563eb 50%, #3b82f6 100%)' }}>
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <circle cx="15" cy="11" r="5" fill="white" opacity="0.95"/>
                  <path d="M6 26 Q15 16 24 26" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-7 anim-fade-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Masuk ke Dashboard</h2>
              <p className="text-slate-400 text-sm mt-1">UD. Nelayan Widya Jaya</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 anim-fade-up" style={{ animationDelay: '0.4s' }}>
              {/* Email */}
              <div>
                <label className="block text-slate-700 text-[13px] font-semibold mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contoh@nelayan.id" required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 bg-slate-50 transition-all outline-none"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-700 text-[13px] font-semibold mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi" required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 placeholder-slate-300 bg-slate-50 transition-all outline-none"
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="text-right mt-1.5">
                  <button type="button" className="text-blue-500 text-xs font-medium hover:text-blue-700 transition-colors">
                    Lupa kata sandi?
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={!canSubmit}
                className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, #1a4dbf 0%, #2563eb 60%, #3b82f6 100%)'
                    : '#e2e8f0',
                  color: canSubmit ? 'white' : '#94a3b8',
                  boxShadow: canSubmit ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                  transform: canSubmit ? 'translateY(0)' : undefined,
                }}
                onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-5 border-t border-slate-100 anim-fade-up" style={{ animationDelay: '0.55s' }}>
              <p className="text-slate-400 text-xs text-center mb-3">
                Demo akun — password: <span className="font-mono font-bold text-slate-600">demo1234</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map(u => (
                  <button key={u.email}
                    onClick={() => { setEmail(u.email); setPassword('demo1234') }}
                    className="text-left px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 transition-all"
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#bfdbfe'
                      e.currentTarget.style.background  = '#eff6ff'
                      e.currentTarget.style.color = '#1d4ed8'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.background  = 'white'
                      e.currentTarget.style.color = '#475569'
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-300 text-[11px] pb-5">
          © 2025 UD. Nelayan Widya Jaya
        </p>
      </div>
    </div>
  )
}
