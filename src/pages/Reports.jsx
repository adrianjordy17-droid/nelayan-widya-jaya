import { useState } from 'react'
import { TrendingUp, BarChart3, FileSpreadsheet, MessageSquare, Send } from 'lucide-react'
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
    <div className="flex items-end gap-3 h-52 px-4">
      {data.map((d, i) => {
        const h = Math.max((d.revenue / maxRev) * 180, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full">
              <div className="text-[10px] text-slate-400 text-center mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                {fmtShort(d.revenue)}
              </div>
              <div className="w-full rounded-t-lg transition-all cursor-pointer"
                style={{ height: h, background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' }} />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">{d.month}</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { key: 'bulan ini', label: 'Bulan Ini' },
            { key: '3bulan',   label: '3 Bulan' },
            { key: '6bulan',   label: '6 Bulan' },
            { key: 'tahun ini', label: 'Tahun Ini' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border
                ${period === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {waStatus.msg && (
            <span className={`text-sm font-medium ${waStatus.ok ? 'text-green-600' : 'text-red-500'}`}>
              {waStatus.ok ? '✅' : '❌'} {waStatus.msg}
            </span>
          )}
          <button onClick={kirimWA} disabled={waStatus.loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
            <Send size={15} /> Kirim WA
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Omzet',    value: fmtShort(totalRevenue), icon: TrendingUp,  color: '#f0fdf4', ic: '#16a34a' },
          { label: 'Total Order',    value: totalOrders,             icon: BarChart3,   color: '#eff6ff', ic: '#2563eb' },
          { label: 'Rata-rata/Order', value: fmtShort(avgOrder),    icon: TrendingUp,  color: '#fefce8', ic: '#ca8a04' },
          { label: 'Bulan Terbaik',  value: bestMonth.month,         icon: BarChart3,   color: '#f5f3ff', ic: '#7c3aed' },
        ].map(({ label, value, icon: Icon, color, ic }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color }}>
              <Icon size={18} style={{ color: ic }} />
            </div>
            <p className="text-slate-400 text-xs">{label}</p>
            <p className="font-bold text-slate-800 text-lg mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">Grafik Omzet Bulanan</h3>
          <p className="text-xs text-slate-400">{chartData.length} bulan data tersedia</p>
        </div>
        {chartData.length > 0 ? (
          <BarChart data={chartData} />
        ) : (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
            Belum ada data order untuk ditampilkan.
          </div>
        )}
      </div>

      {/* Top products */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Produk Terlaris</h3>
          <span className="text-xs text-slate-400">dari data order yang ada</span>
        </div>
        {topProducts.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Belum ada data produk terlaris.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold tracking-wide">#</th>
                  <th className="px-6 py-3 text-left font-semibold tracking-wide">Produk</th>
                  <th className="px-6 py-3 text-right font-semibold tracking-wide">Terjual</th>
                  <th className="px-6 py-3 text-right font-semibold tracking-wide">Omzet</th>
                  <th className="px-6 py-3 text-left font-semibold tracking-wide">Proporsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.map((p, i) => {
                  const pct = totalRevenue ? Math.round((p.revenue / totalRevenue) * 100) : 0
                  return (
                    <tr key={p.name} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-3.5 text-slate-400 font-semibold">{i + 1}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{p.name}</td>
                      <td className="px-6 py-3.5 text-right text-slate-500">{p.sold.toLocaleString('id')} kg</td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">{fmtShort(p.revenue)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8">{pct}%</span>
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

      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { status: 'selesai', label: 'Selesai', color: '#16a34a', bg: '#f0fdf4' },
          { status: 'proses',  label: 'Diproses', color: '#2563eb', bg: '#eff6ff' },
          { status: 'pending', label: 'Pending',  color: '#ca8a04', bg: '#fefce8' },
          { status: 'batal',   label: 'Dibatal',  color: '#dc2626', bg: '#fff1f2' },
        ].map(s => {
          const count = orders.filter(o => o.status === s.status).length
          const rev   = orders.filter(o => o.status === s.status).reduce((a, o) => a + totalOrder(o.items), 0)
          return (
            <div key={s.status} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="w-2 h-2 rounded-full mb-2" style={{ background: s.color }} />
              <p className="text-slate-400 text-xs">{s.label}</p>
              <p className="font-bold text-slate-800 text-xl mt-0.5">{count} order</p>
              <p className="text-xs mt-0.5" style={{ color: s.color }}>{fmtShort(rev)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
