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
        x:  Math.random() * w,
        y:  Math.random() * h,
        r:  Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.45 + 0.12),
        vx: (Math.random() - 0.5) * 0.18,
        op: Math.random() * 0.32 + 0.07,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(96,165,250,${p.op})`
        ctx.fill()
        p.y += p.vy
        p.x += p.vx
        if (p.y < -4)    { p.y = h + 4; p.x = Math.random() * w }
        if (p.x < -4)    p.x = w + 4
        if (p.x > w + 4) p.x = -4
      }
      animId = requestAnimationFrame(draw)
    }

    init()
    draw()
    const onResize = () => init()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }} />
  )
}

const FEATURES = [
  'Manajemen order & pengiriman udang',
  'Monitoring stok produk real-time',
  'Laporan penjualan otomatis',
  'Absensi karyawan digital',
]

/* ── Glass seafood SVGs ── */
function GlassFish({ size = 100 }) {
  return (
    <svg width={size} height={size * 0.58} viewBox="0 0 100 58" fill="none"
      stroke="rgba(255,255,255,0.16)" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <ellipse cx="42" cy="29" rx="30" ry="17" fill="rgba(255,255,255,0.04)" />
      <path d="M72,18 L96,4 L96,54 L72,40 Z" fill="rgba(255,255,255,0.04)" />
      <circle cx="22" cy="25" r="3" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <path d="M35,12 C42,4 54,6 60,12" fill="rgba(255,255,255,0.03)" />
      <path d="M35,46 C42,54 54,52 60,46" fill="rgba(255,255,255,0.03)" />
      <path d="M30,26 C45,24 58,26 70,24" strokeWidth="0.8" opacity="0.55" />
      <path d="M28,16 C22,22 22,36 28,42" fill="none" strokeWidth="1" opacity="0.7" />
    </svg>
  )
}

function GlassShrimp({ size = 90 }) {
  return (
    <svg width={size * 0.65} height={size} viewBox="0 0 52 100" fill="none"
      stroke="rgba(255,255,255,0.16)" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <path d="M38,8 C50,22 50,40 42,54 C34,68 20,72 12,64 C4,56 6,42 14,36 C22,30 30,34 32,44"
        fill="rgba(255,255,255,0.05)" />
      <ellipse cx="38" cy="8" rx="8" ry="7" fill="rgba(255,255,255,0.06)" />
      <path d="M38,4 L48,-4" strokeWidth="1" opacity="0.8" />
      <path d="M33,3 L6,-14" strokeWidth="0.9" opacity="0.7" />
      <path d="M43,3 L56,-8" strokeWidth="0.9" opacity="0.7" />
      <line x1="42" y1="24" x2="32" y2="27" strokeWidth="0.9" opacity="0.6" />
      <line x1="44" y1="34" x2="32" y2="39" strokeWidth="0.9" opacity="0.6" />
      <line x1="40" y1="44" x2="28" y2="50" strokeWidth="0.9" opacity="0.6" />
      <line x1="32" y1="54" x2="22" y2="58" strokeWidth="0.9" opacity="0.6" />
      <path d="M12,64 L2,78 M12,64 L10,82 M12,64 L22,78" strokeWidth="1.1" />
      <path d="M36,22 L27,28 M35,28 L25,35 M34,34 L23,42 M30,42 L20,50" strokeWidth="0.7" opacity="0.45" />
    </svg>
  )
}

function GlassSquid({ size = 88 }) {
  return (
    <svg width={size * 0.5} height={size} viewBox="0 0 44 100" fill="none"
      stroke="rgba(255,255,255,0.16)" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <path d="M22,0 L38,16 L36,58 L22,64 L8,58 L6,16 Z" fill="rgba(255,255,255,0.04)" />
      <path d="M8,52 L-3,68 L8,65 Z" fill="rgba(255,255,255,0.04)" />
      <path d="M36,52 L47,68 L36,65 Z" fill="rgba(255,255,255,0.04)" />
      <circle cx="16" cy="30" r="3.5" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
      <circle cx="28" cy="30" r="3.5" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
      <path d="M13,64 C11,73 9,84 7,98" strokeWidth="1" />
      <path d="M17,65 C16,75 15,85 14,100" strokeWidth="1" />
      <path d="M22,66 C22,76 22,87 22,100" strokeWidth="1.1" />
      <path d="M27,65 C28,75 29,85 30,100" strokeWidth="1" />
      <path d="M31,64 C33,73 35,84 37,98" strokeWidth="1" />
      <line x1="22" y1="2" x2="22" y2="62" strokeWidth="0.7" opacity="0.35" />
    </svg>
  )
}

function GlassShell({ size = 72 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 80 66" fill="none"
      stroke="rgba(255,255,255,0.16)" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M40,5 C66,5 78,28 70,56 C62,64 18,64 10,56 C2,28 14,5 40,5 Z" fill="rgba(255,255,255,0.04)" />
      <path d="M40,5 L26,60" strokeWidth="0.9" opacity="0.6" />
      <path d="M40,5 L34,62" strokeWidth="0.9" opacity="0.6" />
      <path d="M40,5 L40,64" strokeWidth="0.9" opacity="0.6" />
      <path d="M40,5 L46,62" strokeWidth="0.9" opacity="0.6" />
      <path d="M40,5 L54,60" strokeWidth="0.9" opacity="0.6" />
      <path d="M40,5 L16,52" strokeWidth="0.8" opacity="0.45" />
      <path d="M40,5 L62,52" strokeWidth="0.8" opacity="0.45" />
      <path d="M40,5 L8,40" strokeWidth="0.7" opacity="0.3" />
      <path d="M40,5 L70,40" strokeWidth="0.7" opacity="0.3" />
      <path d="M30,7 C33,2 38,1 40,1 C42,1 47,2 50,7" strokeWidth="1.5" />
    </svg>
  )
}

const SEAFOOD_ITEMS = [
  { type: 'shrimp', left: '5%',  top: '56%', size: 82,  rotate: -22, anim: 'seafoodFloat',  dur: '13s', delay: '0s'   },
  { type: 'fish',   left: '60%', top: '10%', size: 100, rotate: 10,  anim: 'seafoodFloat2', dur: '17s', delay: '-5s'  },
  { type: 'squid',  left: '76%', top: '58%', size: 78,  rotate: -6,  anim: 'seafoodFloat3', dur: '21s', delay: '-8s'  },
  { type: 'shell',  left: '28%', top: '75%', size: 64,  rotate: 10,  anim: 'seafoodFloat',  dur: '15s', delay: '-3s'  },
  { type: 'fish',   left: '7%',  top: '14%', size: 66,  rotate: -16, anim: 'seafoodFloat2', dur: '19s', delay: '-12s' },
  { type: 'shrimp', left: '52%', top: '40%', size: 58,  rotate: 38,  anim: 'seafoodFloat3', dur: '24s', delay: '-16s' },
  { type: 'shell',  left: '82%', top: '28%', size: 52,  rotate: -8,  anim: 'seafoodFloat',  dur: '18s', delay: '-7s'  },
]

function FloatingSeafood() {
  return (
    <>
      {SEAFOOD_ITEMS.map((item, i) => {
        const blur = i % 3 === 2 ? 'blur(0.5px)' : 'none'
        const Shape = item.type === 'fish' ? GlassFish
          : item.type === 'shrimp' ? GlassShrimp
          : item.type === 'squid' ? GlassSquid
          : GlassShell
        return (
          <div key={i} style={{
            position: 'absolute', left: item.left, top: item.top,
            transform: `rotate(${item.rotate}deg)`,
            pointerEvents: 'none', zIndex: 0, filter: blur,
          }}>
            <div style={{ animation: `${item.anim} ${item.dur} ease-in-out ${item.delay} infinite` }}>
              <Shape size={item.size} />
            </div>
          </div>
        )
      })}
    </>
  )
}

/* ── Shared glass input style ── */
const glassInput = (extra = {}) => ({
  width: '100%',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 13,
  fontSize: 14,
  color: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.09)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
  ...extra,
})

function FormFields({ email, setEmail, password, setPassword, showPw, setShowPw, error, busy, handleSubmit, isMobile }) {
  const pad = isMobile ? '13px 14px' : '11px 14px'
  const padPw = isMobile ? '13px 44px 13px 14px' : '11px 42px 11px 14px'
  const fs = isMobile ? 15 : 14

  function onFocus(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.48)'
    e.target.style.background  = 'rgba(255,255,255,0.14)'
    e.target.style.boxShadow   = '0 0 0 3px rgba(255,255,255,0.07)'
  }
  function onBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.18)'
    e.target.style.background  = 'rgba(255,255,255,0.09)'
    e.target.style.boxShadow   = 'none'
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.16)',
          border: '1px solid rgba(252,165,165,0.28)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 12, padding: '10px 14px',
          color: 'rgba(252,165,165,0.95)',
          fontSize: 12.5, marginBottom: 16, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.68)', marginBottom: 6, letterSpacing: '0.01em' }}>
          Email
        </label>
        <input
          className="glass-input"
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="contoh@nelayan.id" required
          style={glassInput({ padding: pad, fontSize: fs })}
          onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.68)', marginBottom: 6, letterSpacing: '0.01em' }}>
          Kata Sandi
        </label>
        <div style={{ position: 'relative' }}>
          <input
            className="glass-input"
            type={showPw ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi" required
            style={glassInput({ padding: padPw, fontSize: fs })}
            onFocus={onFocus} onBlur={onBlur}
          />
          <button type="button" onClick={() => setShowPw(p => !p)} style={{
            position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', alignItems: 'center',
          }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginBottom: isMobile ? 24 : 22 }}>
        <span style={{ fontSize: 12, color: 'rgba(147,197,253,0.9)', cursor: 'pointer', fontWeight: 500 }}>
          Lupa kata sandi?
        </span>
      </div>

      <button
        type="submit" disabled={busy}
        style={{
          width: '100%',
          padding: isMobile ? '14px' : '12px',
          background: busy
            ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(135deg, rgba(37,99,235,0.88) 0%, rgba(14,165,233,0.82) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: busy ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(96,165,250,0.38)',
          borderRadius: isMobile ? 14 : 13,
          color: busy ? 'rgba(255,255,255,0.4)' : 'white',
          fontWeight: 600,
          fontSize: isMobile ? 15 : 14,
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: busy ? 'none' : '0 8px 32px rgba(37,99,235,0.38), inset 0 1px 0 rgba(255,255,255,0.28)',
          letterSpacing: '0.01em',
          fontFamily: 'inherit',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { if (!busy) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
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
      if (result?.error) {
        setError(result.error.message || 'Email atau password salah')
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Email atau password salah')
    } finally {
      setBusy(false)
    }
  }

  /* ── Mobile Layout ── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #071B34 0%, #0D2952 50%, #0A2040 100%)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        <AnimatedBg />
        <FloatingSeafood />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: '-8%', right: '-12%',
          width: 280, height: 280, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '-10%',
          width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 65%)',
        }} />

        <div style={{ padding: '56px 28px 40px', position: 'relative', zIndex: 1, flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(37,99,235,0.5)',
              flexShrink: 0,
            }}>
              <Waves size={21} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, margin: 0 }}>
                UD. Nelayan Widya Jaya
              </p>
              <p style={{ color: 'rgba(148,163,184,0.65)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0, lineHeight: 1.5 }}>
                Seafood Live Fresh<br />&amp; Frozen Supplier
              </p>
            </div>
          </div>

          <h1 style={{
            color: 'white', fontSize: 34, fontWeight: 800,
            lineHeight: 1.15, margin: '0 0 12px', letterSpacing: '-0.03em',
          }}>
            One stop solution,<br />
            <span style={{
              background: 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              NWJ operational
            </span>
          </h1>
          <p style={{ color: 'rgba(148,163,184,0.75)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            Pantau stok, pengiriman, penjualan & absensi dalam satu platform.
          </p>
        </div>

        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(52px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(52px) saturate(1.6)',
          borderRadius: '28px 28px 0 0',
          padding: '32px 24px 48px',
          position: 'relative', zIndex: 1,
          border: '1px solid rgba(255,255,255,0.16)',
          borderBottom: 'none',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(255,255,255,0.28)',
        }}>
          <div style={{
            width: 38, height: 4,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 2, margin: '0 auto 28px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 50, height: 50, flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 20px rgba(0,0,0,0.2)',
            }}>
              <Fish size={22} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                Masuk ke Dashboard
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, margin: 0 }}>UD. Nelayan Widya Jaya</p>
            </div>
          </div>

          <FormFields
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            showPw={showPw} setShowPw={setShowPw}
            error={error} busy={busy}
            handleSubmit={handleSubmit}
            isMobile={true}
          />

          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, textAlign: 'center', marginTop: 28, marginBottom: 0 }}>
            © 2025 UD. Nelayan Widya Jaya. All rights reserved.
          </p>
        </div>
      </div>
    )
  }

  /* ── Desktop Layout ── */
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        flex: '0 0 50%',
        background: 'linear-gradient(150deg, #071B34 0%, #0D2952 45%, #0A2040 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '40px 52px', position: 'relative', overflow: 'hidden',
      }}>
        <AnimatedBg />
        <FloatingSeafood />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
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

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
            borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.45)', flexShrink: 0,
          }}>
            <Waves size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <p style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13.5, margin: 0, letterSpacing: '0.01em' }}>
              UD. Nelayan Widya Jaya
            </p>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0, lineHeight: 1.5 }}>
              Seafood Live Fresh<br />&amp; Frozen Supplier
            </p>
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', position: 'relative', zIndex: 1,
          paddingTop: 48, paddingBottom: 48,
        }}>
          <h1 style={{
            color: 'white', fontSize: 40, fontWeight: 800,
            lineHeight: 1.18, margin: '0 0 18px', letterSpacing: '-0.03em',
          }}>
            One stop solution,<br />
            <span style={{
              background: 'linear-gradient(90deg, #60A5FA 0%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              NWJ operational
            </span>
          </h1>

          <p style={{
            color: 'rgba(148,163,184,0.85)', fontSize: 13.5,
            lineHeight: 1.65, margin: '0 0 36px', maxWidth: 340,
          }}>
            Pantau stok, pengiriman, penjualan, dan absensi karyawan
            dalam satu platform terpadu.
          </p>

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

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' }}>
          <svg viewBox="0 0 520 72" preserveAspectRatio="none" style={{ width: '100%', height: 72, display: 'block' }}>
            <path d="M0,36 C90,8 180,64 260,36 C340,8 430,58 520,36 L520,72 L0,72 Z" fill="rgba(37,99,235,0.09)" />
            <path d="M0,50 C70,22 160,70 260,48 C360,26 450,62 520,44 L520,72 L0,72 Z" fill="rgba(14,165,233,0.07)" />
          </svg>
        </div>
      </div>

      <div style={{
        flex: 1,
        background: 'linear-gradient(150deg, #0A1E36 0%, #0C2348 55%, #091C38 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '10%', right: '5%',
          width: 340, height: 340, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(14,165,233,0.13) 0%, transparent 68%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '8%', left: '2%',
          width: 280, height: 280, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.11) 0%, transparent 68%)',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '30%',
          width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 65%)',
        }} />

        <div style={{
          width: '100%', maxWidth: 388,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(52px) saturate(1.7)',
          WebkitBackdropFilter: 'blur(52px) saturate(1.7)',
          borderRadius: 28,
          padding: '40px 36px 36px',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: [
            '0 40px 80px rgba(0,0,0,0.45)',
            '0 8px 24px rgba(0,0,0,0.25)',
            'inset 0 1.5px 0 rgba(255,255,255,0.28)',
            'inset 0 -1px 0 rgba(255,255,255,0.05)',
          ].join(', '),
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '12%', right: '12%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            borderRadius: 1,
          }} />

          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{
              width: 58, height: 58,
              background: 'rgba(255,255,255,0.11)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 18, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.32), 0 8px 24px rgba(0,0,0,0.28)',
            }}>
              <Fish size={26} color="white" strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 700, color: 'white', margin: '0 0 5px', letterSpacing: '-0.01em' }}>
              Masuk ke Dashboard
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 13, margin: 0 }}>UD. Nelayan Widya Jaya</p>
          </div>

          <FormFields
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            showPw={showPw} setShowPw={setShowPw}
            error={error} busy={busy}
            handleSubmit={handleSubmit}
            isMobile={false}
          />
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11.5, marginTop: 28, marginBottom: 0 }}>
          © 2025 UD. Nelayan Widya Jaya. All rights reserved.
        </p>
      </div>
    </div>
  )
}
