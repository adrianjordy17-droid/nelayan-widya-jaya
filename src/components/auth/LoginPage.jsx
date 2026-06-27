import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Fish, Anchor, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

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
      setError('Email atau password salah. Coba lagi.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  function fillDemo(email) {
    setEmail(email)
    setPassword('demo1234')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900 via-blue-800 to-cyan-700 relative overflow-hidden">
      {/* Animated ocean waves background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-white rounded-t-full transform scale-x-150 animate-pulse" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-3">
              <div className="bg-cyan-400 rounded-2xl p-3 shadow-lg">
                <Fish className="text-white" size={32} />
              </div>
              <Anchor className="text-cyan-300" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">UD. Nelayan Widya Jaya</h1>
            <p className="text-cyan-200 text-sm mt-1">Sistem Manajemen Perikanan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-cyan-100 text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@nelayan.id"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-cyan-100 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-cyan-200 text-xs text-center mb-3">Demo Akun (password: demo1234)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Jordy (Owner)', email: 'jordy@nelayan.id' },
                { name: 'April (Admin)', email: 'april@nelayan.id' },
                { name: 'Bimbim (Staff)', email: 'bimbim@nelayan.id' },
                { name: 'Wowo (Staff)', email: 'wowo@nelayan.id' },
              ].map(u => (
                <button
                  key={u.email}
                  onClick={() => fillDemo(u.email)}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-2 text-white/80 text-xs text-left transition"
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
