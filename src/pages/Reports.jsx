import { useState, useEffect } from 'react'
import { TrendingUp, Send, Download, ShoppingCart, CheckCircle, DollarSign, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { generateDailyReport, sendToWhatsApp } from '../lib/whatsapp'

function itemsTotal(items) {
  return (items || []).reduce((a, i) => a + (i.qty || 0) * (i.price || 0), 0)
}
function docTotal(d) { return d.total || itemsTotal(d.items) }
function fmt(n) { return `Rp ${(n || 0).toLocaleString('id')}` }
function fmtShort(n) {
  const v = n || 0
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.0', '')}jt`
  return fmt(v)
}
function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const MO = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MO_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const PERIODS = [
  { key: 'hari-ini', label: 'Hari Ini' },
  { key: '1bulan',   label: '1 Bulan'  },
  { key: '3bulan',   label: '3 Bulan'  },
  { key: '6bulan',   label: '6 Bulan'  },
  { key: '1tahun',   label: '1 Tahun'  },
]

function monthLabel(ym) {
  const m = parseInt(ym.slice(5), 10) - 1
  return `${MO_FULL[m] || ym.slice(5)} ${ym.slice(0, 4)}`
}

function LineChart({ data, highlightMonth }) {
  const [hovered, setHovered] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        Belum ada data untuk ditampilkan.
      </div>
    )
  }

  const W = 900, H = 260
  const PAD = { top: 24, right: 24, bottom: 48, left: 70 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  const xOf = (i) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * iW : iW / 2)
  const yOf = (v) => PAD.top + iH - (v / maxRev) * iH
  const pts = data.map((_, i) => ({ x: xOf(i), y: yOf(data[i].revenue) }))

  function makeCurve(ps) {
    if (ps.length === 0) return ''
    if (ps.length === 1) return `M ${ps[0].x} ${ps[0].y}`
    let s = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length - 1; i++) {
      const a = ps[i - 1] || ps[i]
      const b = ps[i], c = ps[i + 1], e = ps[i + 2] || c
      const cx1 = (b.x + (c.x - a.x) / 6).toFixed(1)
      const cy1 = (b.y + (c.y - a.y) / 6).toFixed(1)
      const cx2 = (c.x - (e.x - b.x) / 6).toFixed(1)
      const cy2 = (c.y - (e.y - b.y) / 6).toFixed(1)
      s += ` C ${cx1} ${cy1},${cx2} ${cy2},${c.x.toFixed(1)} ${c.y.toFixed(1)}`
    }
    return s
  }

  const linePath = makeCurve(pts)
  const bY = PAD.top + iH
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${bY} L ${pts[0].x.toFixed(1)} ${bY} Z`
    : ''
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxRev * t, y: yOf(maxRev * t) }))
  const showEvery = data.length > 16 ? Math.ceil(data.length / 12) : 1
  const stepX = pts.length > 1 ? pts[1].x - pts[0].x : iW

  let tt = null
  if (hovered !== null) {
    const p = pts[hovered], d = data[hovered]
    const bw = 118, bh = 56
    let bx = Math.min(Math.max(p.x - bw / 2, PAD.left), W - PAD.right - bw)
    let by = p.y - bh - 14
    if (by < 4) by = p.y + 14
    tt = { bx, by, bw, bh, p, lbl: `${MO[parseInt(d.key.slice(5),10)-1]} '${d.key.slice(2,4)}`, d }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        const sx = ((e.clientX - r.left) / r.width) * W
        let ci = null, cd = Infinity
        pts.forEach((p, i) => { const dist = Math.abs(p.x - sx); if (dist < cd) { cd = dist; ci = i } })
        setHovered(cd < stepX * 0.65 ? ci : null)
      }}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="rpt-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={PAD.left+iW} y2={t.y}
            stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth={i === 0 ? 1.5 : 1} />
          <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="#b0b8c8"
            fontFamily="system-ui,-apple-system,sans-serif">
            {i === 0 ? '0' : fmtShort(t.v)}
          </text>
        </g>
      ))}

      {hovered !== null && (
        <line x1={pts[hovered].x} y1={PAD.top} x2={pts[hovered].x} y2={bY}
          stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
      )}

      {areaPath && <path d={areaPath} fill="url(#rpt-area)" />}
      {pts.length > 1 && (
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {pts.map((p, i) => {
        const isHL = highlightMonth && data[i].key === highlightMonth
        const isHov = hovered === i
        if (!isHL && !isHov && data.length > 24) return null
        return (
          <circle key={i} cx={p.x} cy={p.y}
            r={isHL ? 6.5 : isHov ? 5 : 3.5}
            fill={isHL ? '#f59e0b' : '#2563eb'}
            stroke="white" strokeWidth="2" />
        )
      })}

      {data.map((d, i) => {
        if (i % showEvery !== 0 && i !== data.length - 1) return null
        const isHL = highlightMonth && d.key === highlightMonth
        return (
          <text key={i} x={pts[i].x} y={bY + 18} textAnchor="middle" fontSize="10"
            fontFamily="system-ui,-apple-system,sans-serif"
            fill={isHL ? '#2563eb' : '#b0b8c8'}
            fontWeight={isHL ? '700' : '400'}>
            {`${MO[parseInt(d.key.slice(5),10)-1]} '${d.key.slice(2,4)}`}
          </text>
        )
      })}

      {tt && (
        <g>
          <rect x={tt.bx} y={tt.by} width={tt.bw} height={tt.bh} rx="7" fill="#0f172a" opacity="0.93" />
          <text x={tt.bx+tt.bw/2} y={tt.by+16} textAnchor="middle" fontSize="10.5" fill="#7c8fa8"
            fontFamily="system-ui,-apple-system,sans-serif">{tt.lbl}</text>
          <text x={tt.bx+tt.bw/2} y={tt.by+34} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="white"
            fontFamily="system-ui,-apple-system,sans-serif">{fmtShort(tt.d.revenue)}</text>
          <text x={tt.bx+tt.bw/2} y={tt.by+50} textAnchor="middle" fontSize="10.5" fill="#4a5568"
            fontFamily="system-ui,-apple-system,sans-serif">{tt.d.orders} SO</text>
        </g>
      )}
    </svg>
  )
}

export default function Reports() {
  const [docs, setDocs]         = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('6bulan')
  const [searchMonth, setSearchMonth] = useState(null)
  const [waStatus, setWaStatus] = useState({ loading: false, msg: '', ok: null })

  useEffect(() => {
    Promise.all([
      supabase.from('documents').select('*').eq('type', 'SO').order('date', { ascending: false }),
      supabase.from('products').select('*').order('kategori'),
      supabase.from('clients').select('*').order('name'),
    ]).then(([{ data: d }, { data: p }, { data: c }]) => {
      setDocs(d || [])
      setProducts(p || [])
      setClients(c || [])
      setLoading(false)
    })
  }, [])

  const now = new Date()

  const periodDocs = docs.filter(d => {
    if (!d.date) return false
    if (period === 'hari-ini') return d.date === localDate(now)
    const cut = new Date(now)
    if (period === '1bulan') { cut.setMonth(cut.getMonth() - 1);         return d.date >= localDate(cut) }
    if (period === '3bulan') { cut.setMonth(cut.getMonth() - 3);         return d.date >= localDate(cut) }
    if (period === '6bulan') { cut.setMonth(cut.getMonth() - 6);         return d.date >= localDate(cut) }
    if (period === '1tahun') { cut.setFullYear(cut.getFullYear() - 1);   return d.date >= localDate(cut) }
    return true
  })

  const filteredDocs = searchMonth
    ? docs.filter(d => d.date && d.date.startsWith(searchMonth) && d.status !== 'cancelled')
    : periodDocs.filter(d => d.status !== 'cancelled')

  const totalRevenue   = filteredDocs.reduce((a, d) => a + docTotal(d), 0)
  const totalOrders    = filteredDocs.length
  const deliveredCount = filteredDocs.filter(d => d.status === 'delivered').length
  const avgOrder       = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const monthlyMap = {}
  docs.filter(d => d.status !== 'cancelled').forEach(d => {
    const m = (d.date || '').slice(0, 7)
    if (!m || m.length < 7) return
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0 }
    monthlyMap[m].revenue += docTotal(d)
    monthlyMap[m].orders  += 1
  })
  const chartData  = Object.keys(monthlyMap).sort().map(m => ({
    month: MO[parseInt(m.slice(5), 10) - 1] || m.slice(5),
    revenue: monthlyMap[m].revenue,
    orders:  monthlyMap[m].orders,
    key: m,
  }))
  const allMonths = Object.keys(monthlyMap).sort().reverse()

  const productMap = {}
  filteredDocs.forEach(d => {
    (d.items || []).forEach(item => {
      const name = item.name || '?'
      if (!productMap[name]) productMap[name] = { sold: 0, revenue: 0 }
      productMap[name].sold    += item.qty || 0
      productMap[name].revenue += (item.qty || 0) * (item.price || 0)
    })
  })
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  async function kirimWA() {
    const cfg = JSON.parse(localStorage.getItem('nwj_wa_config') || '{}')
    if (!cfg.token || !cfg.target) {
      setWaStatus({ loading: false, msg: 'Isi token & nomor WA di Pengaturan dulu', ok: false })
      setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 4000)
      return
    }
    setWaStatus({ loading: true, msg: 'Mengirim...', ok: null })
    try {
      const ordersWA = docs.map(d => ({
        id: d.number, client: d.client_name, date: d.date, catatan: d.notes || '',
        status: d.status === 'delivered' ? 'selesai' : d.status === 'dispatched' ? 'proses' : d.status === 'cancelled' ? 'batal' : 'pending',
        items: d.items || [],
      }))
      const stockWA = products.map(p => ({ name: p.nama, qty: p.qty || 0, minQty: p.min_qty || 0, unit: p.satuan || 'kg' }))
      const message = generateDailyReport(ordersWA, stockWA, [])
      await sendToWhatsApp({ token: cfg.token, target: cfg.target, message })
      setWaStatus({ loading: false, msg: 'Berhasil terkirim!', ok: true })
    } catch (err) {
      setWaStatus({ loading: false, msg: err.message, ok: false })
    }
    setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 5000)
  }

  function exportExcel() {
    const wb   = XLSX.utils.book_new()
    const date = localDate(new Date())

    const ws1 = XLSX.utils.json_to_sheet(docs.map(d => ({
      'No. SO':     d.number, 'Klien': d.client_name, 'Tanggal': d.date,
      'Status':     d.status, 'Total (Rp)': docTotal(d), 'Catatan': d.notes || '',
      'Item':       (d.items || []).map(i => `${i.name} ${i.qty}${i.unit || ''}`).join(', '),
    })))
    ws1['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 13 }, { wch: 15 }, { wch: 24 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Laporan SO')

    if (topProducts.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(topProducts.map((p, i) => ({
        'Rank': i + 1, 'Nama Produk': p.name, 'Terjual': p.sold, 'Omzet (Rp)': p.revenue,
      })))
      ws2['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris')
    }
    if (products.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(products.map(p => ({
        'Nama Produk': p.nama, 'Kategori': p.kategori, 'Stok Saat Ini': p.qty || 0,
        'Satuan': p.satuan || 'kg', 'Stok Minimum': p.min_qty || 0,
        'Harga Jual (Rp)': p.harga_jual || 0, 'Nilai Stok (Rp)': (p.qty || 0) * (p.harga_jual || 0),
        'Lokasi': p.location || '',
      })))
      ws3['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Stok Produk')
    }
    if (clients.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(clients.map(c => ({
        'Nama Klien': c.name, 'Tipe': c.type, 'Kontak': c.contact, 'No. HP': c.phone,
        'Alamat': c.address, 'Total Order': c.total_orders || 0,
        'Total Belanja (Rp)': c.total_spend || 0, 'Rating': c.rating,
        'Status': c.active ? 'Aktif' : 'Nonaktif',
      })))
      ws4['!cols'] = Array(9).fill({ wch: 20 })
      XLSX.utils.book_append_sheet(wb, ws4, 'Data Klien')
    }
    if (chartData.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(chartData.map(d => ({
        'Bulan': d.key, 'Total SO': d.orders, 'Total Omzet (Rp)': d.revenue,
      })))
      ws5['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws5, 'Ringkasan Bulanan')
    }
    XLSX.writeFile(wb, `Laporan_NWJ_${date}.xlsx`)
  }

  const activeLabel = searchMonth
    ? monthLabel(searchMonth)
    : PERIODS.find(p => p.key === period)?.label || period

  const STATUS_ROWS = [
    { status: 'delivered',  label: 'Terkirim',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { status: 'dispatched', label: 'Dikirim',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { status: 'confirmed',  label: 'Dikonfirmasi', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { status: 'cancelled',  label: 'Dibatal',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header + Period Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.015em' }}>Laporan &amp; Analitik</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ringkasan performa bisnis berdasarkan data aktual</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => {
            const active = !searchMonth && period === p.key
            return (
              <button key={p.key} onClick={() => { setPeriod(p.key); setSearchMonth(null) }} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: active ? '#2563eb' : 'white',
                color: active ? 'white' : '#64748b',
              }}>{p.label}</button>
            )
          })}
        </div>
      </div>

      {/* Export + WA */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>Ekspor &amp; Bagikan</p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Download laporan Excel atau kirim ringkasan via WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {waStatus.msg && (
            <span style={{ fontSize: 13, fontWeight: 500, color: waStatus.ok ? '#16a34a' : '#dc2626' }}>{waStatus.msg}</span>
          )}
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}>
            <Download size={15} /> Export Excel
          </button>
          <button onClick={kirimWA} disabled={waStatus.loading} style={{ display: 'flex', alignItems: 'center', gap: 7, background: waStatus.loading ? '#86efac' : 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: waStatus.loading ? 'not-allowed' : 'pointer', boxShadow: '0 1px 3px rgba(22,163,74,0.3)', opacity: waStatus.loading ? 0.7 : 1 }}>
            <Send size={15} /> {waStatus.loading ? 'Mengirim...' : 'Kirim WA'}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>Memuat data laporan...</div>
      )}

      {!loading && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Penjualan', value: fmtShort(totalRevenue), sub: `omzet ${activeLabel}`, Icon: DollarSign,   iconColor: '#16a34a', iconBg: '#f0fdf4' },
              { label: 'Total SO',        value: totalOrders,            sub: 'semua transaksi',       Icon: ShoppingCart, iconColor: '#2563eb', iconBg: '#eff6ff' },
              { label: 'SO Terkirim',     value: deliveredCount,         sub: 'berhasil dikirim',      Icon: CheckCircle,  iconColor: '#7c3aed', iconBg: '#f5f3ff' },
              { label: 'Rata-rata SO',    value: fmtShort(avgOrder),     sub: 'per transaksi',         Icon: TrendingUp,   iconColor: '#d97706', iconBg: '#fffbeb' },
            ].map(({ label, value, sub, Icon, iconColor, iconBg }) => (
              <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{label}</p>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={iconColor} strokeWidth={2} />
                  </div>
                </div>
                <p style={{ fontSize: typeof value === 'string' && value.length > 10 ? 17 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Line Chart */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Grafik Omzet Bulanan</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  {chartData.length} bulan data
                  {searchMonth ? ` — sorot: ${monthLabel(searchMonth)}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 3, borderRadius: 2, background: '#2563eb' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>Omzet</span>
                </div>
                {searchMonth && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid white', boxShadow: '0 0 0 1.5px #f59e0b' }} />
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                      {MO[parseInt(searchMonth.slice(5),10)-1]} {searchMonth.slice(0,4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <LineChart data={chartData} highlightMonth={searchMonth} />
          </div>

          {/* Month Search */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>Cari Omzet per Bulan</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Pilih bulan untuk melihat rincian omzet — grafik akan menyorot bulan tersebut</p>
              </div>
              {searchMonth && (
                <button onClick={() => setSearchMonth(null)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: 500, border: '1px solid #fecdd3', background: '#fff1f2',
                  color: '#e11d48', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  <X size={12} /> Hapus Filter
                </button>
              )}
            </div>

            {searchMonth && (
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Omzet — {monthLabel(searchMonth)}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{fmtShort(totalRevenue)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#475569', margin: '0 0 2px', fontWeight: 500 }}>{totalOrders} SO</p>
                  <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>{deliveredCount} terkirim</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allMonths.map(m => {
                const isSel = searchMonth === m
                const mIdx  = parseInt(m.slice(5), 10) - 1
                return (
                  <button key={m} onClick={() => setSearchMonth(isSel ? null : m)} style={{
                    padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: isSel ? 600 : 400, cursor: 'pointer',
                    border: isSel ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSel ? '#2563eb' : '#f8fafc',
                    color: isSel ? 'white' : '#64748b',
                  }}>
                    {MO[mIdx]} {m.slice(0, 4)}
                    <span style={{ marginLeft: 7, fontSize: 11, opacity: 0.8 }}>
                      {fmtShort(monthlyMap[m]?.revenue || 0)}
                    </span>
                  </button>
                )
              })}
              {allMonths.length === 0 && (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Belum ada data bulan tersedia.</p>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Produk Terlaris</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  Periode {activeLabel} — berdasarkan omzet SO aktif
                </p>
              </div>
              <span style={{ fontSize: 11.5, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '4px 10px', borderRadius: 8 }}>Top {topProducts.length}</span>
            </div>
            {topProducts.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada data produk terlaris.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      {['#', 'Produk', 'Terjual', 'Omzet', 'Proporsi'].map((h, i) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: i >= 2 && i <= 3 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => {
                      const pct = totalRevenue ? Math.round((p.revenue / totalRevenue) * 100) : 0
                      return (
                        <tr key={p.name} style={{ borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: 'white' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, width: 36 }}>{i + 1}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: 12 }}>{p.sold.toLocaleString('id')} kg</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtShort(p.revenue)}</td>
                          <td style={{ padding: '12px 16px', minWidth: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#2563eb)', borderRadius: 99 }} />
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
            {STATUS_ROWS.map(s => {
              const count = docs.filter(d => d.status === s.status).length
              const rev   = docs.filter(d => d.status === s.status).reduce((a, d) => a + docTotal(d), 0)
              return (
                <div key={s.status} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, marginBottom: 12 }}>
                    {s.label}
                  </span>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em' }}>{count}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 2px' }}>order</p>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: s.color, margin: 0 }}>{fmtShort(rev)}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
