import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const STAT_CARDS = [
  { label: 'Penjualan bulan ini', value: 'Rp\n6.850.000', sub: null, color: '#dbeafe', dot: '#93c5fd' },
  { label: 'Order Pending', value: '2', sub: 'belum selesai', color: '#fef9c3', dot: '#fde047' },
  { label: 'Hadir hari ini', value: '0/2', sub: null, color: '#dcfce7', dot: '#86efac' },
  { label: 'Stok tipis', value: '0', sub: 'jenis produk', color: '#fee2e2', dot: '#fca5a5' },
]

const RECENT_ORDERS = [
  { id: 'SO-003', client: 'UD Maju Bersama', status: 'Draft' },
  { id: 'SO-002', client: 'Restoran Bahari', status: 'Dikirim' },
  { id: 'SO-001', client: 'PT Seafood Nusantara', status: 'Selesai' },
]

const STATUS_STYLE = {
  Draft: 'border border-slate-300 text-slate-500 bg-white',
  Dikirim: 'border border-blue-300 text-blue-600 bg-white',
  Selesai: 'border border-green-300 text-green-600 bg-white',
}

const STOK_UDANG = [
  { name: 'Udang Vaname', qty: 70, max: 100 },
  { name: 'Udang Windu', qty: 20, max: 100 },
  { name: 'Udang Biru', qty: 40, max: 100 },
]

export default function DashboardHome() {
  const { profile } = useAuth()
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Selamat datang, {profile?.name} 👋</h2>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="w-12 h-12 rounded-xl mb-4" style={{ background: card.color }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-md" style={{ background: card.dot }} />
              </div>
            </div>
            <p className="text-slate-500 text-sm">{card.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1 leading-tight whitespace-pre-line">{card.value}</p>
            {card.sub && <p className="text-slate-400 text-xs mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Orders + Stock row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800">Order Terbaru</h3>
            <a href="/dashboard/orders" className="text-blue-500 text-sm font-medium hover:underline">Lihat semua</a>
          </div>
          <div className="space-y-4">
            {RECENT_ORDERS.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{order.id}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{order.client}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stok Udang */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-5">Stok Udang</h3>
          <div className="space-y-5">
            {STOK_UDANG.map(item => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-slate-700 text-sm font-medium">{item.name}</p>
                  <p className="text-blue-600 font-bold text-sm">{item.qty} kg</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(item.qty / item.max) * 100}%`, background: 'linear-gradient(90deg, #2563eb, #60a5fa)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badge */}
      <div className="flex">
        <span className="inline-block border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-lg bg-white">
          Shrimp Supplier Management System
        </span>
      </div>
    </div>
  )
}
