import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'

function itemsTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, it) => sum + ((it.qty || 0) * (it.price || 0)), 0)
}

function docTotal(d) {
  return d.total || itemsTotal(d.items)
}

function formatRp(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1).replace('.', ',')}jt`
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}rb`
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

function formatRpFull(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

function LineChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7c7cc', fontSize: 13 }}>
        Tidak cukup data untuk grafik
      </div>
    )
  }

  const W = 600, H = 200
  const pad = { top: 16, right: 16, bottom: 32, left: 52 }
  const cW = W - pad.left - pad.right
  const cH = H - pad.top - pad.bottom

  const values = data.map(d => d.value)
  const maxVal = Math.max(...values, 1)

  const xs = (i) => (i / (data.length - 1)) * cW
  const ys = (v) => cH - (v / maxVal) * cH

  const pts = data.map((d, i) => ({ x: xs(i), y: ys(d.value) }))

  let linePath = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i]
    const mx = (p.x + c.x) / 2
    linePath += ` C ${mx} ${p.y} ${mx} ${c.y} ${c.x} ${c.y}`
  }

  const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${cH} L ${pts[0].x} ${cH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => {
    const val = maxVal * r
    return {
      y: ys(val),
      label: val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : val >= 1000 ? `${(val / 1000).toFixed(0)}rb` : `${Math.round(val)}`
    }
  })

  const step = Math.max(1, Math.floor(data.length / 4))
  const xLabels = data.map((d, i) => ({ i, label: d.label })).filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180 }}>
      <defs>
        <linearGradient id="reportChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#007AFF" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={0} y1={t.y} x2={cW} y2={t.y} stroke="#f2f2f7" strokeWidth={1} />
            <text x={-6} y={t.y + 4} textAnchor="end" fontSize={9} fill="#aeaeb2" fontFamily="system-ui">{t.label}</text>
          </g>
        ))}
        <path d={areaPath} fill="url(#reportChartGrad)" />
        <path d={linePath} fill="none" stroke="#007AFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {xLabels.map(({ i, label }) => (
          <text key={i} x={xs(i)} y={cH + 18} textAnchor="middle" fontSize={9} fill="#aeaeb2" fontFamily="system-ui">{label}</text>
        ))}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill="#007AFF" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={7} fill="#007AFF" fillOpacity={0.15} />
      </g>
    </svg>
  )
}

export default function Reports() {
  const { isRole } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [dateFrom, dateTo])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('id, number, type, status, client_name, created_at, total, date, items')
      .eq('type', 'SO')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true })
    if (!error && data) setDocs(data)
    setLoading(false)
  }

  const activeDocs = useMemo(() => docs.filter(d => d.status !== 'cancelled'), [docs])
  const cancelledDocs = useMemo(() => docs.filter(d => d.status === 'cancelled'), [docs])

  const totalRevenue = useMemo(() => activeDocs.reduce((s, d) => s + docTotal(d), 0), [activeDocs])
  const totalTransaksi = activeDocs.length
  const totalProduk = useMemo(() =>
    activeDocs.reduce((s, d) => s + (Array.isArray(d.items) ? d.items.reduce((a, it) => a + (it.qty || 0), 0) : 0), 0),
  [activeDocs])
  const refundTotal = useMemo(() => cancelledDocs.reduce((s, d) => s + docTotal(d), 0), [cancelledDocs])

  const labaKotor = totalRevenue * 0.25
  const labaBersih = totalRevenue * 0.15

  const chartData = useMemo(() => {
    const byDate = {}
    activeDocs.forEach(d => {
      const date = (d.date || d.created_at || '').slice(0, 10)
      if (!date) return
      byDate[date] = (byDate[date] || 0) + docTotal(d)
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ label: date.slice(5).replace('-', '/'), value }))
  }, [activeDocs])

  const topProducts = useMemo(() => {
    const pm = {}
    activeDocs.forEach(d => {
      ;(d.items || []).forEach(it => {
        const name = it.product_name || it.name || it.product_id || 'Unknown'
        pm[name] = (pm[name] || 0) + (it.qty || 0)
      })
    })
    return Object.entries(pm)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }))
  }, [activeDocs])

  function setRange(days) {
    const from = new Date()
    from.setDate(from.getDate() - days + 1)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(today)
  }

  function setMonth() {
    setDateFrom(today.slice(0, 7) + '-01')
    setDateTo(today)
  }

  function set3Month() {
    const d = new Date()
    d.setMonth(d.getMonth() - 2)
    d.setDate(1)
    setDateFrom(d.toISOString().slice(0, 10))
    setDateTo(today)
  }

  function setYear() {
    setDateFrom(today.slice(0, 4) + '-01-01')
    setDateTo(today)
  }

  function exportExcel() {
    const rows = activeDocs.map(d => ({
      'No. Dokumen': d.number,
      'Tanggal': d.date || (d.created_at || '').slice(0, 10),
      'Pelanggan': d.client_name || '-',
      'Status': d.status,
      'Total (Rp)': docTotal(d)
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, `laporan-${dateFrom}-sd-${dateTo}.xlsx`)
  }

  function kirimWA() {
    const msg = [
      '*Laporan Penjualan NWJ*',
      `Periode: ${dateFrom} s/d ${dateTo}`,
      '',
      `Penjualan: ${formatRpFull(totalRevenue)}`,
      `Total Transaksi: ${totalTransaksi}`,
      `Produk Terjual: ${totalProduk} unit`,
      `Dibatalkan: ${cancelledDocs.length} transaksi`
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`)
  }

  const card = {
    background: '#fff',
    borderRadius: 16,
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)'
  }

  const quickBtns = [
    { label: 'Hari Ini', fn: () => { setDateFrom(today); setDateTo(today) } },
    { label: '7 Hari', fn: () => setRange(7) },
    { label: 'Bulan Ini', fn: setMonth },
    { label: '3 Bulan', fn: set3Month },
    { label: 'Tahun Ini', fn: setYear }
  ]

  const statCards = [
    { label: 'Penjualan', value: formatRpFull(totalRevenue), sub: `${totalTransaksi} SO aktif`, accent: '#007AFF' },
    { label: 'Laba Kotor', value: formatRpFull(labaKotor), sub: 'est. 25% margin', accent: '#34C759' },
    ...(isRole('owner')
      ? [{ label: 'Laba Bersih', value: formatRpFull(labaBersih), sub: 'est. 15% net margin', accent: '#30B0C7' }]
      : []),
    { label: 'Total Produk', value: `${totalProduk} unit`, sub: 'qty terjual', accent: '#FF9500' },
    { label: 'Total Transaksi', value: String(totalTransaksi), sub: 'SO tidak dibatal', accent: '#5856D6' },
    { label: 'Refund', value: formatRpFull(refundTotal), sub: `${cancelledDocs.length} dibatalkan`, accent: '#FF3B30' }
  ]

  const statusLabel = {
    delivered: 'Terkirim',
    shipping: 'Dikirim',
    confirmed: 'Dikonfirmasi',
    draft: 'Draft',
    cancelled: 'Dibatal'
  }

  const statusColor = {
    delivered: '#34C759',
    shipping: '#007AFF',
    confirmed: '#FF9500',
    draft: '#8e8e93',
    cancelled: '#FF3B30'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif', paddingBottom: 40 }}>

      {/* Sticky Header */}
      <div style={{ background: '#fff', padding: '20px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.5 }}>Laporan Penjualan</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8e8e93' }}>Analitik & performa transaksi</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Date Range Picker */}
        <div style={{ ...card, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600, letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' }}>Dari</div>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, color: '#1c1c1e', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}
            />
          </div>
          <div style={{ color: '#c7c7cc', fontSize: 22, fontWeight: 300, flexShrink: 0 }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 600, letterSpacing: 0.8, marginBottom: 5, textTransform: 'uppercase' }}>Sampai</div>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={today}
              onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, color: '#1c1c1e', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {quickBtns.map(btn => (
            <button
              key={btn.label}
              onClick={btn.fn}
              style={{
                background: '#fff',
                border: '1px solid #e5e5ea',
                borderRadius: 20,
                padding: '7px 16px',
                fontSize: 13,
                color: '#3a3a3c',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                flexShrink: 0,
                transition: 'all 0.15s'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Chart Card */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 500, letterSpacing: 0.2 }}>Total Penjualan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1c1c1e', letterSpacing: -1.2, marginTop: 2 }}>
              {loading ? <span style={{ color: '#c7c7cc', fontSize: 20, fontWeight: 400 }}>Memuat…</span> : formatRpFull(totalRevenue)}
            </div>
            {!loading && (
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>
                {dateFrom === dateTo ? dateFrom : `${dateFrom} – ${dateTo}`}
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            {loading ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7c7cc', fontSize: 13 }}>Memuat grafik…</div>
            ) : (
              <LineChart data={chartData} />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 500, marginBottom: 6, letterSpacing: 0.1 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.accent, letterSpacing: -0.5, lineHeight: 1.2 }}>{loading ? '–' : s.value}</div>
              <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Top Products */}
        {!loading && topProducts.length > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', marginBottom: 14 }}>Produk Terlaris</div>
            {topProducts.map((p, i) => {
              const maxQty = topProducts[0].qty
              return (
                <div key={p.name} style={{ marginBottom: i < topProducts.length - 1 ? 14 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1c1c1e', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: '#8e8e93', fontWeight: 500 }}>{p.qty} unit</span>
                  </div>
                  <div style={{ height: 5, background: '#f2f2f7', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${(p.qty / maxQty) * 100}%`, background: 'linear-gradient(90deg, #007AFF, #5856D6)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent Transactions */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>Transaksi Terbaru</div>
            {!loading && activeDocs.length > 10 && (
              <div style={{ fontSize: 12, color: '#8e8e93' }}>10 dari {activeDocs.length}</div>
            )}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#c7c7cc', fontSize: 13, padding: '20px 0' }}>Memuat…</div>
          ) : activeDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#c7c7cc', fontSize: 13, padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              Tidak ada transaksi di periode ini
            </div>
          ) : (
            [...activeDocs].reverse().slice(0, 10).map((d, i, arr) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid #f2f2f7' : 'none'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.client_name || d.number}
                  </div>
                  <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2 }}>
                    {d.number} · {d.date || (d.created_at || '').slice(0, 10)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{formatRp(docTotal(d))}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: statusColor[d.status] || '#8e8e93', marginTop: 2 }}>
                    {statusLabel[d.status] || d.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportExcel}
            style={{
              flex: 1,
              background: '#007AFF',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '15px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: -0.2
            }}
          >
            Export Excel
          </button>
          <button
            onClick={kirimWA}
            style={{
              flex: 1,
              background: '#34C759',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '15px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: -0.2
            }}
          >
            Kirim WA
          </button>
        </div>

      </div>
    </div>
  )
}
