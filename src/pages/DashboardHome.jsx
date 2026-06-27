import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Link } from 'react-router-dom'

const INIT_ORDERS  = []
const INIT_STOCK   = []
const INIT_ATTEND  = []

const UDANG_FALLBACK = [
  { name: 'Udang Vaname', qty: 70, max: 100 },
  { name: 'Udang Windu',  qty: 20, max: 100 },
  { name: 'Udang Biru',   qty: 40, max: 100 },
]

const STATUS_BADGE = {
  selesai: { label: 'Selesai', bg: 'white', text: '#16a34a', border: '#bbf7d0' },
  proses:  { label: 'Dikirim', bg: 'white', text: '#2563eb', border: '#bfdbfe' },
  pending: { label: 'Draft',   bg: 'white', text: '#64748b', border: '#e2e8f0' },
  batal:   { label: 'Batal',   bg: 'white', text: '#dc2626', border: '#fecaca' },
}

function totalOf(items) { return (items || []).reduce((a, i) => a + i.qty * i.price, 0) }

export default function DashboardHome() {
  const { profile } = useAuth()
  const today  = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const todayKey = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const [orders]     = useLocalStorage('nwj_orders',     INIT_ORDERS)
  const [stock]      = useLocalStorage('nwj_stock',      INIT_STOCK)
  const [attendance] = useLocalStorage('nwj_attendance', INIT_ATTEND)

  // Stat computations
  const penjualanBulanIni = orders
    .filter(o => o.status === 'selesai' && (o.date || '').startsWith(thisMonth))
    .reduce((a, o) => a + totalOf(o.items), 0)

  const orderPending = orders.filter(o => o.status === 'pending').length

  const hadirCount    = attendance.filter(a => a.date === todayKey && a.status === 'hadir').length
  const totalExpected = [...new Set(attendance.filter(a => a.date === todayKey).map(a => a.name))].length || 2

  const stokTipis = stock.filter(s => s.qty <= s.minQty).length

  const STAT_CARDS = [
    {
      label: 'Penjualan bulan ini',
      value: penjualanBulanIni > 0
        ? `Rp\n${penjualanBulanIni.toLocaleString('id')}`
        : 'Rp\n0',
      sub: null,
      color: '#dbeafe', dot: '#93c5fd',
    },
    {
      label: 'Order Pending',
      value: String(orderPending),
      sub: 'belum selesai',
      color: '#fef9c3', dot: '#fde047',
    },
    {
      label: 'Hadir hari ini',
      value: `${hadirCount}/${totalExpected}`,
      sub: null,
      color: '#dcfce7', dot: '#86efac',
    },
    {
      label: 'Stok tipis',
      value: String(stokTipis),
      sub: 'jenis produk',
      color: '#fee2e2', dot: '#fca5a5',
    },
  ]

  // Recent orders — latest 3
  const recentOrders = [...orders]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3)

  // Stok Udang — prioritise udang category, fallback to top 3
  const udangItems = stock.filter(s => s.category === 'Udang')
  const stokDisplay = udangItems.length > 0
    ? udangItems.slice(0, 3).map(s => ({ name: s.name, qty: s.qty, max: Math.max(s.qty, s.minQty * 3, 50) }))
    : stock.length > 0
      ? stock.slice(0, 3).map(s => ({ name: s.name, qty: s.qty, max: Math.max(s.qty, s.minQty * 3, 50) }))
      : UDANG_FALLBACK

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Selamat datang, {profile?.name} 👋
        </h2>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80">
            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
              style={{ background: card.color }}>
              <div className="w-5 h-5 rounded-md" style={{ background: card.dot }} />
            </div>
            <p className="text-slate-500 text-sm">{card.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1 leading-tight whitespace-pre-line tracking-tight">
              {card.value}
            </p>
            {card.sub && <p className="text-slate-400 text-xs mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Orders + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Order Terbaru */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800">Order Terbaru</h3>
            <Link to="/dashboard/orders" className="text-blue-500 text-sm font-medium hover:underline">
              Lihat semua
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Belum ada order.</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map(order => {
                const s = STATUS_BADGE[order.status] || STATUS_BADGE.pending
                return (
                  <div key={order.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{order.id}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{order.client}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stok Udang */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/80">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800">Stok Udang</h3>
            <Link to="/dashboard/stock" className="text-blue-500 text-sm font-medium hover:underline">
              Lihat stok
            </Link>
          </div>
          <div className="space-y-5">
            {stokDisplay.map(item => {
              const pct = Math.min(Math.round((item.qty / item.max) * 100), 100)
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-slate-700 text-sm font-medium">{item.name}</p>
                    <p className="text-blue-600 font-bold text-sm">{item.qty} kg</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
