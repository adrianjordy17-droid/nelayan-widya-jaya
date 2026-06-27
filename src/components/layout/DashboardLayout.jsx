import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutGrid, Bell, Settings, LogOut, Package, ClipboardList, ChevronRight } from 'lucide-react'
import { generateDailyReport, sendToWhatsApp } from '../../lib/whatsapp'

const NAV_ITEMS = [
  { path: '/dashboard',             label: 'Beranda',   feature: null },
  { path: '/dashboard/orders',      label: 'Order',     feature: 'orders' },
  { path: '/dashboard/clients',     label: 'Klien',     feature: 'clients' },
  { path: '/dashboard/stock',       label: 'Stok',      feature: 'stock' },
  { path: '/dashboard/reports',     label: 'Laporan',   feature: 'reports' },
  { path: '/dashboard/attendance',  label: 'Absensi',   feature: 'attendance' },
  { path: '/dashboard/settings',    label: 'Pengaturan',feature: 'settings' },
]

const ROLE_COLOR = { owner: '#f59e0b', admin: '#3b82f6', staff: '#10b981' }

/* ── Notification helpers ── */
function getNotifications() {
  try {
    const orders  = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
    const stock   = JSON.parse(localStorage.getItem('nwj_stock')  || '[]')
    const today   = new Date().toISOString().slice(0, 10)
    const pending = orders.filter(o => o.status === 'pending')
    const low     = stock.filter(s => s.qty <= s.minQty)
    return [
      ...low.map(s => ({
        id: `stock-${s.id}`,
        type: 'stock',
        icon: '⚠️',
        title: `Stok ${s.name} rendah`,
        desc: `Sisa ${s.qty} ${s.unit} — min. ${s.minQty}`,
        urgent: true,
      })),
      ...pending.map(o => ({
        id: `order-${o.id}`,
        type: 'order',
        icon: '📋',
        title: `Order ${o.id} menunggu`,
        desc: o.client,
        urgent: false,
      })),
    ]
  } catch { return [] }
}

/* ── WA scheduler: auto-send at configured time ── */
function useWAScheduler() {
  const sentRef = useRef('')
  useEffect(() => {
    const tick = () => {
      try {
        const cfg = JSON.parse(localStorage.getItem('nwj_wa_config') || '{}')
        if (!cfg.enabled || !cfg.token || !cfg.target) return
        const now  = new Date()
        const key  = `${now.toDateString()}-${cfg.sendTime || '18:00'}`
        if (sentRef.current === key) return
        const [th, tm] = (cfg.sendTime || '18:00').split(':').map(Number)
        if (now.getHours() === th && now.getMinutes() === tm) {
          sentRef.current = key
          const orders     = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
          const stock      = JSON.parse(localStorage.getItem('nwj_stock') || '[]')
          const attendance = JSON.parse(localStorage.getItem('nwj_attendance') || '[]')
          const message    = generateDailyReport(orders, stock, attendance)
          sendToWhatsApp({ token: cfg.token, target: cfg.target, message })
            .catch(() => {})
        }
      } catch {}
    }
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
}

/* ── Notification panel ── */
function NotifPanel({ notifs, onClose }) {
  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="font-bold text-slate-800 text-sm">Notifikasi</p>
        <span className="text-xs text-slate-400">{notifs.length} pesan</span>
      </div>
      {notifs.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-slate-400 text-sm">Tidak ada notifikasi baru</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
          {notifs.map(n => (
            <div key={n.id}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-default ${n.urgent ? 'bg-red-50/40' : ''}`}>
              <span className="text-lg mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-sm font-semibold leading-snug">{n.title}</p>
                <p className="text-slate-400 text-xs mt-0.5 truncate">{n.desc}</p>
              </div>
              {n.urgent && <span className="shrink-0 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Urgent</span>}
            </div>
          ))}
        </div>
      )}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
        <NavLink to="/dashboard/settings" onClick={onClose}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
          Atur notifikasi WA <ChevronRight size={12} />
        </NavLink>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { profile, signOut, hasPermission } = useAuth()
  const initials  = (profile?.name || 'U').slice(0, 2).toUpperCase()
  const roleColor = ROLE_COLOR[profile?.role] || '#3b82f6'

  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)

  useWAScheduler()

  // Reload notifications when panel opens
  useEffect(() => {
    if (notifOpen) setNotifications(getNotifications())
  }, [notifOpen])

  // Eagerly load count
  useEffect(() => {
    setNotifications(getNotifications())
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const urgentCount = notifications.filter(n => n.urgent).length
  const totalCount  = notifications.length

  const iconBtn = "w-9 h-9 rounded-xl flex items-center justify-center relative transition-all hover:bg-white/15 active:scale-95"
  const iconStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#dde8f8' }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-48 shrink-0 flex flex-col h-screen"
        style={{ background: 'linear-gradient(175deg, #0c1a4a 0%, #132060 60%, #1a2d80 100%)' }}>

        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/8">
          <p className="text-white font-black tracking-[0.18em] text-[11px] uppercase leading-tight">
            UD. Nelayan<br />Widya Jaya
          </p>
          <p className="text-blue-400 text-[9px] tracking-[0.35em] mt-1.5 uppercase">Supplier</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ path, label, feature }) => {
            if (feature && !hasPermission(feature)) return null
            return (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-xl text-sm transition-all font-medium select-none
                  ${isActive
                    ? 'text-white bg-blue-600/40 border-l-[3px] border-blue-400 pl-[13px]'
                    : 'text-blue-200/55 hover:text-blue-100 hover:bg-white/6 border-l-[3px] border-transparent pl-[13px]'
                  }`
                }
              >
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* User badge */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: roleColor }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile?.name}</p>
              <p className="text-blue-300 text-[10px] capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-end gap-2 px-5 py-3 shrink-0"
          style={{ background: 'linear-gradient(90deg, #0c1a4a 0%, #1a2d80 100%)' }}>

          {/* Grid button */}
          <button className={iconBtn} style={iconStyle} title="Beranda">
            <LayoutGrid size={16} className="text-blue-200/70" />
          </button>

          {/* Bell button with notification badge */}
          <div className="relative" ref={notifRef}>
            <button
              className={iconBtn}
              style={iconStyle}
              title="Notifikasi"
              onClick={() => setNotifOpen(v => !v)}
            >
              <Bell size={16} className={totalCount > 0 ? 'text-blue-200' : 'text-blue-200/70'} />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center px-0.5 leading-none">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </button>
            {notifOpen && <NotifPanel notifs={notifications} onClose={() => setNotifOpen(false)} />}
          </div>

          {/* Settings button */}
          <NavLink to="/dashboard/settings">
            <button className={iconBtn} style={iconStyle} title="Pengaturan">
              <Settings size={16} className="text-blue-200/70" />
            </button>
          </NavLink>

          {/* Avatar */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 ml-1"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: roleColor }}>
              {initials}
            </div>
            <span className="text-white text-sm font-medium">{profile?.name}</span>
          </div>

          {/* Logout */}
          <button onClick={signOut} title="Keluar"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
            style={{ background: 'rgba(109,40,217,0.5)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <LogOut size={15} className="text-white" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto ocean-scrollbar">
          {/* System badge strip */}
          <div className="px-7 pt-3 pb-0">
            <span className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-400 text-[11px] px-3 py-1 rounded-lg bg-white/80">
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
