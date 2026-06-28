import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShoppingBag, Users, Package,
  BarChart2, CalendarCheck, Settings2,
  Bell, LogOut, Waves, ChevronRight, Truck, FileText,
} from 'lucide-react'
import { generateDailyReport, sendToWhatsApp } from '../../lib/whatsapp'

const NAV_ITEMS = [
  { path: '/dashboard',             label: 'Beranda',       icon: LayoutDashboard, feature: null },
  { path: '/dashboard/orders',      label: 'Order',         icon: ShoppingBag,     feature: 'orders' },
  { path: '/dashboard/deliveries',  label: 'Laporan Kirim', icon: Truck,           feature: 'deliveries' },
  { path: '/dashboard/documents',   label: 'Dokumen',       icon: FileText,        feature: 'documents' },
  { path: '/dashboard/clients',     label: 'Klien',         icon: Users,           feature: 'clients' },
  { path: '/dashboard/stock',       label: 'Stok',          icon: Package,         feature: 'stock' },
  { path: '/dashboard/reports',     label: 'Laporan',       icon: BarChart2,       feature: 'reports' },
  { path: '/dashboard/attendance',  label: 'Absensi',       icon: CalendarCheck,   feature: 'attendance' },
  { path: '/dashboard/settings',    label: 'Pengaturan',    icon: Settings2,       feature: 'settings' },
]

const ROLE_LABEL = { owner: 'Pemilik', admin: 'Admin', staff: 'Staff' }
const ROLE_COLOR = { owner: '#f59e0b', admin: '#0a84ff', staff: '#30d158' }

const PAGE_TITLE = {
  '/dashboard':             'Beranda',
  '/dashboard/orders':      'Manajemen Order',
  '/dashboard/deliveries':  'Laporan Kirim',
  '/dashboard/documents':   'Dokumen (SO / DO / GR / Invoice)',
  '/dashboard/clients':     'Data Klien',
  '/dashboard/stock':       'Manajemen Stok',
  '/dashboard/reports':     'Laporan & Analitik',
  '/dashboard/attendance':  'Absensi Karyawan',
  '/dashboard/settings':    'Pengaturan',
}

/* ── notifications ── */
function getNotifications() {
  try {
    const orders = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
    const stock  = JSON.parse(localStorage.getItem('nwj_stock')  || '[]')
    return [
      ...stock.filter(s => s.qty <= s.minQty).map(s => ({
        id: `s-${s.id}`, type: 'stock',
        title: `Stok ${s.name} kritis`,
        desc:  `Sisa ${s.qty} ${s.unit} — min. ${s.minQty}`,
      })),
      ...orders.filter(o => o.status === 'pending').map(o => ({
        id: `o-${o.id}`, type: 'order',
        title: `Order ${o.id} menunggu`,
        desc:  o.client,
      })),
    ]
  } catch { return [] }
}

/* ── WA scheduler ── */
function useWAScheduler() {
  const sent = useRef('')
  useEffect(() => {
    const tick = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('nwj_wa_config') || '{}')
        if (!cfg.enabled || !cfg.token || !cfg.target) return
        const now = new Date()
        const key = `${now.toDateString()}-${cfg.sendTime || '18:00'}`
        if (sent.current === key) return
        const [h, m] = (cfg.sendTime || '18:00').split(':').map(Number)
        if (now.getHours() === h && now.getMinutes() === m) {
          sent.current = key
          const o = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
          const s = JSON.parse(localStorage.getItem('nwj_stock') || '[]')
          const a = JSON.parse(localStorage.getItem('nwj_attendance') || '[]')
          sendToWhatsApp({ token: cfg.token, target: cfg.target, message: generateDailyReport(o, s, a) }).catch(() => {})
        }
      } catch {}
    }
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
}

/* ── Sidebar nav item with hover ── */
function SidebarLink({ path, label, Icon, feature, hasPermission }) {
  const [hover, setHover] = useState(false)
  if (feature && !hasPermission(feature)) return null
  return (
    <NavLink
      to={path}
      end={path === '/dashboard'}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 7, marginBottom: 1,
        textDecoration: 'none',
        background: isActive
          ? '#0a84ff'
          : hover ? 'rgba(255,255,255,0.07)' : 'transparent',
        transition: 'background 0.12s',
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            strokeWidth={isActive ? 2.2 : 1.8}
            color={isActive ? 'white' : 'rgba(255,255,255,0.42)'}
          />
          <span style={{
            fontSize: 13.5,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'white' : 'rgba(255,255,255,0.58)',
            letterSpacing: '-0.01em',
          }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

/* ── Notification Panel ── */
function NotifPanel({ notifs, onClose }) {
  const stock  = notifs.filter(n => n.type === 'stock')
  const orders = notifs.filter(n => n.type === 'order')
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
      width: 300, zIndex: 50, overflow: 'hidden',
      background: 'white', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.08)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px 11px', borderBottom: '0.5px solid #f0f0f0',
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Notifikasi</p>
        {notifs.length > 0 && (
          <span style={{
            background: '#ff3b30', color: 'white', fontSize: 10.5,
            fontWeight: 700, padding: '1px 6px', borderRadius: 99,
          }}>{notifs.length}</span>
        )}
      </div>

      {notifs.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 26, marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: 13.5, color: '#3c3c43', fontWeight: 500, margin: 0 }}>Semua aman</p>
          <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>Tidak ada notifikasi baru</p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {stock.length > 0 && (
            <p style={{ fontSize: 11, fontWeight: 600, color: '#ff3b30', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px 4px' }}>
              Stok Kritis
            </p>
          )}
          {stock.map(n => (
            <div key={n.id} style={{ padding: '9px 16px', borderBottom: '0.5px solid #f9f9f9' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
          {orders.length > 0 && (
            <p style={{ fontSize: 11, fontWeight: 600, color: '#ff9500', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px 4px' }}>
              Order Pending
            </p>
          )}
          {orders.map(n => (
            <div key={n.id} style={{ padding: '9px 16px', borderBottom: '0.5px solid #f9f9f9' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '11px 16px', borderTop: '0.5px solid #f0f0f0' }}>
        <NavLink to="/dashboard/settings" onClick={onClose} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textDecoration: 'none',
        }}>
          <span style={{ fontSize: 13, color: '#0a84ff', fontWeight: 500 }}>Atur notifikasi WA</span>
          <ChevronRight size={13} color="#c7c7cc" />
        </NavLink>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { profile, signOut, hasPermission } = useAuth()
  const location   = useLocation()
  const initials   = (profile?.name || 'U').slice(0, 2).toUpperCase()
  const roleColor  = ROLE_COLOR[profile?.role] || '#0a84ff'
  const pageTitle  = PAGE_TITLE[location.pathname] || 'Dashboard'

  const [notifOpen, setNotifOpen]       = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)

  useWAScheduler()
  useEffect(() => { setNotifications(getNotifications()) }, [])
  useEffect(() => { if (notifOpen) setNotifications(getNotifications()) }, [notifOpen])
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const totalCount = notifications.length

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    }}>

      {/* ═══════ SIDEBAR (Apple dark) ═══════ */}
      <aside style={{
        width: 220, flexShrink: 0,
        height: '100vh', overflow: 'hidden',
        background: '#1c1c1e',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Brand */}
        <div style={{ padding: '20px 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: '#0a84ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(10,132,255,0.4)',
            }}>
              <Waves size={17} color="white" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{
                fontSize: 11.5, fontWeight: 600, color: 'white',
                margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em',
              }}>
                UD. Nelayan Widya Jaya
              </p>
              <p style={{
                fontSize: 9.5, color: 'rgba(255,255,255,0.35)',
                margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase',
                marginTop: 2,
              }}>
                Shrimp Supplier
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.08)', margin: '0 14px 10px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon, feature }) => (
            <SidebarLink
              key={path}
              path={path} label={label} Icon={Icon} feature={feature}
              hasPermission={hasPermission}
            />
          ))}
        </nav>

        {/* User row */}
        <div style={{
          padding: '10px 10px 14px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 8px', borderRadius: 9,
            background: 'rgba(255,255,255,0.06)',
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: '#30d158',
                border: '1.5px solid #1c1c1e',
              }} />
            </div>
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'white',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile?.name}
              </p>
              <p style={{ fontSize: 10.5, color: roleColor, margin: 0 }}>
                {ROLE_LABEL[profile?.role] || profile?.role}
              </p>
            </div>
            {/* Logout */}
            <button onClick={signOut} title="Keluar" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.28)', padding: 4,
              display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN AREA ═══════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar — white Apple-style */}
        <header style={{
          height: 48, flexShrink: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          {/* Title */}
          <p style={{
            fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0,
          }}>
            {pageTitle}
          </p>

          {/* Right: Bell + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

            {/* Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: notifOpen ? '#f2f2f7' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                <Bell size={16} color={totalCount > 0 ? '#ff3b30' : '#3c3c43'} strokeWidth={1.8} />
                {totalCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#ff3b30', border: '1.5px solid white',
                  }} />
                )}
              </button>
              {notifOpen && <NotifPanel notifs={notifications} onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Divider */}
            <div style={{ width: 0.5, height: 20, background: 'rgba(0,0,0,0.12)' }} />

            {/* User pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 10px 4px 4px', borderRadius: 99,
              background: '#f2f2f7',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>
                {profile?.name}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1, overflowY: 'auto',
          background: '#f2f2f7',
          padding: '24px 28px',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
