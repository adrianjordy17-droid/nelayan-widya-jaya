import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShoppingBag, Users, Package,
  BarChart2, CalendarCheck, Settings2,
  Bell, LogOut, Waves, ChevronRight, Truck, FileText, ClipboardList, Menu, Tag,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateDailyReport, sendToWhatsApp } from '../../lib/whatsapp'

const NAV_ITEMS = [
  { path: '/dashboard',             label: 'Beranda',        icon: LayoutDashboard, feature: null },
  { path: '/dashboard/orders',      label: 'Order',          icon: ShoppingBag,     feature: 'orders' },
  { path: '/dashboard/deliveries',  label: 'Laporan Kirim',  icon: Truck,           feature: 'deliveries' },
  { path: '/dashboard/documents',   label: 'Dokumen',        icon: FileText,        feature: 'documents' },
  { path: '/dashboard/clients',     label: 'Klien',          icon: Users,           feature: 'clients' },
  { path: '/dashboard/stock',       label: 'Stok',           icon: Package,         feature: 'stock' },
  { path: '/dashboard/reports',     label: 'Laporan',        icon: BarChart2,       feature: 'reports' },
  { path: '/dashboard/attendance',  label: 'Absensi',        icon: CalendarCheck,   feature: 'attendance' },
  { path: '/dashboard/jobdesk',     label: 'Jobdesk',        icon: ClipboardList,   feature: 'jobdesk' },
  { path: '/dashboard/products',    label: 'Produk & Harga', icon: Tag,             feature: 'products' },
  { path: '/dashboard/settings',    label: 'Pengaturan',     icon: Settings2,       feature: 'settings' },
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
  '/dashboard/jobdesk':     'Jobdesk — Tugas Staf',
  '/dashboard/products':    'Produk & Daftar Harga',
  '/dashboard/settings':    'Pengaturan',
}

async function fetchNotifications() {
  try {
    const [{ data: products }, { data: draftSOs }] = await Promise.all([
      supabase.from('products').select('id, nama, qty, min_qty, satuan'),
      supabase.from('documents').select('id, number, client_name').eq('type', 'SO').eq('status', 'draft'),
    ])
    const stockNotifs = (products || [])
      .filter(p => (p.min_qty || 0) > 0 && (p.qty || 0) <= (p.min_qty || 0))
      .map(p => ({ id: `s-${p.id}`, type: 'stock', title: `Stok ${p.nama} kritis`, desc: `Sisa ${p.qty || 0} ${p.satuan || 'kg'} — min. ${p.min_qty}` }))
    const orderNotifs = (draftSOs || []).map(d => ({ id: `o-${d.id}`, type: 'order', title: `SO ${d.number} menunggu`, desc: d.client_name }))
    return [...stockNotifs, ...orderNotifs]
  } catch { return [] }
}

function useWAScheduler() {
  const sent = useRef('')
  useEffect(() => {
    const tick = async () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('nwj_wa_config') || '{}')
        if (!cfg.enabled || !cfg.token || !cfg.target) return
        const now = new Date()
        const key = `${now.toDateString()}-${cfg.sendTime || '18:00'}`
        if (sent.current === key) return
        const [h, m] = (cfg.sendTime || '18:00').split(':').map(Number)
        if (now.getHours() === h && now.getMinutes() === m) {
          sent.current = key
          const today = now.toISOString().slice(0, 10)
          const [{ data: docs }, { data: prods }, { data: attend }] = await Promise.all([
            supabase.from('documents').select('*').eq('type', 'SO'),
            supabase.from('products').select('id, nama, qty, min_qty, satuan'),
            supabase.from('attendance').select('*').eq('date', today),
          ])
          const orders = (docs || []).map(d => ({ id: d.number, client: d.client_name, date: d.date, catatan: d.notes || '', status: d.status === 'delivered' ? 'selesai' : d.status === 'dispatched' ? 'proses' : d.status === 'cancelled' ? 'batal' : 'pending', items: d.items || [] }))
          const stock = (prods || []).map(p => ({ name: p.nama, qty: p.qty || 0, minQty: p.min_qty || 0, unit: p.satuan || 'kg' }))
          const attendance = (attend || []).map(a => ({ name: a.name, date: a.date, status: a.status }))
          sendToWhatsApp({ token: cfg.token, target: cfg.target, message: generateDailyReport(orders, stock, attendance) }).catch(() => {})
        }
      } catch {}
    }
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
}

function SidebarLink({ path, label, Icon, feature, hasPermission, onNavClick }) {
  const [hover, setHover] = useState(false)
  if (feature && !hasPermission(feature)) return null
  return (
    <NavLink
      to={path}
      end={path === '/dashboard'}
      onClick={onNavClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 11px', borderRadius: 11, marginBottom: 2,
        textDecoration: 'none',
        background: isActive ? 'rgba(10,132,255,0.28)' : hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        boxShadow: isActive
          ? '0 0 0 0.5px rgba(10,132,255,0.55), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.12), 0 3px 14px rgba(10,132,255,0.22)'
          : hover ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
        backdropFilter: isActive ? 'blur(12px) saturate(180%)' : 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} strokeWidth={isActive ? 2.2 : 1.7} color={isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)'} />
          <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, color: isActive ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.52)', letterSpacing: '-0.01em' }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function NotifPanel({ notifs, onClose }) {
  const stockN = notifs.filter(n => n.type === 'stock')
  const orderN = notifs.filter(n => n.type === 'order')
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 310, zIndex: 50, overflow: 'hidden',
      background: 'rgba(22,28,44,0.82)', backdropFilter: 'blur(48px) saturate(200%)',
      borderRadius: 18, border: '0.5px solid rgba(255,255,255,0.14)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 17px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Notifikasi</p>
        {notifs.length > 0 && <span style={{ background: '#ff453a', color: 'white', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, boxShadow: '0 2px 8px rgba(255,69,58,0.4)' }}>{notifs.length}</span>}
      </div>
      {notifs.length === 0 ? (
        <div style={{ padding: '28px 17px', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0 }}>Semua aman</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Tidak ada notifikasi baru</p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {stockN.length > 0 && <p style={{ fontSize: 10.5, fontWeight: 600, color: '#ff453a', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '10px 17px 4px', margin: 0 }}>Stok Kritis</p>}
          {stockN.map(n => (
            <div key={n.id} style={{ padding: '9px 17px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
          {orderN.length > 0 && <p style={{ fontSize: 10.5, fontWeight: 600, color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '10px 17px 4px', margin: 0 }}>SO Draft</p>}
          {orderN.map(n => (
            <div key={n.id} style={{ padding: '9px 17px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '12px 17px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <NavLink to="/dashboard/settings" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
          <span style={{ fontSize: 13, color: '#0a84ff', fontWeight: 500 }}>Atur notifikasi WA</span>
          <ChevronRight size={13} color="rgba(255,255,255,0.25)" />
        </NavLink>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { profile, signOut, hasPermission } = useAuth()
  const location  = useLocation()
  const initials  = (profile?.name || 'U').slice(0, 2).toUpperCase()
  const roleColor = ROLE_COLOR[profile?.role] || '#0a84ff'
  const pageTitle = PAGE_TITLE[location.pathname] || 'Dashboard'

  const [notifOpen, setNotifOpen]         = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const notifRef = useRef(null)

  useWAScheduler()

  useEffect(() => { fetchNotifications().then(setNotifications) }, [])
  useEffect(() => { if (notifOpen) fetchNotifications().then(setNotifications) }, [notifOpen])
  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const totalCount  = notifications.length
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
      background: 'linear-gradient(145deg, #060e20 0%, #0b1c36 30%, #091828 60%, #04101e 100%)',
      position: 'relative',
    }}>
      {/* Ambient glow blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(48,209,88,0.10) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '30%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 70%)' }} />
      </div>

      {isMobile && sidebarOpen && (
        <div onClick={closeSidebar} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* SIDEBAR — Liquid Glass */}
      <aside style={{
        width: 224, flexShrink: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10,
        background: 'rgba(255,255,255,0.055)',
        backdropFilter: 'blur(56px) saturate(180%)',
        borderRight: '0.5px solid rgba(255,255,255,0.10)',
        boxShadow: '1px 0 0 rgba(0,0,0,0.25), inset -0.5px 0 0 rgba(255,255,255,0.06)',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: sidebarOpen ? '8px 0 40px rgba(0,0,0,0.5)' : 'none',
        } : {}),
      }}>
        <div style={{ padding: '22px 15px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: 'rgba(10,132,255,0.35)', backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(10,132,255,0.6)',
              boxShadow: '0 0 0 0.5px rgba(10,132,255,0.3), inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 16px rgba(10,132,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Waves size={17} color="white" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>UD. Nelayan Widya Jaya</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Seafood Supplier</p>
            </div>
          </div>
        </div>

        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '0 14px 10px' }} />

        <nav style={{ flex: 1, padding: '0 9px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon, feature }) => (
            <SidebarLink key={path} path={path} label={label} Icon={Icon} feature={feature} hasPermission={hasPermission} onNavClick={isMobile ? closeSidebar : undefined} />
          ))}
        </nav>

        <div style={{ padding: '10px 10px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 13,
            background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor},${roleColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', boxShadow: `0 2px 10px ${roleColor}55` }}>{initials}</div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#30d158', border: '1.5px solid rgba(10,20,40,0.8)', boxShadow: '0 0 6px rgba(48,209,88,0.6)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</p>
              <p style={{ fontSize: 10.5, color: roleColor, margin: 0, fontWeight: 500 }}>{ROLE_LABEL[profile?.role] || profile?.role}</p>
            </div>
            <button onClick={signOut} title="Keluar" style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.32)', padding: '5px 6px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* Topbar — Liquid Glass */}
        <header style={{
          height: 50, flexShrink: 0,
          background: 'rgba(8,16,32,0.65)', backdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, color: 'rgba(255,255,255,0.7)', padding: 0 }}>
                <Menu size={18} strokeWidth={2} />
              </button>
            )}
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0, letterSpacing: '-0.01em' }}>{pageTitle}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: 10, background: notifOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', boxShadow: notifOpen ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Bell size={15} color={totalCount > 0 ? '#ff453a' : 'rgba(255,255,255,0.55)'} strokeWidth={1.8} />
                {totalCount > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#ff453a', border: '1.5px solid rgba(8,16,32,0.9)', boxShadow: '0 0 6px rgba(255,69,58,0.7)' }} />}
              </button>
              {notifOpen && <NotifPanel notifs={notifications} onClose={() => setNotifOpen(false)} />}
            </div>

            <div style={{ width: 0.5, height: 18, background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor},${roleColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', boxShadow: `0 2px 8px ${roleColor}44` }}>{initials}</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{profile?.name}</p>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: 'transparent' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
