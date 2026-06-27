import { NavLink } from 'react-router-dom'
import {
  Fish, LayoutDashboard, ShoppingCart, Package,
  BarChart3, UserCheck, Users, Settings, LogOut,
  ChevronRight, Anchor
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: null },
  { path: '/dashboard/orders', label: 'Order Penjualan', icon: ShoppingCart, feature: 'orders' },
  { path: '/dashboard/stock', label: 'Stok Ikan', icon: Package, feature: 'stock' },
  { path: '/dashboard/reports', label: 'Laporan', icon: BarChart3, feature: 'reports' },
  { path: '/dashboard/attendance', label: 'Absensi Selfie', icon: UserCheck, feature: 'attendance' },
  { path: '/dashboard/clients', label: 'Database Klien', icon: Users, feature: 'clients' },
  { path: '/dashboard/settings', label: 'Pengaturan', icon: Settings, feature: 'settings' },
]

const ROLE_BADGE = {
  owner: { label: 'Owner', color: 'bg-amber-500' },
  admin: { label: 'Admin', color: 'bg-blue-500' },
  staff: { label: 'Staff', color: 'bg-green-500' },
}

export default function Sidebar({ collapsed, onToggle }) {
  const { profile, signOut, hasPermission } = useAuth()
  const badge = ROLE_BADGE[profile?.role] || ROLE_BADGE.staff

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 bg-gradient-to-b from-sky-900 to-blue-900 flex flex-col h-screen sticky top-0 shadow-xl`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="shrink-0 bg-cyan-400 rounded-xl p-2 shadow">
          <Fish className="text-white" size={20} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Widya Jaya</p>
            <p className="text-cyan-300 text-xs">UD. Nelayan</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-white/60 hover:text-white transition"
        >
          <ChevronRight size={16} className={`${collapsed ? 'rotate-0' : 'rotate-180'} transition-transform`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto ocean-scrollbar">
        {NAV_ITEMS.map(({ path, label, icon: Icon, feature }) => {
          if (feature && !hasPermission(feature)) return null
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl mb-1 transition group
                ${isActive
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/30'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {profile?.name?.[0] || profile?.email?.[0] || '?'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-sm font-medium truncate">{profile?.name || profile?.email}</p>
              <span className={`text-xs text-white px-1.5 py-0.5 rounded ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm mb-2">
            {profile?.name?.[0] || '?'}
          </div>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 justify-center px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition text-sm"
        >
          <LogOut size={16} />
          {!collapsed && 'Keluar'}
        </button>
      </div>
    </aside>
  )
}
