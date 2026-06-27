import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const STAT_CARDS = [
  {
    label: 'Penjualan bulan ini',
    value: 'Rp 6.850.000',
    sub: null,
    bg: '#eff6ff',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    label: 'Order Pending',
    value: '2',
    sub: 'belum selesai',
    bg: '#fefce8',
    iconBg: '#fef9c3',
    iconColor: '#ca8a04',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    label: 'Hadir hari ini',
    value: '0/2',
    sub: 'karyawan',
    bg: '#f0fdf4',
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Stok tipis',
    value: '0',
    sub: 'jenis produk',
    bg: '#fff1f2',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
]

const RECENT_ORDERS = [
  { id: 'SO-003', client: 'UD Maju Bersama', date: '27 Jun 2025', status: 'Draft' },
  { id: 'SO-002', client: 'Restoran Bahari', date: '25 Jun 2025', status: 'Dikirim' },
  { id: 'SO-001', client: 'PT Seafood Nusantara', date: '22 Jun 2025', status: 'Selesai' },
]

const STATUS_CONFIG = {
  Draft:   { dot: '#94a3b8', text: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  Dikirim: { dot: '#3b82f6', text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  Selesai: { dot: '#22c55e', text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
}

const STOK_UDANG = [
  { name: 'Udang Vaname', qty: 70, max: 100, color: '#2563eb' },
  { name: 'Udang Windu',  qty: 20, max: 100, color: '#f59e0b' },
  { name: 'Udang Biru',   qty: 40, max: 100, color: '#0ea5e9' },
]

export default function DashboardHome() {
  const { profile } = useAuth()
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })

  return (
    <div className="space-y-5">

      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-slate-800 leading-tight">
            Selamat datang, {profile?.name || 'User'} 👋
          </h2>
          <p className="text-slate-400 text-sm mt-1 capitalize">{today}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-sm">
          <p className="text-slate-400 text-[11px]">Status</p>
          <p className="text-green-600 text-xs font-semibold flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Operasional
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: card.iconBg, color: card.iconColor }}>
              {card.icon}
            </div>
            <p className="text-slate-500 text-xs font-medium leading-snug">{card.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1.5 leading-none tracking-tight">
              {card.value}
            </p>
            {card.sub && (
              <p className="text-slate-400 text-xs mt-1">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Orders + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent orders — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800 text-[15px]">Order Terbaru</h3>
            <a href="/dashboard/orders"
              className="text-blue-500 text-xs font-semibold hover:text-blue-600 transition-colors">
              Lihat semua →
            </a>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-12 pb-2 mb-1 border-b border-slate-100">
            <p className="col-span-3 text-slate-400 text-[11px] font-semibold uppercase tracking-wide">No. Order</p>
            <p className="col-span-5 text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Klien</p>
            <p className="col-span-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wide">Tanggal</p>
            <p className="col-span-2 text-slate-400 text-[11px] font-semibold uppercase tracking-wide text-right">Status</p>
          </div>

          <div className="divide-y divide-slate-50">
            {RECENT_ORDERS.map(order => {
              const s = STATUS_CONFIG[order.status]
              return (
                <div key={order.id} className="grid grid-cols-12 py-3.5 items-center">
                  <p className="col-span-3 font-bold text-slate-800 text-sm">{order.id}</p>
                  <p className="col-span-5 text-slate-500 text-sm">{order.client}</p>
                  <p className="col-span-2 text-slate-400 text-xs">{order.date}</p>
                  <div className="col-span-2 flex justify-end">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      {order.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stok Udang — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800 text-[15px]">Stok Udang</h3>
            <a href="/dashboard/stock"
              className="text-blue-500 text-xs font-semibold hover:text-blue-600 transition-colors">
              Detail →
            </a>
          </div>
          <div className="space-y-5">
            {STOK_UDANG.map(item => {
              const pct = Math.round((item.qty / item.max) * 100)
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-700 text-sm font-medium">{item.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-800 font-bold text-sm">{item.qty}</span>
                      <span className="text-slate-400 text-xs">/ {item.max} kg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                      }}
                    />
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 text-right">{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer badge */}
      <div className="flex">
        <span className="inline-flex items-center gap-2 border border-slate-200 text-slate-400 text-xs px-4 py-2 rounded-lg bg-white">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Shrimp Supplier Management System — UD. Nelayan Widya Jaya
        </span>
      </div>

    </div>
  )
}
