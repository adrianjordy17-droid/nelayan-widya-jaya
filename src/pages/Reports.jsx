import { useState } from 'react'
import { TrendingUp, BarChart3, FileSpreadsheet, Send, Download, ShoppingCart, CheckCircle, DollarSign } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { generateDailyReport, sendToWhatsApp } from '../lib/whatsapp'

const INIT_ORDERS = [
  { id: 'ORD-001', client: 'Pasar Ikan Muara Baru', date: '2026-06-24', status: 'selesai', catatan: '', items: [{ name: 'Tongkol', qty: 50, unit: 'kg', price: 45000 }] },
  { id: 'ORD-002', client: 'Resto Bahari Indah',    date: '2026-06-25', status: 'proses',  catatan: 'Minta segar', items: [{ name: 'Kakap Merah', qty: 20, unit: 'kg', price: 90000 }] },
  { id: 'ORD-003', client: 'Swalayan Maju Jaya',    date: '2026-06-27', status: 'pending', catatan: '', items: [{ name: 'Udang Vaname', qty: 10, unit: 'kg', price: 120000 }] },
  { id: 'ORD-004', client: 'Bu Sari',               date: '2026-06-25', status: 'selesai', catatan: '', items: [{ name: 'Cumi-cumi', qty: 5, unit: 'kg', price: 120000 }] },
  { id: 'ORD-005', client: 'Pak Budi Nelayan',      date: '2026-06-24', status: 'selesai', catatan: 'Bayar COD', items: [{ name: 'Lele', qty: 100, unit: 'kg', price: 25000 }] },
]
const INIT_STOCK   = []
const INIT_CLIENTS = []

function fmt(n) { return `Rp ${n.toLocaleString('id')}` }
function fmtShort(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`
  return fmt(n)
}
function totalOrder(items) { return items.reduce((a, i) => a + i.qty * i.price, 0) }

function BarChart({ data }) {
  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 8px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.revenue / maxRev) * 160, 4)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: '100%', position: 'relative' }}>
              <div style={{
                width: '100%',
                height: h,
                background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '0.85'
                e.currentTarget.parentElement.querySelector('.tooltip').style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.parentElement.querySelector('.tooltip').style.opacity = '0'
              }}
              />
              <div className="tooltip" style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                background: '#0f172a', color: 'white', fontSize: 11, fontWeight: 600,
                padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                opacity: 0, transition: 'opacity 0.15s', marginBottom: 4, pointerEvents: 'none',
              }}>
                {fmtShort(d.revenue)}
              </div>
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: 0 }}>{d.month}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function Reports() {
  const [orders]  = useLocalStorage('nwj_orders',  INIT_ORDERS)
  const [stock]   = useLocalStorage('nwj_stock',   INIT_STOCK)
  const [clients] = useLocalStorage('nwj_clients', INIT_CLIENTS)
  const [period, setPeriod] = useState('6bulan')
  const [waStatus, setWaStatus] = useState({ loading: false, msg: '', ok: null })

  async function kirimWA() {
    const cfg = JSON.parse(localStorage.getItem('nwj_wa_config') || '{}')
    if (!cfg.token || !cfg.target) {
      setWaStatus({ loading: false, msg: 'Isi token & nomor WA di Pengaturan dulu', ok: false })
      setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 4000)
      return
    }
    setWaStatus({ loading: true, msg: 'Mengirim...', ok: null })
    try {
      const message = generateDailyReport(orders, stock, [])
      await sendToWhatsApp({ token: cfg.token, target: cfg.target, message })
      setWaStatus({ loading: false, msg: 'Berhasil terkirim!', ok: true })
    } catch (err) {
      setWaStatus({ loading: false, msg: err.message, ok: false })
    }
    setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 5000)
  }

  // Build monthly summary from orders
  const monthlyMap = {}
  orders.filter(o => o.status !== 'batal').forEach(o => {
    const m = o.date?.slice(0, 7) || ''
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0 }
    monthlyMap[m].revenue += totalOrder(o.items)
    monthlyMap[m].orders  += 1
  })
  const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const allMonths = Object.keys(monthlyMap).sort()
  const chartData = allMonths.map(m => ({
    month: MONTH_ID[parseInt(m.slice(5), 10) - 1] || m.slice(5),
    revenue: monthlyMap[m].revenue,
    orders:  monthlyMap[m].orders,
    key: m,
  }))

  // Top products
  const productMap = {}
  orders.filter(o => o.status !== 'batal').forEach(o => {
    o.items.forEach(item => {
      if (!productMap[item.name]) productMap[item.name] = { sold: 0, revenue: 0 }
      productMap[item.name].sold    += item.qty
      productMap[item.name].revenue += item.qty * item.price
    })
  })
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const totalRevenue = orders.filter(o => o.status !== 'batal').reduce((a, o) => a + totalOrder(o.items), 0)
  const totalOrders  = orders.filter(o => o.status !== 'batal').length
  const selesaiCount = orders.filter(o => o.status === 'selesai').length
  const avgOrder     = totalOrders ? Math.round(totalRevenue / totalOrders) : 0
  const bestMonth    = chartData.reduce((a, b) => a.revenue > b.revenue ? a : b, { month: '—', revenue: 0 })

  // ── Excel export ──
  function exportExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Orders
    const orderRows = orders.map(o => ({
      'No. Order': o.id,
      'Klien': o.client,
      'Tanggal': o.date,
      'Status': o.status,
      'Total (Rp)': totalOrder(o.items),
      'Catatan': o.catatan || '',
      'Item': o.items.map(i => `${i.name} ${i.qty}${i.unit}`).join(', '),
    }))
    const ws1 = XLSX.utils.json_to_sheet(orderRows)
    ws1['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 24 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Laporan Order')

    // Sheet 2: Produk Terlaris
    const prodRows = topProducts.map((p, i) => ({
      'Rank': i + 1,
      'Nama Produk': p.name,
      'Terjual (kg)': p.sold,
      'Omzet (Rp)': p.revenue,
    }))
    const ws2 = XLSX.utils.json_to_sheet(prodRows)
    ws2['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris')

    // Sheet 3: Stok
    if (stock.length > 0) {
      const stockRows = stock.map(s => ({
        'Nama Produk': s.name,
        'Kategori': s.category,
        'Stok Saat Ini': s.qty,
        'Satuan': s.unit,
        'Stok Minimum': s.minQty,
        'Harga/Unit (Rp)': s.price,
        'Nilai Stok (Rp)': s.qty * s.price,
        'Lokasi': s.location,
      }))
      const ws3 = XLSX.utils.json_to_sheet(stockRows)
      ws3['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Stok Produk')
    }

    // Sheet 4: Klien
    if (clients.length > 0) {
      const clientRows = clients.map(c => ({
        'Nama Klien': c.name,
        'Tipe': c.type,
        'Kontak': c.contact,
        'No. HP': c.phone,
        'Alamat': c.address,
        'Total Order': c.totalOrders,
        'Total Belanja (Rp)': c.totalSpend,
        'Rating': c.rating,
        'Status': c.active ? 'Aktif' : 'Nonaktif',
      }))
      const ws4 = XLSX.utils.json_to_sheet(clientRows)
      ws4['!cols'] = Array(9).fill({ wch: 20 })
      XLSX.utils.book_append_sheet(wb, ws4, 'Data Klien')
    }

    // Sheet 5: Ringkasan Bulanan
    if (chartData.length > 0) {
      const summaryRows = chartData.map(d => ({
        'Bulan': d.key,
        'Total Order': d.orders,
        'Total Omzet (Rp)': d.revenue,
      }))
      const ws5 = XLSX.utils.json_to_sheet(summaryRows)
      ws5['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws5, 'Ringkasan Bulanan')
    }

    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `Laporan_NWJ_${date}.xlsx`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.015em' }}>
            Laporan &amp; Analitik
          </h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ringkasan performa bisnis dan data penjualan</p>
        </div>

        {/* Period Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'bulan ini', label: 'Bulan Ini' },
            { key: '3bulan',   label: '3 Bulan' },
            { key: '6bulan',   label: '6 Bulan' },
            { key: 'tahun ini', label: 'Tahun Ini' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              border: period === p.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: period === p.key ? '#2563eb' : 'white',
              color: period === p.key ? 'white' : '#64748b',
              transition: 'all 0.15s',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>Ekspor &amp; Bagikan</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Download laporan Excel atau kirim ringkasan via WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {waStatus.msg && (
            <span style={{ fontSize: 13, fontWeight: 500, color: waStatus.ok ? '#16a34a' : '#dc2626' }}>
              {waStatus.msg}
            </span>
          )}
          <button onClick={exportExcel} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', borderRadius: 10, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
          }}>
            <Download size={15} /> Export Excel
          </button>
          <button onClick={kirimWA} disabled={waStatus.loading} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: waStatus.loading ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white', borderRadius: 10, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: waStatus.loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 3px rgba(22,163,74,0.3)',
            opacity: waStatus.loading ? 0.7 : 1,
          }}>
            <Send size={15} /> {waStatus.loading ? 'Mengirim...' : 'Kirim WA'}
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Penjualan',   value: fmtShort(totalRevenue), sub: 'omzet keseluruhan', Icon: DollarSign,    iconColor: '#16a34a', iconBg: '#f0fdf4' },
          { label: 'Total Order',       value: totalOrders,            sub: 'semua transaksi',   Icon: ShoppingCart,  iconColor: '#2563eb', iconBg: '#eff6ff' },
          { label: 'Order Selesai',     value: selesaiCount,           sub: 'berhasil dikirim',  Icon: CheckCircle,   iconColor: '#7c3aed', iconBg: '#f5f3ff' },
          { label: 'Rata-rata Order',   value: fmtShort(avgOrder),     sub: 'per transaksi',     Icon: TrendingUp,    iconColor: '#d97706', iconBg: '#fffbeb' },
        ].map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{
            background: 'white',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: typeof value === 'string' && value.length > 10 ? 17 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Grafik Omzet Bulanan</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{chartData.length} bulan data tersedia</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#3b82f6' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>Omzet</span>
          </div>
        </div>
        {chartData.length > 0 ? (
          <BarChart data={chartData} />
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Belum ada data order untuk ditampilkan.
          </div>
        )}
      </div>

      {/* Top Products Table */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Produk Terlaris</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Berdasarkan total omzet dari semua order</p>
          </div>
          <span style={{ fontSize: 11.5, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '4px 10px', borderRadius: 8 }}>
            Top {topProducts.length}
          </span>
        </div>
        {topProducts.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Belum ada data produk terlaris.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['#', 'Produk', 'Terjual', 'Omzet', 'Proporsi'].map((h, i) => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: i >= 2 && i <= 3 ? 'right' : 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => {
                  const pct = totalRevenue ? Math.round((p.revenue / totalRevenue) * 100) : 0
                  return (
                    <tr key={p.name}
                      style={{ borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: 'white', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, width: 36 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: 12 }}>
                        {p.sold.toLocaleString('id')} kg
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {fmtShort(p.revenue)}
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, width: 32, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { status: 'selesai', label: 'Selesai',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { status: 'proses',  label: 'Diproses', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { status: 'pending', label: 'Pending',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { status: 'batal',   label: 'Dibatal',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        ].map(s => {
          const count = orders.filter(o => o.status === s.status).length
          const rev   = orders.filter(o => o.status === s.status).reduce((a, o) => a + totalOrder(o.items), 0)
          return (
            <div key={s.status} style={{
              background: 'white',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
            }}>
              <span style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
                marginBottom: 12,
              }}>
                {s.label}
              </span>
              <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {count}
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>order</p>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: s.color, margin: 0 }}>{fmtShort(rev)}</p>
            </div>
          )
        })}
      </div>

    </div>
  )
}
