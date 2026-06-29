import { useState, useEffect } from 'react'
import { TrendingUp, Send, Download, ShoppingCart, CheckCircle, DollarSign } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { generateDailyReport, sendToWhatsApp } from '../lib/whatsapp'

function itemsTotal(items) {
  return (items || []).reduce((a, i) => a + (i.qty || 0) * (i.price || 0), 0)
}
function docTotal(d) { return d.total || itemsTotal(d.items) }

function fmt(n)      { return `Rp ${(n || 0).toLocaleString('id')}` }
function fmtShort(n) {
  const v = n || 0
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.0', '')}jt`
  return fmt(v)
}

function BarChart({ data }) {
  const maxRev = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '0 8px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.revenue / maxRev) * 160, 4)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: '100%', position: 'relative' }}>
              <div
                style={{ width: '100%', height: h, background: 'linear-gradient(180deg,#3b82f6 0%,#1d4ed8 100%)', borderRadius: '6px 6px 0 0', cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.parentElement.querySelector('.tooltip').style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.parentElement.querySelector('.tooltip').style.opacity = '0' }}
              />
              <div className="tooltip" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 0.15s', marginBottom: 4, pointerEvents: 'none' }}>
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
  const [docs, setDocs]         = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('6bulan')
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
    if (!d.date) return true
    if (period === 'bulan ini') return d.date.startsWith(now.toISOString().slice(0, 7))
    if (period === '3bulan') {
      const cut = new Date(now); cut.setMonth(cut.getMonth() - 3)
      return d.date >= cut.toISOString().slice(0, 10)
    }
    if (period === '6bulan') {
      const cut = new Date(now); cut.setMonth(cut.getMonth() - 6)
      return d.date >= cut.toISOString().slice(0, 10)
    }
    return d.date.startsWith(String(now.getFullYear()))
  })

  const activeDocs     = periodDocs.filter(d => d.status !== 'cancelled')
  const totalRevenue   = activeDocs.reduce((a, d) => a + docTotal(d), 0)
  const totalOrders    = activeDocs.length
  const deliveredCount = activeDocs.filter(d => d.status === 'delivered').length
  const avgOrder       = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const monthlyMap = {}
  docs.filter(d => d.status !== 'cancelled').forEach(d => {
    const m = (d.date || '').slice(0, 7)
    if (!m || m.length < 7) return
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0 }
    monthlyMap[m].revenue += docTotal(d)
    monthlyMap[m].orders  += 1
  })
  const chartData = Object.keys(monthlyMap).sort().map(m => ({
    month: MONTH_ID[parseInt(m.slice(5), 10) - 1] || m.slice(5),
    revenue: monthlyMap[m].revenue,
    orders:  monthlyMap[m].orders,
    key: m,
  }))

  const productMap = {}
  activeDocs.forEach(d => {
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
    const date = new Date().toISOString().slice(0, 10)

    const orderRows = docs.map(d => ({
      'No. SO':     d.number,
      'Klien':      d.client_name,
      'Tanggal':    d.date,
      'Status':     d.status,
      'Total (Rp)': docTotal(d),
      'Catatan':    d.notes || '',
      'Item':       (d.items || []).map(i => `${i.name} ${i.qty}${i.unit || ''}`).join(', '),
    }))
    const ws1 = XLSX.utils.json_to_sheet(orderRows)
    ws1['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 13 }, { wch: 15 }, { wch: 24 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Laporan SO')

    if (topProducts.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(topProducts.map((p, i) => ({
        'Rank': i + 1, 'Nama Produk': p.name,
        'Terjual': p.sold, 'Omzet (Rp)': p.revenue,
      })))
      ws2['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Produk Terlaris')
    }

    if (products.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(products.map(p => ({
        'Nama Produk':    p.nama,
        'Kategori':       p.kategori,
        'Stok Saat Ini':  p.qty || 0,
        'Satuan':         p.satuan || 'kg',
        'Stok Minimum':   p.min_qty || 0,
        'Harga Jual (Rp)': p.harga_jual || 0,
        'Nilai Stok (Rp)': (p.qty || 0) * (p.harga_jual || 0),
        'Lokasi':         p.location || '',
      })))
      ws3['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws3, 'Stok Produk')
    }

    if (clients.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(clients.map(c => ({
        'Nama Klien':       c.name, 'Tipe': c.type,
        'Kontak':           c.contact, 'No. HP': c.phone,
        'Alamat':           c.address,
        'Total Order':      c.total_orders || 0,
        'Total Belanja (Rp)': c.total_spend || 0,
        'Rating':           c.rating,
        'Status':           c.active ? 'Aktif' : 'Nonaktif',
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

  const STATUS_ROWS = [
    { status: 'delivered',  label: 'Terkirim',     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { status: 'dispatched', label: 'Dikirim',       color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { status: 'confirmed',  label: 'Dikonfirmasi',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { status: 'cancelled',  label: 'Dibatal',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.015em' }}>Laporan &amp; Analitik</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ringkasan performa bisnis berdasarkan data aktual</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'bulan ini', label: 'Bulan Ini' },
            { key: '3bulan',   label: '3 Bulan' },
            { key: '6bulan',   label: '6 Bulan' },
            { key: 'tahun ini', label: 'Tahun Ini' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              border: period === p.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: period === p.key ? '#2563eb' : 'white',
              color: period === p.key ? 'white' : '#64748b', transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Penjualan', value: fmtShort(totalRevenue), sub: `omzet ${period === 'bulan ini' ? 'bulan ini' : period === 'tahun ini' ? 'tahun ini' : period}`, Icon: DollarSign,   iconColor: '#16a34a', iconBg: '#f0fdf4' },
              { label: 'Total SO',        value: totalOrders,            sub: 'semua transaksi',  Icon: ShoppingCart, iconColor: '#2563eb', iconBg: '#eff6ff' },
              { label: 'SO Terkirim',     value: deliveredCount,         sub: 'berhasil dikirim', Icon: CheckCircle,  iconColor: '#7c3aed', iconBg: '#f5f3ff' },
              { label: 'Rata-rata SO',    value: fmtShort(avgOrder),     sub: 'per transaksi',    Icon: TrendingUp,   iconColor: '#d97706', iconBg: '#fffbeb' },
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

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '20px 24px' }}>
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
            {chartData.length > 0 ? <BarChart data={chartData} /> : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                Belum ada data order untuk ditampilkan.
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Produk Terlaris</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Berdasarkan total omzet dari semua SO aktif</p>
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
                        <tr key={p.name} style={{ borderTop: i > 0 ? '1px solid #f8fafc' : 'none', background: 'white', transition: 'background 0.15s' }}
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
