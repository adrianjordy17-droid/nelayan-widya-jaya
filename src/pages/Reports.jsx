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
  if (v >= 1_000_000_000) return `Rp ${(v/1_000_000_000).toFixed(1).replace('.0','')}M`
  if (v >= 1_000_000)     return `Rp ${(v/1_000_000).toFixed(1).replace('.0','')}jt`
  if (v >= 1_000)         return `Rp ${Math.round(v/1_000)}rb`
  return fmt(v)
}
function localDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localYM(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function calMonthStart(now, monthsBack) {
  return localDate(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1))
}

const FF = "'SF Pro Display',-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif"
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
  return `${MO_FULL[parseInt(ym.slice(5),10)-1] || ym.slice(5)} ${ym.slice(0,4)}`
}

function LineChart({ data, highlightMonth }) {
  const [hovered, setHovered] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeaeb2', fontSize: 13, fontFamily: FF }}>
        Belum ada data untuk ditampilkan.
      </div>
    )
  }

  const W = 900, H = 220
  const PAD = { top: 14, right: 12, bottom: 40, left: 12 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  const xOf = i => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * iW : iW / 2)
  const yOf = v => PAD.top + iH - (v / maxRev) * iH
  const pts = data.map((_, i) => ({ x: xOf(i), y: yOf(data[i].revenue) }))

  function curve(ps) {
    if (ps.length === 0) return ''
    if (ps.length === 1) return `M ${ps[0].x} ${ps[0].y}`
    let s = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length - 1; i++) {
      const a = ps[i-1]||ps[i], b = ps[i], c = ps[i+1], e = ps[i+2]||c
      s += ` C ${(b.x+(c.x-a.x)/6).toFixed(1)} ${(b.y+(c.y-a.y)/6).toFixed(1)},${(c.x-(e.x-b.x)/6).toFixed(1)} ${(c.y-(e.y-b.y)/6).toFixed(1)},${c.x.toFixed(1)} ${c.y.toFixed(1)}`
    }
    return s
  }

  const linePath = curve(pts)
  const bY = PAD.top + iH
  const areaPath = pts.length > 1 ? `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${bY} L ${pts[0].x.toFixed(1)} ${bY} Z` : ''
  const showEvery = data.length > 16 ? Math.ceil(data.length / 12) : 1
  const stepX = pts.length > 1 ? pts[1].x - pts[0].x : iW

  let tt = null
  if (hovered !== null) {
    const p = pts[hovered], d = data[hovered]
    const bw = 130, bh = 60
    const bx = Math.min(Math.max(p.x - bw/2, 0), W - bw)
    const by = p.y - bh - 14 < 0 ? p.y + 14 : p.y - bh - 14
    tt = { bx, by, bw, bh, p, lbl: `${MO[parseInt(d.key.slice(5),10)-1]} ${d.key.slice(0,4)}`, d }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        const sx = ((e.clientX - r.left) / r.width) * W
        let ci = null, cd = Infinity
        pts.forEach((p, i) => { const d = Math.abs(p.x - sx); if (d < cd) { cd = d; ci = i } })
        setHovered(cd < stepX * 0.7 ? ci : null)
      }}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="rpt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0071e3" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
        </linearGradient>
        <filter id="tt-sh" x="-25%" y="-50%" width="150%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="rgba(0,0,0,0.10)" />
        </filter>
      </defs>

      <line x1={PAD.left} y1={bY} x2={PAD.left+iW} y2={bY} stroke="#e8e8ed" strokeWidth="1" />

      {hovered !== null && (
        <line x1={pts[hovered].x} y1={PAD.top} x2={pts[hovered].x} y2={bY}
          stroke="#0071e3" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.45" />
      )}

      {areaPath && <path d={areaPath} fill="url(#rpt-fill)" />}
      {pts.length > 1 && (
        <path d={linePath} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {pts.map((p, i) => {
        const isHL = highlightMonth && data[i].key === highlightMonth
        const isHov = hovered === i
        if (!isHL && !isHov && data.length > 20) return null
        return (
          <circle key={i} cx={p.x} cy={p.y}
            r={isHL ? 7 : isHov ? 5.5 : 4}
            fill={isHL ? '#ff9f0a' : 'white'}
            stroke={isHL ? '#ff9f0a' : '#0071e3'}
            strokeWidth={isHL ? 0 : 2.5} />
        )
      })}

      {data.map((d, i) => {
        if (i % showEvery !== 0 && i !== data.length - 1) return null
        const isHL = highlightMonth && d.key === highlightMonth
        return (
          <text key={i} x={pts[i].x} y={bY + 18} textAnchor="middle" fontSize="11"
            fontFamily={FF} fill={isHL ? '#0071e3' : '#aeaeb2'} fontWeight={isHL ? '600' : '400'}>
            {`${MO[parseInt(d.key.slice(5),10)-1]} '${d.key.slice(2,4)}`}
          </text>
        )
      })}

      {tt && (
        <g>
          <rect x={tt.bx} y={tt.by} width={tt.bw} height={tt.bh} rx="12" ry="12" fill="white" filter="url(#tt-sh)" />
          <text x={tt.bx+tt.bw/2} y={tt.by+18} textAnchor="middle" fontSize="11" fill="#6e6e73" fontFamily={FF}>{tt.lbl}</text>
          <text x={tt.bx+tt.bw/2} y={tt.by+38} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d1d1f" fontFamily={FF}>{fmtShort(tt.d.revenue)}</text>
          <text x={tt.bx+tt.bw/2} y={tt.by+53} textAnchor="middle" fontSize="11" fill="#aeaeb2" fontFamily={FF}>{tt.d.orders} dok</text>
        </g>
      )}
    </svg>
  )
}

const STATUS_ROWS = [
  { status: 'delivered',  label: 'Terkirim',    color: '#1a7a2e', bg: 'rgba(52,199,89,0.1)'   },
  { status: 'dispatched', label: 'Dikirim',      color: '#0055d4', bg: 'rgba(0,113,227,0.08)'  },
  { status: 'confirmed',  label: 'Dikonfirmasi', color: '#975400', bg: 'rgba(255,159,10,0.1)'  },
  { status: 'cancelled',  label: 'Dibatal',      color: '#c0392b', bg: 'rgba(255,59,48,0.08)'  },
]

export default function Reports() {
  const [docs, setDocs]         = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients]   = useState([])
  const [deliveryReports, setDeliveryReports] = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('1bulan')
  const [searchMonth, setSearchMonth] = useState(null)
  const [waStatus, setWaStatus] = useState({ loading: false, msg: '', ok: null })

  useEffect(() => {
    Promise.all([
      supabase.from('documents').select('*').in('type', ['SO', 'DO', 'GR']).order('date', { ascending: false }),
      supabase.from('products').select('*').order('kategori'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('delivery_reports').select('*'),
    ]).then(([{ data: d }, { data: p }, { data: c }, { data: dr }]) => {
      setDocs(d || [])
      setProducts(p || [])
      setClients(c || [])
      setDeliveryReports(dr || [])
      setLoading(false)
    })
  }, [])

  const now    = new Date()
  const thisYM = localYM(now)
  const thisYr = String(now.getFullYear())

  // Calendar-based (not rolling): 1 Bulan = bulan ini, 3 Bulan = 3 bulan kalender, dst
  const periodDocs = docs.filter(d => {
    if (!d.date) return false
    if (period === 'hari-ini') return d.date === localDate(now)
    if (period === '1bulan')   return d.date.startsWith(thisYM)
    if (period === '3bulan')   return d.date >= calMonthStart(now, 2)
    if (period === '6bulan')   return d.date >= calMonthStart(now, 5)
    if (period === '1tahun')   return d.date.startsWith(thisYr)
    return true
  })

  const filteredDocs = searchMonth
    ? docs.filter(d => d.date && d.date.startsWith(searchMonth) && d.status !== 'cancelled')
    : periodDocs.filter(d => d.status !== 'cancelled')

  // ---- Omset akumulasi sesuai DO: berat TERIMA × harga per kg per DO ----
  // Harga per kg tiap DO diambil dari nilai SO sumbernya (DO.ref_number =
  // nomor SO), fallback ke harga_jual produk kalau SO tak punya nilai.
  const productPrice = {}
  products.forEach(p => { productPrice[(p.nama || '').toLowerCase()] = p.harga_jual || 0 })
  const soByNumber = {}
  docs.forEach(d => { if (d.type === 'SO') soByNumber[d.number] = d })

  const pricePerKgByDoId = {}
  docs.forEach(d => {
    if (d.type !== 'DO') return
    const orderedKg = (d.items || []).reduce((s, it) => s + (parseFloat(it.qty) || 0), 0)
    if (orderedKg <= 0) { pricePerKgByDoId[d.id] = 0; return }
    // Priority: DO's own value (direct DO with edited prices) -> source SO
    // -> product master price by item name.
    const so = soByNumber[d.ref_number]
    let orderedValue = d.total || itemsTotal(d.items)
    if (!orderedValue && so) orderedValue = so.total || itemsTotal(so.items)
    if (!orderedValue) {
      orderedValue = (d.items || []).reduce((s, it) =>
        s + (parseFloat(it.qty) || 0) * (productPrice[(it.name || '').toLowerCase()] || 0), 0)
    }
    pricePerKgByDoId[d.id] = orderedValue / orderedKg
  })

  const inPeriod = (ds) => {
    if (!ds) return false
    if (searchMonth) return ds.startsWith(searchMonth)
    if (period === 'hari-ini') return ds === localDate(now)
    if (period === '1bulan')   return ds.startsWith(thisYM)
    if (period === '3bulan')   return ds >= calMonthStart(now, 2)
    if (period === '6bulan')   return ds >= calMonthStart(now, 5)
    if (period === '1tahun')   return ds.startsWith(thisYr)
    return true
  }

  // Tiap laporan pengiriman yang sudah punya berat terima = omset terealisasi
  const omsetOf = (r) => (parseFloat(r.weight_received) || 0) * (pricePerKgByDoId[r.do_id] || 0)
  const receivedReports = deliveryReports.filter(r => r.weight_received != null && r.do_id)
  const periodReceived  = receivedReports.filter(r => inPeriod(r.delivery_date))

  const revDocs        = filteredDocs.filter(d => d.status === 'confirmed' || d.status === 'delivered')
  const totalRevenue   = periodReceived.reduce((a, r) => a + omsetOf(r), 0)
  const totalOrders    = filteredDocs.length
  const deliveredCount = filteredDocs.filter(d => d.status === 'delivered').length
  const deliveredDoIds = new Set(periodReceived.map(r => r.do_id))
  const avgOrder       = deliveredDoIds.size > 0 ? Math.round(totalRevenue / deliveredDoIds.size) : 0

  // Chart: omzet per bulan dari berat terima (tanggal kirim); jumlah dok dari documents
  const monthlyMap = {}
  docs.forEach(d => {
    if (d.status === 'cancelled') return
    const m = (d.date || '').slice(0, 7)
    if (!m || m.length < 7) return
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0 }
    monthlyMap[m].orders += 1
  })
  receivedReports.forEach(r => {
    const m = (r.delivery_date || '').slice(0, 7)
    if (!m || m.length < 7) return
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0 }
    monthlyMap[m].revenue += omsetOf(r)
  })
  const chartData = Object.keys(monthlyMap).sort().map(m => ({
    month: MO[parseInt(m.slice(5),10)-1] || m.slice(5),
    revenue: monthlyMap[m].revenue,
    orders:  monthlyMap[m].orders,
    key: m,
  }))
  const allMonths = Object.keys(monthlyMap).sort().reverse()

  const productMap = {}
  revDocs.forEach(d => {
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
      const ordersWA = docs.filter(d => d.type === 'SO').map(d => ({
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
    const wb     = XLSX.utils.book_new()
    const date   = localDate(new Date())
    const soDocs = docs.filter(d => d.type === 'SO')
    const ws1    = XLSX.utils.json_to_sheet(soDocs.map(d => ({
      'No. SO': d.number, 'Klien': d.client_name, 'Tanggal': d.date,
      'Status': d.status, 'Total (Rp)': docTotal(d), 'Catatan': d.notes || '',
      'Item': (d.items || []).map(i => `${i.name} ${i.qty}${i.unit||''}`).join(', '),
    })))
    ws1['!cols'] = [{ wch:14 },{ wch:28 },{ wch:12 },{ wch:13 },{ wch:15 },{ wch:24 },{ wch:40 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Laporan SO')
    if (topProducts.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(topProducts.map((p,i) => ({ 'Rank':i+1,'Nama Produk':p.name,'Terjual':p.sold,'Omzet (Rp)':p.revenue })))
      ws2['!cols'] = [{ wch:6 },{ wch:24 },{ wch:12 },{ wch:18 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris')
    }
    if (products.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(products.map(p => ({
        'Nama Produk':p.nama,'Kategori':p.kategori,'Stok Saat Ini':p.qty||0,
        'Satuan':p.satuan||'kg','Stok Minimum':p.min_qty||0,
        'Harga Jual (Rp)':p.harga_jual||0,'Nilai Stok (Rp)':(p.qty||0)*(p.harga_jual||0),'Lokasi':p.location||'',
      })))
      ws3['!cols'] = [{ wch:20 },{ wch:16 },{ wch:14 },{ wch:8 },{ wch:14 },{ wch:16 },{ wch:16 },{ wch:14 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Stok Produk')
    }
    if (clients.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(clients.map(c => ({
        'Nama Klien':c.name,'Tipe':c.type,'Kontak':c.contact,'No. HP':c.phone,
        'Alamat':c.address,'Total Order':c.total_orders||0,'Total Belanja (Rp)':c.total_spend||0,
        'Rating':c.rating,'Status':c.active?'Aktif':'Nonaktif',
      })))
      ws4['!cols'] = Array(9).fill({ wch:20 })
      XLSX.utils.book_append_sheet(wb, ws4, 'Data Klien')
    }
    if (chartData.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(chartData.map(d => ({ 'Bulan':d.key,'Total SO':d.orders,'Total Omzet (Rp)':d.revenue })))
      ws5['!cols'] = [{ wch:12 },{ wch:14 },{ wch:20 }]
      XLSX.utils.book_append_sheet(wb, ws5, 'Ringkasan Bulanan')
    }
    XLSX.writeFile(wb, `Laporan_NWJ_${date}.xlsx`)
  }

  const activeLabel = searchMonth
    ? monthLabel(searchMonth)
    : PERIODS.find(p => p.key === period)?.label || period

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FF }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', margin: '0 0 2px', letterSpacing: '-0.3px', fontFamily: FF }}>
            Laporan &amp; Analitik
          </h2>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, fontFamily: FF }}>
            Performa penjualan berdasarkan data aktual
          </p>
        </div>

        {/* iOS Segmented Control */}
        <div style={{ background: 'rgba(116,116,128,0.12)', borderRadius: 10, padding: 2, display: 'inline-flex', gap: 0 }}>
          {PERIODS.map(p => {
            const active = !searchMonth && period === p.key
            return (
              <button key={p.key} onClick={() => { setPeriod(p.key); setSearchMonth(null) }} style={{
                padding: '7px 15px', borderRadius: 8, cursor: 'pointer', border: 'none',
                background: active ? 'white' : 'transparent',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.05)' : 'none',
                color: active ? '#1d1d1f' : '#6e6e73',
                fontWeight: active ? 600 : 400,
                fontSize: 13, fontFamily: FF, whiteSpace: 'nowrap',
              }}>{p.label}</button>
            )
          })}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 16, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', margin: '0 0 1px', fontFamily: FF }}>Ekspor &amp; Bagikan</p>
          <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0, fontFamily: FF }}>Excel atau WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {waStatus.msg && (
            <span style={{ fontSize: 13, fontWeight: 500, color: waStatus.ok ? '#1a7a2e' : '#c0392b', fontFamily: FF }}>{waStatus.msg}</span>
          )}
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0071e3', color: 'white', borderRadius: 980, padding: '9px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: FF }}>
            <Download size={14} /> Export Excel
          </button>
          <button onClick={kirimWA} disabled={waStatus.loading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: waStatus.loading ? '#86efac' : '#34c759', color: 'white', borderRadius: 980, padding: '9px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: waStatus.loading ? 'not-allowed' : 'pointer', fontFamily: FF, opacity: waStatus.loading ? 0.75 : 1 }}>
            <Send size={14} /> {waStatus.loading ? 'Mengirim...' : 'Kirim WA'}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#aeaeb2', fontSize: 13, fontFamily: FF }}>Memuat data...</div>
      )}

      {!loading && (
        <>
          {/* Stat Cards */}
          <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'Total Penjualan', value: fmtShort(totalRevenue), sub: `omzet ${activeLabel}`, Icon: DollarSign,   ic: '#1a7a2e', ib: 'rgba(52,199,89,0.1)'  },
              { label: 'Total Dokumen',    value: totalOrders,            sub: 'SO + DO + GR',          Icon: ShoppingCart, ic: '#0055d4', ib: 'rgba(0,113,227,0.08)' },
              { label: 'Terkirim',         value: deliveredCount,         sub: 'berhasil dikirim',      Icon: CheckCircle,  ic: '#7635c4', ib: 'rgba(175,82,222,0.1)' },
              { label: 'Rata-rata DO',    value: fmtShort(avgOrder),     sub: 'per DO terkirim',       Icon: TrendingUp,   ic: '#975400', ib: 'rgba(255,159,10,0.1)' },
            ].map(({ label, value, sub, Icon, ic, ib }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 18, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6e6e73', margin: 0, lineHeight: 1.3, fontFamily: FF }}>{label}</p>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: ib, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color={ic} strokeWidth={2} />
                  </div>
                </div>
                <p style={{ fontSize: typeof value === 'string' && value.length > 9 ? 19 : 30, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.5px', fontFamily: FF }}>{value}</p>
                <p style={{ fontSize: 11, color: '#aeaeb2', margin: 0, fontFamily: FF }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Chart Card */}
          <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 4px', fontFamily: FF }}>Omzet Bulanan</p>
                <p style={{ fontSize: 30, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.5px', fontFamily: FF }}>
                  {fmtShort(chartData.reduce((a, d) => a + d.revenue, 0))}
                </p>
                {searchMonth && (
                  <p style={{ fontSize: 12, color: '#0071e3', margin: '4px 0 0', fontWeight: 500, fontFamily: FF }}>
                    Sorot: {monthLabel(searchMonth)}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0071e3' }} />
                <span style={{ fontSize: 12, color: '#aeaeb2', fontFamily: FF }}>{chartData.length} bulan</span>
              </div>
            </div>
            <div style={{ padding: '0 6px 6px' }}>
              <LineChart data={chartData} highlightMonth={searchMonth} />
            </div>
          </div>

          {/* Month Search */}
          <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', margin: '0 0 2px', fontFamily: FF }}>Cari Omzet per Bulan</p>
                <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0, fontFamily: FF }}>Pilih bulan untuk filter — grafik menyorot otomatis</p>
              </div>
              {searchMonth && (
                <button onClick={() => setSearchMonth(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 980, fontSize: 12, fontWeight: 500, border: 'none', background: 'rgba(255,59,48,0.1)', color: '#c0392b', cursor: 'pointer', fontFamily: FF, flexShrink: 0 }}>
                  <X size={12} /> Hapus
                </button>
              )}
            </div>

            {searchMonth && (
              <div style={{ background: 'rgba(0,113,227,0.06)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#0055d4', fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FF }}>{monthLabel(searchMonth)}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.4px', fontFamily: FF }}>{fmtShort(totalRevenue)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: '#6e6e73', margin: '0 0 2px', fontFamily: FF }}>{totalOrders} dok</p>
                  <p style={{ fontSize: 12, color: '#6e6e73', margin: 0, fontFamily: FF }}>{deliveredCount} terkirim</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {allMonths.map(m => {
                const isSel = searchMonth === m
                const mIdx  = parseInt(m.slice(5), 10) - 1
                return (
                  <button key={m} onClick={() => setSearchMonth(isSel ? null : m)} style={{
                    padding: '5px 13px', borderRadius: 980, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: FF,
                    fontWeight: isSel ? 600 : 400,
                    background: isSel ? '#0071e3' : 'rgba(116,116,128,0.1)',
                    color: isSel ? 'white' : '#6e6e73',
                  }}>
                    {MO[mIdx]} {m.slice(0,4)}
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: isSel ? 0.85 : 0.7 }}>{fmtShort(monthlyMap[m]?.revenue || 0)}</span>
                  </button>
                )
              })}
              {allMonths.length === 0 && <p style={{ fontSize: 13, color: '#aeaeb2', margin: 0, fontFamily: FF }}>Belum ada data.</p>}
            </div>
          </div>

          {/* Top Products */}
          <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', margin: '0 0 2px', fontFamily: FF }}>Produk Terlaris</p>
                <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0, fontFamily: FF }}>Periode {activeLabel}</p>
              </div>
              <span style={{ fontSize: 11, color: '#aeaeb2', background: 'rgba(116,116,128,0.1)', padding: '4px 10px', borderRadius: 980, fontFamily: FF }}>Top {topProducts.length}</span>
            </div>
            {topProducts.length === 0 ? (
              <div style={{ padding: '48px 22px', textAlign: 'center', color: '#aeaeb2', fontSize: 13, fontFamily: FF }}>Belum ada data produk.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FF }}>
                  <thead>
                    <tr>
                      {['#', 'Produk', 'Terjual', 'Omzet', '%'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 22px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 11, fontWeight: 500, color: '#aeaeb2', borderBottom: '1px solid rgba(0,0,0,0.06)', fontFamily: FF }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => {
                      const pct = totalRevenue ? Math.round((p.revenue / totalRevenue) * 100) : 0
                      return (
                        <tr key={p.name} style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '13px 22px', color: '#aeaeb2', fontWeight: 600, fontSize: 12, width: 36, fontFamily: FF }}>{i + 1}</td>
                          <td style={{ padding: '13px 22px', fontWeight: 600, color: '#1d1d1f', fontFamily: FF }}>{p.name}</td>
                          <td style={{ padding: '13px 22px', textAlign: 'right', color: '#6e6e73', fontSize: 12, fontFamily: FF }}>{p.sold.toLocaleString('id')} kg</td>
                          <td style={{ padding: '13px 22px', textAlign: 'right', fontWeight: 700, color: '#1d1d1f', fontFamily: FF }}>{fmtShort(p.revenue)}</td>
                          <td style={{ padding: '13px 22px', minWidth: 110 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                              <div style={{ width: 56, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#0071e3', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500, width: 28, textAlign: 'right', fontFamily: FF }}>{pct}%</span>
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
          <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {STATUS_ROWS.map(s => {
              const count = docs.filter(d => d.status === s.status).length
              const rev   = docs.filter(d => d.status === s.status).reduce((a, d) => a + docTotal(d), 0)
              return (
                <div key={s.status} style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 980, background: s.bg, color: s.color, marginBottom: 12, fontFamily: FF }}>
                    {s.label}
                  </span>
                  <p style={{ fontSize: 30, fontWeight: 700, color: '#1d1d1f', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.5px', fontFamily: FF }}>{count}</p>
                  <p style={{ fontSize: 11, color: '#aeaeb2', margin: '0 0 4px', fontFamily: FF }}>order</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: s.color, margin: 0, fontFamily: FF }}>{fmtShort(rev)}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
