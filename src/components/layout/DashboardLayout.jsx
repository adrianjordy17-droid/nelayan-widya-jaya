import { Outlet, useLocation } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Beranda', feature: null },
  { path: '/dashboard/orders', label: 'Order', feature: 'orders' },
  { path: '/dashboard/clients', label: 'Klien', feature: 'clients' },
  { path: '/dashboard/stock', label: 'Stok', feature: 'stock' },
  { path: '/dashboard/reports', label: 'Laporan', feature: 'reports' },
  { path: '/dashboard/attendance', label: 'Absensi', feature: 'attendance' },
  { path: '/dashboard/settings', label: 'Pengaturan', feature: 'settings' },
]

const ROLE_COLOR = {
  owner: '#f59e0b',
  admin: '#3b82f6',
  staff: '#10b981',
}

export default function DashboardLayout() {
  const { profile, signOut, hasPermission } = useAuth()
  const initials = (profile?.name || 'U').slice(0, 2).toUpperCase()
  const roleColor = ROLE_COLOR[profile?.role] || '#3b82f6'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#dde8f8' }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-48 shrink-0 flex flex-col h-screen"
        style={{ background: 'linear-gradient(175deg, #0c1a4a 0%, #132060 60%, #1a2d80 100%)' }}>

        {/* Brand */}
        <div className="px-5 py-6">
          <p className="text-white font-black tracking-[0.2em] text-xs uppercase leading-tight">
            UD. Nelayan Widya Jaya
          </p>
          <p className="text-blue-400 text-[10px] tracking-[0.3em] mt-1 uppercase">Supplier</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ path, label, feature }) => {
            if (feature && !hasPermission(feature)) return null
            return (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm transition-all font-medium
                  ${isActive
                    ? 'text-white bg-blue-600/35 border-l-[3px] border-blue-400 pl-[13px]'
                    : 'text-blue-200/60 hover:text-blue-100 hover:bg-white/6 border-l-[3px] border-transparent pl-[13px]'
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
        <header className="flex items-center justify-end gap-2.5 px-6 py-3.5 shrink-0"
          style={{ background: 'linear-gradient(90deg, #0c1a4a 0%, #1a2d80 100%)' }}>

          {/* Notification / action buttons */}
          {[
            { bg: '#1e3a8a', dot: false },
            { bg: '#1e3a8a', dot: true },
            { bg: '#1e3a8a', dot: false },
          ].map((btn, i) => (
            <button key={i}
              className="w-9 h-9 rounded-xl flex items-center justify-center relative transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {btn.dot && <div className="w-2 h-2 rounded-full bg-blue-300" />}
            </button>
          ))}

          {/* Avatar */}
          <div className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 ml-1"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: roleColor }}>
              {initials}
            </div>
            <span className="text-white text-sm font-medium">{profile?.name}</span>
          </div>

          {/* Logout */}
          <button onClick={signOut}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: 'rgba(109,40,217,0.5)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
            </svg>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-7 ocean-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
