import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/dashboard/orders': 'Order Penjualan',
  '/dashboard/stock': 'Manajemen Stok',
  '/dashboard/reports': 'Laporan',
  '/dashboard/attendance': 'Absensi Selfie',
  '/dashboard/clients': 'Database Klien',
  '/dashboard/settings': 'Pengaturan',
}

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { profile, demoMode } = useAuth()
  const title = PAGE_TITLES[location.pathname] || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <p className="text-xs text-slate-500">UD. Nelayan Widya Jaya</p>
          </div>

          {demoMode && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-200">
              Demo Mode
            </span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Cari..."
                className="bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-48"
              />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              {profile?.name?.[0] || '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto ocean-scrollbar p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
