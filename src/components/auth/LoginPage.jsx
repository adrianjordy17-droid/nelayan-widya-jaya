import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, CheckCircle2, ArrowRight, Waves, Fish } from 'lucide-react'

const DEMO_USERS = [
  { name: 'Jordy',  role: 'Owner', email: 'jordy@nelayan.id' },
  { name: 'April',  role: 'Admin', email: 'april@nelayan.id' },
  { name: 'Bimbim', role: 'Staff', email: 'bimbim@nelayan.id' },
  { name: 'Wowo',   role: 'Staff', email: 'wowo@nelayan.id' },
]

const FEATURES = [
  'Manajemen order & pengiriman udang',
  'Monitoring stok produk real-time',
  'Laporan penjualan otomatis',
  'Absensi karyawan digital',
]

export default function LoginPage() {
  const { signIn, loading } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Email atau password salah')
    }
  }

  function fillDemo(u) {
    setEmail(u.email)
    setPassword('demo1234')
    setError('')
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex: '0 0 50%',
        background: 'linear-gradient(150deg, #071B34 0%, #0D2952 45%, #0A2040 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        {/* Glow accents */}
        <div style={{
          position: 'absolute', top: '-5%', right: '-8%',
          width: 380, height: 380, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-8%',
          width: 300, height: 300, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(14,165,233,0.11) 0%, transparent 65%)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
            borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
            flexShrink: 0,
          }}>
            <Waves size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13.5, margin: 0, letterSpacing: '0.01em' }}>
              UD. Nelayan Widya Jaya
            </p>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Shrimp Supplier
            </p>
          </div>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', position: 'relative', zIndex: 1,
          paddingTop: 48, paddingBottom: 48,
        }}>
          {/* Label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          }}>
            <div style={{ width: 28, height: 2, background: 'rgba(96,165,250,0.6)', borderRadius: 2 }} />
            <p style={{
              color: 'rgba(147,197,253,0.85)', fontSize: 11.5, fontWeight: 600,
              letterSpacing: '0.11em', textTransform: 'uppercase', margin: 0,
            }}>
              Sistem Manajemen Bisnis
            </p>
          </div>

          {/* Headline */}
          <h1 style={{
            color: 'white', fontSize: 38, fontWeight: 800,
            lineHeight: 1.18, margin: '0 0 18px',
            letterSpacing: '-0.025em',
          }}>
            Kelola Bisnis<br />
            Udang Lebih<br />
            <span style={{
              background: 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Mudah & Efisien
            </span>
          </h1>

          <p style={{
            color: 'rgba(148,163,184,0.85)', fontSize: 13.5,
            lineHeight: 1.65, margin: '0 0 36px', maxWidth: 340,
          }}>
            Pantau stok, pengiriman, penjualan, dan absensi karyawan
            dalam satu platform terpadu.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(37,99,235,0.28)',
                  border: '1px solid rgba(96,165,250,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={12} color="#60A5FA" strokeWidth={2.5} />
                </div>
                <p style={{ color: 'rgba(203,213,225,0.88)', fontSize: 13, margin: 0 }}>{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}>
          <svg viewBox="0 0 520 72" preserveAspectRatio="none" style={{ width: '100%', height: 72, display: 'block' }}>
            <path d="M0,36 C90,8 180,64 260,36 C340,8 430,58 520,36 L520,72 L0,72 Z"
              fill="rgba(37,99,235,0.09)" />
            <path d="M0,50 C70,22 160,70 260,48 C360,26 450,62 520,44 L520,72 L0,72 Z"
              fill="rgba(14,165,233,0.07)" />
          </svg>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        flex: 1,
        background: '#F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
      }}>
        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 376,
          background: 'white',
          borderRadius: 22,
          padding: '40px 36px 36px',
          boxShadow: '0 4px 40px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.05)',
          border: '1px solid rgba(226,232,240,0.9)',
        }}>
          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{
              width: 54, height: 54,
              background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              borderRadius: 17,
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(37,99,235,0.32)',
            }}>
              <Fish size={24} color="white" strokeWidth={1.8} />
            </div>
            <h2 style={{
              fontSize: 21, fontWeight: 700, color: '#0F172A',
              margin: '0 0 5px', letterSpacing: '-0.01em',
            }}>
              Masuk ke Dashboard
            </h2>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
              UD. Nelayan Widya Jaya
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 10, padding: '10px 14px',
              color: '#DC2626', fontSize: 12.5, marginBottom: 20,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 12.5, fontWeight: 600,
                color: '#374151', marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contoh@nelayan.id"
                required
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 10, fontSize: 13.5, color: '#0F172A',
                  outline: 'none', boxSizing: 'border-box',
                  background: '#F8FAFC',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#2563EB'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#E2E8F0'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{
                display: 'block', fontSize: 12.5, fontWeight: 600,
                color: '#374151', marginBottom: 6,
              }}>
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  style={{
                    width: '100%', padding: '10px 42px 10px 14px',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 10, fontSize: 13.5, color: '#0F172A',
                    outline: 'none', boxSizing: 'border-box',
                    background: '#F8FAFC',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#2563EB'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E2E8F0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 13, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#94A3B8', padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 22 }}>
              <span style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}>
                Lupa kata sandi?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading
                  ? '#93C5FD'
                  : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', borderRadius: 10,
                color: 'white', fontWeight: 600, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.35)',
                transition: 'opacity 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.92' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {loading ? 'Memuat...' : <><span>Masuk</span><ArrowRight size={15} strokeWidth={2.5} /></>}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px',
          }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ color: '#94A3B8', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em' }}>
              AKUN DEMO
            </span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          {/* Demo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                onClick={() => fillDemo(u)}
                style={{
                  padding: '9px 12px',
                  background: '#F8FAFC',
                  border: '1.5px solid #E8EDF3',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#BFDBFE'
                  e.currentTarget.style.background = '#EFF6FF'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E8EDF3'
                  e.currentTarget.style.background = '#F8FAFC'
                }}
              >
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#1E293B' }}>{u.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: '#64748B' }}>{u.role}</p>
              </button>
            ))}
          </div>

          <p style={{
            textAlign: 'center', fontSize: 11.5, color: '#94A3B8',
            marginTop: 14, marginBottom: 0,
          }}>
            Password demo: <strong style={{ color: '#475569' }}>demo1234</strong>
          </p>
        </div>

        {/* Footer */}
        <p style={{ color: '#94A3B8', fontSize: 11.5, marginTop: 28, marginBottom: 0 }}>
          © 2025 UD. Nelayan Widya Jaya. All rights reserved.
        </p>
      </div>
    </div>
  )
}
