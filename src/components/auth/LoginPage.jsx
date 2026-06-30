import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, CheckCircle2, ArrowRight, Waves, Fish } from 'lucide-react'

function AnimatedBg() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w, h, particles, animId

    function init() {
      w = canvas.width  = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      particles = Array.from({ length: 55 }, () => ({
        x:  Math.random() * w, y:  Math.random() * h,
        r:  Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.45 + 0.12),
        vx: (Math.random() - 0.5) * 0.18,
        op: Math.random() * 0.32 + 0.07,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(96,165,250,${p.op})`; ctx.fill()
        p.y += p.vy; p.x += p.vx
        if (p.y < -4)    { p.y = h + 4; p.x = Math.random() * w }
        if (p.x < -4)    p.x = w + 4
        if (p.x > w + 4) p.x = -4
      }
      animId = requestAnimationFrame(draw)
    }

    init(); draw()
    const onResize = () => init()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
}

const FEATURES = [
  'Manajemen order & pengiriman udang',
  'Monitoring stok produk real-time',
  'Laporan penjualan otomatis',
  'Absensi karyawan digital',
]

function FormFields({ email, setEmail, password, setPassword, showPw, setShowPw, error, busy, handleSubmit, isMobile }) {
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 }}>
          {error}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contoh@nelayan.id" required
          style={{ width: '100%', padding: isMobile ? '12px 14px' : '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: isMobile ? 15 : 13.5, color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
          onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Kata Sandi</label>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan kata sandi" required
            style={{ width: '100%', padding: isMobile ? '12px 44px 12px 14px' : '10px 42px 10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: isMobile ? 15 : 13.5, color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
            onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }} />
          <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'right', marginBottom: isMobile ? 24 : 22 }}>
        <span style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}>Lupa kata sandi?</span>
      </div>
      <button type="submit" disabled={busy}
        style={{ width: '100%', padding: isMobile ? '14px' : '11px', background: busy ? '#93C5FD' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', border: 'none', borderRadius: isMobile ? 12 : 10, color: 'white', fontWeight: 600, fontSize: isMobile ? 15 : 14, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: busy ? 'none' : '0 4px 16px rgba(37,99,235,0.35)', letterSpacing: '0.01em' }}
        onMouseEnter={e => { if (!busy) e.currentTarget.style.opacity = '0.92' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
        {busy ? 'Memuat...' : <><span>Masuk</span><ArrowRight size={15} strokeWidth={2.5} /></>}
      </button>
    </form>
  )
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await signIn(email, password)
      if (result?.error) setError(result.error.message || 'Email atau password salah')
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Email atau password salah')
    } finally {
      setBusy(false)
    }
  }

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(150deg, #071B34 0%, #0D2952 50%, #0A2040 100%)', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", position: 'relative', overflow: 'hidden' }}>
        <AnimatedBg />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 280, height: 280, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '30%', left: '-10%', width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%)' }} />

        <div style={{ padding: '56px 28px 40px', position: 'relative', zIndex: 1, flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.5)', flexShrink: 0 }}>
              <Waves size={21} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, margin: 0 }}>UD. Nelayan Widya Jaya</p>
              <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0, lineHeight: 1.5 }}>
                Seafood Live Fresh<br />&amp; Frozen Supplier
              </p>
            </div>
          </div>
          <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, lineHeight: 1.15, margin: '0 0 12px', letterSpacing: '-0.03em' }}>
            One stop solution,<br />
            <span style={{ background: 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NWJ operational</span>
          </h1>
          <p style={{ color: 'rgba(148,163,184,0.75)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>Pantau stok, pengiriman, penjualan & absensi dalam satu platform.</p>
        </div>

        <div style={{ flex: 1, background: 'white', borderRadius: '28px 28px 0 0', padding: '32px 24px 48px', position: 'relative', zIndex: 1, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 28px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, flexShrink: 0, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(37,99,235,0.35)' }}>
              <Fish size={22} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.01em' }}>Masuk ke Dashboard</h2>
              <p style={{ color: '#64748B', fontSize: 12.5, margin: 0 }}>UD. Nelayan Widya Jaya</p>
            </div>
          </div>
          <FormFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} showPw={showPw} setShowPw={setShowPw} error={error} busy={busy} handleSubmit={handleSubmit} isMobile={true} />
          <p style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 28, marginBottom: 0 }}>© 2025 UD. Nelayan Widya Jaya. All rights reserved.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ flex: '0 0 50%', background: 'linear-gradient(150deg, #071B34 0%, #0D2952 45%, #0A2040 100%)', display: 'flex', flexDirection: 'column', padding: '40px 52px', position: 'relative', overflow: 'hidden' }}>
        <AnimatedBg />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div style={{ position: 'absolute', top: '-5%', right: '-8%', width: 380, height: 380, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-8%', width: 300, height: 300, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(14,165,233,0.11) 0%, transparent 65%)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.45)', flexShrink: 0 }}>
            <Waves size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13.5, margin: 0, letterSpacing: '0.01em' }}>UD. Nelayan Widya Jaya</p>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0, lineHeight: 1.5 }}>
              Seafood Live Fresh<br />&amp; Frozen Supplier
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, paddingTop: 48, paddingBottom: 48 }}>
          <h1 style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.18, margin: '0 0 18px', letterSpacing: '-0.03em' }}>
            One stop solution,<br />
            <span style={{ background: 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NWJ operational</span>
          </h1>
          <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 13.5, lineHeight: 1.65, margin: '0 0 36px', maxWidth: 340 }}>
            Pantau stok, pengiriman, penjualan, dan absensi karyawan dalam satu platform terpadu.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(37,99,235,0.28)', border: '1px solid rgba(96,165,250,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={12} color="#60A5FA" strokeWidth={2.5} />
                </div>
                <p style={{ color: 'rgba(203,213,225,0.88)', fontSize: 13, margin: 0 }}>{f}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}>
          <svg viewBox="0 0 520 72" preserveAspectRatio="none" style={{ width: '100%', height: 72, display: 'block' }}>
            <path d="M0,36 C90,8 180,64 260,36 C340,8 430,58 520,36 L520,72 L0,72 Z" fill="rgba(37,99,235,0.09)" />
            <path d="M0,50 C70,22 160,70 260,48 C360,26 450,62 520,44 L520,72 L0,72 Z" fill="rgba(14,165,233,0.07)" />
          </svg>
        </div>
      </div>

      <div style={{ flex: 1, background: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
        <div style={{ width: '100%', maxWidth: 376, background: 'white', borderRadius: 22, padding: '40px 36px 36px', boxShadow: '0 4px 40px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.05)', border: '1px solid rgba(226,232,240,0.9)' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ width: 54, height: 54, background: 'linear-gradient(135deg, #2563EB, #0EA5E9)', borderRadius: 17, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(37,99,235,0.32)' }}>
              <Fish size={24} color="white" strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 700, color: '#0F172A', margin: '0 0 5px', letterSpacing: '-0.01em' }}>Masuk ke Dashboard</h2>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>UD. Nelayan Widya Jaya</p>
          </div>
          <FormFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} showPw={showPw} setShowPw={setShowPw} error={error} busy={busy} handleSubmit={handleSubmit} isMobile={false} />
        </div>
        <p style={{ color: '#94A3B8', fontSize: 11.5, marginTop: 28, marginBottom: 0 }}>© 2025 UD. Nelayan Widya Jaya. All rights reserved.</p>
      </div>
    </div>
  )
}
