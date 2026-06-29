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
      .map(p => ({
        id: `s-${p.id}`, type: 'stock',
        title: `Stok ${p.nama} kritis`,
        desc:  `Sisa ${p.qty || 0} ${p.satuan || 'kg'} — min. ${p.min_qty}`,
      }))
    const orderNotifs = (draftSOs || []).map(d => ({
      id: `o-${d.id}`, type: 'order',
      title: `SO ${d.number} menunggu`,
      desc:  d.client_name,
    }))
    return [...stockNotifs, ...orderNotifs]
  } catch {
    return []
  }
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
          const orders = (docs || []).map(d => ({
            id: d.number, client: d.client_name, date: d.date, catatan: d.notes || '',
            status: d.status === 'delivered' ? 'selesai' : d.status === 'dispatched' ? 'proses' : d.status === 'cancelled' ? 'batal' : 'pending',
            items: d.items || [],
          }))
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
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 7, marginBottom: 1,
        textDecoration: 'none',
        background: isActive ? '#0a84ff' : hover ? 'rgba(255,255,255,0.07)' : 'transparent',
        transition: 'background 0.12s',
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} color={isActive ? 'white' : 'rgba(255,255,255,0.42)'} />
          <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, color: isActive ? 'white' : 'rgba(255,255,255,0.58)', letterSpacing: '-0.01em' }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function NotifPanel({ notifs, onClose }) {
  const stockN  = notifs.filter(n => n.type === 'stock')
  const orderN  = notifs.filter(n => n.type === 'order')
  return (
    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 300, zIndex: 50, overflow: 'hidden', background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.08)', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px 11px', borderBottom: '0.5px solid #f0f0f0' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Notifikasi</p>
        {notifs.length > 0 && <span style={{ background: '#ff3b30', color: 'white', fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>{notifs.length}</span>}
      </div>
      {notifs.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 26, marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: 13.5, color: '#3c3c43', fontWeight: 500, margin: 0 }}>Semua aman</p>
          <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>Tidak ada notifikasi baru</p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {stockN.length > 0 && <p style={{ fontSize: 11, fontWeight: 600, color: '#ff3b30', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px 4px' }}>Stok Kritis</p>}
          {stockN.map(n => (
            <div key={n.id} style={{ padding: '9px 16px', borderBottom: '0.5px solid #f9f9f9' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
          {orderN.length > 0 && <p style={{ fontSize: 11, fontWeight: 600, color: '#ff9500', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px 4px' }}>SO Draft</p>}
          {orderN.map(n => (
            <div key={n.id} style={{ padding: '9px 16px', borderBottom: '0.5px solid #f9f9f9' }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{n.title}</p>
              <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>{n.desc}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: '11px 16px', borderTop: '0.5px solid #f0f0f0' }}>
        <NavLink to="/dashboard/settings" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none' }}>
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

  const [notifOpen, setNotifOpen]         = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const notifRef = useRef(null)

  useWAScheduler()

  useEffect(() => {
    fetchNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    if (notifOpen) fetchNotifications().then(setNotifications)
  }, [notifOpen])

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>

      {isMobile && sidebarOpen && (
        <div onClick={closeSidebar} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)' }} />
      )}

      <aside style={{
        width: 220, flexShrink: 0, height: '100vh', overflow: 'hidden',
        background: '#1c1c1e', display: 'flex', flexDirection: 'column',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
        } : {}),
      }}>
        <div style={{ padding: '20px 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(10,132,255,0.4)' }}>
              <Waves size={17} color="white" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>UD. Nelayan Widya Jaya</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Seafood Live, Fresh, Frozen Supplier</p>
            </div>
          </div>
        </div>

        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.08)', margin: '0 14px 10px' }} />

        <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon, feature }) => (
            <SidebarLink key={path} path={path} label={label} Icon={Icon} feature={feature} hasPermission={hasPermission} onNavClick={isMobile ? closeSidebar : undefined} />
          ))}
        </nav>

        <div style={{ padding: '10px 10px 14px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor},${roleColor}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{initials}</div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#30d158', border: '1.5px solid #1c1c1e' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</p>
              <p style={{ fontSize: 10.5, color: roleColor, margin: 0 }}>{ROLE_LABEL[profile?.role] || profile?.role}</p>
            </div>
            <button onClick={signOut} title="Keluar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 48, flexShrink: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, color: '#1c1c1e', padding: 0 }}>
                <Menu size={20} strokeWidth={2} />
              </button>
            )}
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{pageTitle}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOpen(v => !v)} style={{ width: 32, height: 32, borderRadius: 8, background: notifOpen ? '#f2f2f7' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Bell size={16} color={totalCount > 0 ? '#ff3b30' : '#3c3c43'} strokeWidth={1.8} />
                {totalCount > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#ff3b30', border: '1.5px solid white' }} />}
              </button>
              {notifOpen && <NotifPanel notifs={notifications} onClose={() => setNotifOpen(false)} />}
            </div>

            <div style={{ width: 0.5, height: 20, background: 'rgba(0,0,0,0.12)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 99, background: '#f2f2f7' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg,${roleColor},${roleColor}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>{initials}</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{profile?.name}</p>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', background: '#f2f2f7', padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
