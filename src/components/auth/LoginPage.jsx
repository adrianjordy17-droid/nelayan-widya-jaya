import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0a2a5e 40%, #0e4d8a 80%, #1a6ea8 100%)' }}>

        {/* Stars */}
        {[...Array(28)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: i % 4 === 0 ? 3 : 2,
              height: i % 4 === 0 ? 3 : 2,
              top: `${Math.sin(i * 137.5) * 40 + 45}%`,
              left: `${Math.cos(i * 97.3) * 45 + 50}%`,
              opacity: 0.3 + (i % 5) * 0.12,
            }}
          />
        ))}

        {/* Moon */}
        <div className="absolute top-16 right-20 w-20 h-20 rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 35%, #ffd97a, #f4a820)', boxShadow: '0 0 40px 10px rgba(244,168,32,0.25)' }} />

        {/* Header */}
        <div className="relative z-10">
          <p className="text-white font-bold tracking-[0.25em] text-sm uppercase">UD. Nelayan Widya Jaya</p>
          <p className="text-blue-300 text-xs tracking-widest mt-0.5">Supplier</p>
        </div>

        {/* Badge + Hero text */}
        <div className="relative z-10 space-y-5">
          <div className="inline-block">
            <span className="bg-white/10 border border-white/20 text-white/80 text-xs px-4 py-1.5 rounded-full tracking-wide">
              Shrimp Supplier Management System
            </span>
          </div>
          <div>
            <p className="text-blue-300 text-xs tracking-[0.3em] uppercase mb-3">Sistem Manajemen Terintegrasi</p>
            <h1 className="text-white font-extrabold text-4xl leading-tight">
              Kelola Bisnis Udang<br />Lebih Mudah &amp;<br />Efisien
            </h1>
            <p className="text-blue-200/70 text-sm mt-4 leading-relaxed max-w-xs">
              Pantau stok, pengiriman, penjualan, dan absensi karyawan dalam satu platform.
            </p>
          </div>
        </div>

        {/* Ocean waves bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-36 overflow-hidden">
          <svg viewBox="0 0 1440 144" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full opacity-30">
            <path fill="#1a6ea8" d="M0,80 C360,140 1080,20 1440,80 L1440,144 L0,144 Z"/>
          </svg>
          <svg viewBox="0 0 1440 144" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full opacity-20">
            <path fill="#0e9fd4" d="M0,100 C480,40 960,120 1440,60 L1440,144 L0,144 Z"/>
          </svg>
          {/* Fish */}
          <div className="absolute bottom-6 left-8 text-3xl" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>🦐</div>
          <div className="absolute bottom-10 left-20 text-xl opacity-60">🐟</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white px-8 py-10 sm:px-16">
        <div />

        <div className="max-w-sm w-full mx-auto space-y-7">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl shadow-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 22 Q16 10 24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <circle cx="16" cy="10" r="4" fill="white" opacity="0.9"/>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Masuk ke Dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">UD. Nelayan Widya Jaya</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contoh@nelayan.id"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-slate-50"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <button type="button" className="text-blue-600 text-xs font-medium hover:underline">
                  Lupa kata sandi?
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 mt-1"
              style={{
                background: email && password && !loading ? 'linear-gradient(135deg, #1a56db, #3b82f6)' : '#e2e8f0',
                color: email && password && !loading ? 'white' : '#94a3b8',
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>

          {/* Demo accounts */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-slate-400 text-xs text-center mb-3">Demo akun — password: <span className="font-mono font-semibold text-slate-600">demo1234</span></p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Jordy (Owner)', email: 'jordy@nelayan.id' },
                { label: 'April (Admin)', email: 'april@nelayan.id' },
                { label: 'Bimbim (Staff)', email: 'bimbim@nelayan.id' },
                { label: 'Wowo (Staff)', email: 'wowo@nelayan.id' },
              ].map(u => (
                <button key={u.email} onClick={() => { setEmail(u.email); setPassword('demo1234') }}
                  className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition text-xs text-slate-600">
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-300 text-xs">2025 UD. Nelayan Widya Jaya</p>
      </div>
    </div>
  )
}
