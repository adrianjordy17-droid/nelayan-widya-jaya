import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Link } from 'react-router-dom'
import {
  TrendingUp, ShoppingCart, UserCheck, AlertTriangle, ArrowRight,
} from 'lucide-react'

const INIT_ORDERS  = []
const INIT_STOCK   = []
const INIT_ATTEND  = []

const STATUS_CFG = {
  selesai: { label: 'Selesai', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  proses:  { label: 'Dikirim', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  pending: { label: 'Draft',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  batal:   { label: 'Batal',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

function rpFmt(n) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')} jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)} rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}
function totalOf(items) { return (items || []).reduce((a, i) => a + i.qty * i.price, 0) }

export default function DashboardHome() {
  const { profile } = useAuth()
  const today     = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const todayKey  = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const [orders]     = useLocalStorage('nwj_orders',     INIT_ORDERS)
  const [stock]      = useLocalStorage('nwj_stock',      INIT_STOCK)
  const [attendance] = useLocalStorage('nwj_attendance', INIT_ATTEND)

  const penjualanBulanIni = orders
    .filter(o => o.status === 'selesai' && (o.date || '').startsWith(thisMonth))
    .reduce((a, o) => a + totalOf(o.items), 0)

  const orderPending  = orders.filter(o => o.status === 'pending').length
  const hadirCount    = attendance.filter(a => a.date === todayKey && a.status === 'hadir').length
  const totalExpected = [...new Set(attendance.filter(a => a.date === todayKey).map(a => a.name))].length || 0
  const stokTipis     = stock.filter(s => s.qty <= s.minQty).length

  const STATS = [
    {
      label: 'Penjualan Bulan Ini',
      value: rpFmt(penjualanBulanIni),
      sub:   'total omzet bulan ini',
      Icon:  TrendingUp,
      iconColor: '#2563eb',
      iconBg:    '#eff6ff',
      bar:       '#2563eb',
    },
    {
      label: 'Order Pending',
      value: String(orderPending),
      sub:   'menunggu diproses',
      Icon:  ShoppingCart,
      iconColor: '#d97706',
      iconBg:    '#fffbeb',
      bar:       '#d97706',
    },
    {
      label: 'Hadir Hari Ini',
      value: `${hadirCount}/${totalExpected}`,
      sub:   'karyawan hadir',
      Icon:  UserCheck,
      iconColor: '#16a34a',
      iconBg:    '#f0fdf4',
      bar:       '#16a34a',
    },
    {
      label: 'Stok Tipis',
      value: String(stokTipis),
      sub:   stokTipis > 0 ? 'perlu restok segera' : 'semua stok aman',
      Icon:  AlertTriangle,
      iconColor: stokTipis > 0 ? '#dc2626' : '#64748b',
      iconBg:    stokTipis > 0 ? '#fef2f2' : '#f8fafc',
      bar:       stokTipis > 0 ? '#dc2626' : '#94a3b8',
    },
  ]

  const recentOrders = [...orders]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4)

  const udangItems = stock.filter(s => s.category === 'Udang')
  const stokDisplay = (udangItems.length > 0 ? udangItems : stock)
    .slice(0, 4)
    .map(s => ({ name: s.name, qty: s.qty, max: Math.max(s.qty, s.minQty * 3, 50) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Greeting ── */}
      <div>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: '#0f172a',
          margin: 0, letterSpacing: '-0.015em',
        }}>
          Selamat datang, {profile?.name}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' }}>
          {today}
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
      }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg, bar }) => (
          <div key={label} style={{
            background: 'white',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          }}>
            {/* Label + Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3, maxWidth: 100 }}>
                {label}
              </p>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>

            {/* Value */}
            <p style={{
              fontSize: value.length > 10 ? 18 : 26,
              fontWeight: 800, color: '#0f172a',
              margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px' }}>
              {sub}
            </p>

            {/* Bottom bar */}
            <div style={{ height: 3, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ width: '45%', height: '100%', borderRadius: 99, background: bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Order Terbaru */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 13px',
            borderBottom: '1px solid #f8fafc',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Order Terbaru
            </p>
            <Link to="/dashboard/orders" style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, color: '#2563eb', fontWeight: 500,
              textDecoration: 'none',
            }}>
              Lihat semua <ArrowRight size={11} />
            </Link>
          </div>

          <div>
            {recentOrders.length === 0 ? (
              <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Belum ada order.
              </p>
            ) : recentOrders.map((order, idx) => {
              const s = STATUS_CFG[order.status] || STATUS_CFG.pending
              return (
                <div key={order.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '11px 20px',
                  borderBottom: idx < recentOrders.length - 1 ? '1px solid #f8fafc' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      {order.id}
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {order.client}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 99,
                    color: s.color, background: s.bg,
                    border: `1px solid ${s.border}`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stok Udang */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 13px',
            borderBottom: '1px solid #f8fafc',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Stok Udang
            </p>
            <Link to="/dashboard/stock" style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, color: '#2563eb', fontWeight: 500,
              textDecoration: 'none',
            }}>
              Lihat stok <ArrowRight size={11} />
            </Link>
          </div>

          <div style={{ padding: '16px 20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stokDisplay.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: '12px 0' }}>
                Belum ada data stok.
              </p>
            ) : stokDisplay.map(item => {
              const pct = Math.min(Math.round((item.qty / item.max) * 100), 100)
              const barColor = pct < 30 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#2563eb'
              return (
                <div key={item.name}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: barColor, flexShrink: 0,
                      }} />
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#334155', margin: 0 }}>
                        {item.name}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {item.qty} <span style={{ fontWeight: 400, color: '#94a3b8' }}>kg</span>
                    </p>
                  </div>
                  <div style={{
                    height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 99,
                      background: barColor,
                      transition: 'width 0.4s ease',
                    }} />
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
