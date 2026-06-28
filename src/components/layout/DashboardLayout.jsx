import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShoppingBag, Users, Package,
  BarChart2, CalendarCheck, Settings2,
  Bell, LogOut, ChevronRight, Waves,
} from 'lucide-react'
import { generateDailyReport, sendToWhatsApp } from '../../lib/whatsapp'

const NAV_ITEMS = [
  { path: '/dashboard',            label: 'Beranda',    icon: LayoutDashboard, feature: null },
  { path: '/dashboard/orders',     label: 'Order',      icon: ShoppingBag,     feature: 'orders' },
  { path: '/dashboard/clients',    label: 'Klien',      icon: Users,           feature: 'clients' },
  { path: '/dashboard/stock',      label: 'Stok',       icon: Package,         feature: 'stock' },
  { path: '/dashboard/reports',    label: 'Laporan',    icon: BarChart2,       feature: 'reports' },
  { path: '/dashboard/attendance', label: 'Absensi',    icon: CalendarCheck,   feature: 'attendance' },
  { path: '/dashboard/settings',   label: 'Pengaturan', icon: Settings2,       feature: 'settings' },
]

const ROLE_COLOR  = { owner: '#f59e0b', admin: '#3b82f6', staff: '#10b981' }
const ROLE_LABEL  = { owner: 'Pemilik', admin: 'Admin', staff: 'Staff' }
const PAGE_TITLE  = {
  '/dashboard':            'Beranda',
  '/dashboard/orders':     'Manajemen Order',
  '/dashboard/clients':    'Data Klien',
  '/dashboard/stock':      'Manajemen Stok',
  '/dashboard/reports':    'Laporan & Analitik',
  '/dashboard/attendance': 'Absensi Karyawan',
  '/dashboard/settings':   'Pengaturan Sistem',
}

/* ─── notifications ─── */
function getNotifications() {
  try {
    const orders = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
    const stock  = JSON.parse(localStorage.getItem('nwj_stock')  || '[]')
    return [
      ...stock.filter(s => s.qty <= s.minQty).map(s => ({
        id: `s-${s.id}`, type: 'stock', urgent: true,
        title: `Stok ${s.name} kritis`,
        desc:  `Sisa ${s.qty} ${s.unit} — min. ${s.minQty}`,
      })),
      ...orders.filter(o => o.status === 'pending').map(o => ({
        id: `o-${o.id}`, type: 'order', urgent: false,
        title: `Order ${o.id} menunggu`,
        desc:  o.client,
      })),
    ]
  } catch { return [] }
}

/* ─── WA scheduler ─── */
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

/* ─── Notif Dropdown ─── */
function NotifPanel({ notifs, onClose }) {
  const stockNotifs = notifs.filter(n => n.type === 'stock')
  const orderNotifs = notifs.filter(n => n.type === 'order')
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden bg-white">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-800 text-sm">Notifikasi</p>
          <p className="text-slate-400 text-[11px] mt-0.5">{notifs.length} pesan baru</p>
        </div>
        {notifs.length > 0 && (
          <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">{notifs.length}</span>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Semua aman</p>
          <p className="text-slate-400 text-xs mt-0.5">Tidak ada notifikasi baru</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {stockNotifs.length > 0 && (
            <div className="px-5 py-2 bg-red-50/60 border-b border-red-100/50">
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider">⚠ Stok Kritis</p>
            </div>
          )}
          {stockNotifs.map(n => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-3 hover:bg-red-50/30 transition border-b border-slate-50">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Package size={14} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-[13px] font-semibold">{n.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{n.desc}</p>
              </div>
            </div>
          ))}
          {orderNotifs.length > 0 && (
            <div className="px-5 py-2 bg-amber-50/60 border-b border-amber-100/50">
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">📋 Order Pending</p>
            </div>
          )}
          {orderNotifs.map(n => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-3 hover:bg-amber-50/20 transition border-b border-slate-50">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <ShoppingBag size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-slate-800 text-[13px] font-semibold">{n.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <NavLink to="/dashboard/settings" onClick={onClose}
          className="flex items-center justify-between text-xs text-blue-500 hover:text-blue-700 font-semibold transition">
          <span>Atur notifikasi WhatsApp</span>
          <ChevronRight size={13} />
        </NavLink>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { profile, signOut, hasPermission } = useAuth()
  const location  = useLocation()
  const initials  = (profile?.name || 'U').slice(0, 2).toUpperCase()
  const roleColor = ROLE_COLOR[profile?.role] || '#3b82f6'
  const pageTitle = PAGE_TITLE[location.pathname] || 'Dashboard'

  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)

  useWAScheduler()

  useEffect(() => { setNotifications(getNotifications()) }, [])
  useEffect(() => { if (notifOpen) setNotifications(getNotifications()) }, [notifOpen])
  useEffect(() => {
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const totalCount = notifications.length

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#e8eef8' }}>

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className="w-56 shrink-0 flex flex-col h-screen relative"
        style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f2147 40%, #0d1e3d 100%)' }}>

        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-32 opacity-5"
            style={{ background: 'linear-gradient(0deg, #3b82f6, transparent)' }} />
        </div>

        {/* ── Brand ── */}
        <div className="relative px-5 pt-6 pb-5">
          {/* Logo mark */}
          <div className="w-10 h-10 rounded-2xl mb-4 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.15))',
              border: '1px solid rgba(99,149,255,0.25)',
              boxShadow: '0 0 20px rgba(59,130,246,0.15)',
            }}>
            <Waves size={18} className="text-blue-300" />
          </div>

          <p className="text-white font-extrabold text-[12px] leading-snug tracking-[0.05em]">
            UD. Nelayan<br />Widya Jaya
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1 h-1 rounded-full bg-blue-400" />
            <p className="text-blue-400/60 text-[9px] tracking-[0.35em] uppercase font-medium">Supplier</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,149,255,0.2), transparent)' }} />

        {/* ── Nav label ── */}
        <div className="px-5 mb-2">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(148,163,184,0.35)' }}>Menu Utama</p>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon, feature }) => {
            if (feature && !hasPermission(feature)) return null
            return (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 relative
                  ${isActive
                    ? 'text-white'
                    : 'text-slate-400/70 hover:text-slate-200'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.12))',
                  border: '1px solid rgba(99,149,255,0.2)',
                  boxShadow: '0 2px 12px rgba(37,99,235,0.15)',
                } : {
                  border: '1px solid transparent',
                }}
              >
                {({ isActive }) => (
                  <>
                    {/* Icon box */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={isActive ? {
                        background: 'rgba(59,130,246,0.35)',
                        boxShadow: '0 0 10px rgba(59,130,246,0.3)',
                      } : {
                        background: 'rgba(255,255,255,0.05)',
                      }}>
                      <Icon size={14} className={isActive ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'} />
                    </div>

                    <span className="flex-1">{label}</span>

                    {/* Active dot */}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                        style={{ boxShadow: '0 0 6px rgba(96,165,250,0.8)' }} />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-5 h-px my-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,149,255,0.15), transparent)' }} />

        {/* ── User badge ── */}
        <div className="px-4 pb-5 relative">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            {/* Avatar ring */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}aa)`, boxShadow: `0 0 10px ${roleColor}44` }}>
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0a1628]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-bold truncate leading-tight">{profile?.name}</p>
              <p className="text-[10px] mt-0.5 capitalize font-medium" style={{ color: roleColor }}>
                {ROLE_LABEL[profile?.role] || profile?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Topbar ── */}
        <header className="flex items-center justify-between px-6 py-3.5 shrink-0"
          style={{
            background: 'linear-gradient(90deg, #0a1628 0%, #0f2147 60%, #0d1e3d 100%)',
            borderBottom: '1px solid rgba(99,149,255,0.1)',
          }}>

          {/* Page title */}
          <div className="flex items-center gap-2.5">
            <div className="w-px h-5 rounded-full bg-blue-500/40" />
            <div>
              <p className="text-white text-sm font-bold tracking-wide">{pageTitle}</p>
              <p className="text-blue-400/50 text-[10px] tracking-widest uppercase mt-0.5">Dashboard</p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">

            {/* Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: notifOpen ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)',
                  border: notifOpen ? '1px solid rgba(99,149,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}
                title="Notifikasi">
                <Bell size={15} className={totalCount > 0 ? 'text-blue-300' : 'text-slate-400'} />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center px-0.5 shadow-lg">
                    {totalCount > 9 ? '9+' : totalCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotifPanel notifs={notifications} onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Divider */}
            <div className="w-px h-5 rounded-full mx-0.5" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Avatar + name */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)` }}>
                {initials}
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold leading-none">{profile?.name}</p>
                <p className="text-[10px] capitalize mt-0.5" style={{ color: roleColor }}>
                  {ROLE_LABEL[profile?.role] || profile?.role}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button onClick={signOut} title="Keluar"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 hover:opacity-90"
              style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(167,139,250,0.25)' }}>
              <LogOut size={14} className="text-purple-300" />
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto ocean-scrollbar">
          <div className="px-7 pt-3 pb-1">
            <span className="inline-flex items-center gap-1.5 border border-blue-100 text-slate-400 text-[11px] px-3 py-1 rounded-lg bg-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              Shrimp Supplier Management System
            </span>
          </div>
          <div className="p-7 pt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
