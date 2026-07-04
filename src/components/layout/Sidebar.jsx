import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
// v2

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Beranda', feature: null },
  { path: '/dashboard/orders', label: 'Order', feature: 'orders' },
  { path: '/dashboard/deliveries', label: 'Laporan Kirim', feature: 'deliveries' },
  { path: '/dashboard/clients', label: 'Klien', feature: 'clients' },
  { path: '/dashboard/stock', label: 'Stok', feature: 'stock' },
  { path: '/dashboard/reports', label: 'Laporan', feature: 'reports' },
  { path: '/dashboard/attendance', label: 'Absensi', feature: 'attendance' },
  { path: '/dashboard/bookkeeping', label: 'Pembukuan', feature: 'bookkeeping' },
  { path: '/dashboard/employees', label: 'Karyawan', feature: 'settings' },
  { path: '/dashboard/settings', label: 'Pengaturan', feature: 'settings' },
]

export default function Sidebar() {
  const { hasPermission } = useAuth()

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'linear-gradient(180deg, #0d1b4b 0%, #1a2d6b 100%)' }}>

      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <p className="text-white font-bold tracking-[0.18em] text-sm uppercase leading-tight">UD. Nelayan Widya Jaya</p>
        <p className="text-blue-300 text-xs tracking-widest mt-1">Supplier</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        {NAV_ITEMS.map(({ path, label, feature }) => {
          if (feature && !hasPermission(feature)) return null
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl mb-0.5 text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600/40 text-white border-l-4 border-blue-400'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/8'
                }`
              }
            >
              {label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
