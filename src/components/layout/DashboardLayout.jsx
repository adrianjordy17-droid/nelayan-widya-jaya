import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const initials = (profile?.name || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#e8effa' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-end gap-3 px-8 py-4"
          style={{ background: 'linear-gradient(90deg, #0d1b4b 0%, #1a2d6b 100%)' }}>
          {/* Icon buttons */}
          {[0,1,2].map(i => (
            <div key={i} className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              {i === 1 && <div className="w-2 h-2 rounded-full bg-blue-300" />}
            </div>
          ))}

          {/* Avatar + name */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2 ml-1">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-white text-sm font-medium">{profile?.name}</span>
          </div>

          {/* Logout */}
          <button onClick={signOut}
            className="w-9 h-9 rounded-xl bg-purple-700/60 border border-purple-500/30 flex items-center justify-center hover:bg-purple-600/60 transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto ocean-scrollbar p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
