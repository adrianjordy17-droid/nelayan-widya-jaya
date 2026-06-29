import { useState, useEffect } from 'react'
import { Search, AlertTriangle, Package, DollarSign, Tag, BarChart2, Plus, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const KAT_MAP = {
  'UDANG PANCET':  'Udang',
  'UDANG VANAMEI': 'Udang',
  'CUMI':          'Cumi',
  'IKAN':          'Ikan Laut',
  'OTHER':         'Lainnya',
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}
function fmtDT(s) {
  if (!s) return '–'
  return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StockBar({ qty, minQty }) {
  const max   = Math.max(qty, minQty * 3, 50)
  const pct   = Math.min(Math.round((qty / max) * 100), 100)
  const color = qty <= minQty ? '#ef4444' : pct < 50 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, width: 36, textAlign: 'right', flexShrink: 0 }}>{qty}</span>
    </div>
  )
}

export default function Stock() {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'owner' || profile?.role === 'admin'

  const [stock, setStock]         = useState([])
  const [logs, setLogs]           = useState([])
  const [search, setSearch]       = useState('')
  const [katFilter, setKatFilter] = useState('semua')
  const [addModal, setAddModal]   = useState(false)
  const [addForm, setAddForm]     = useState({ product_id: '', qty: '', notes: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError]   = useState('')

  function loadStock() {
    supabase.from('products')
      .select('id, nama, ukuran, kategori, qty, min_qty, harga_jual, satuan, location')
      .order('kategori')
      .then(({ data }) => setStock(data || []))
  }
  function loadLogs() {
    supabase.from('stock_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setLogs(data || []))
  }

  useEffect(() => { loadStock(); loadLogs() }, [])

  async function handleAddStock() {
    setAddError('')
    if (!addForm.product_id) return setAddError('Pilih produk dulu.')
    const qty = parseFloat(addForm.qty)
    if (!qty || qty <= 0) return setAddError('Qty harus lebih dari 0.')
    setAddSaving(true)

    const prod = stock.find(s => s.id === addForm.product_id)
    const newQty = (prod?.qty || 0) + qty

    const { error: e1 } = await supabase
      .from('products')
      .update({ qty: newQty })
      .eq('id', addForm.product_id)

    if (e1) { setAddError(e1.message); setAddSaving(false); return }

    await supabase.from('stock_logs').insert({
      product_name: prod?.nama,
      type: 'masuk',
      qty,
      source: 'manual',
      date: new Date().toISOString().slice(0, 10),
      notes: addForm.notes || null,
    })

    setAddSaving(false)
    setAddModal(false)
    setAddForm({ product_id: '', qty: '', notes: '' })
    loadStock()
    loadLogs()
  }

  const kats     = ['semua', ...new Set(stock.map(s => KAT_MAP[s.kategori] || s.kategori || 'Lainnya'))]
  const filtered = stock.filter(s => {
    const kat = KAT_MAP[s.kategori] || s.kategori || 'Lainnya'
    const q   = search.toLowerCase()
    return (
      ((s.nama || '').toLowerCase().includes(q) || (s.kategori || '').toLowerCase().includes(q)) &&
      (katFilter === 'semua' || kat === katFilter)
    )
  })

  const totalProduk = stock.length
  const stokKritis  = stock.filter(s => (s.min_qty || 0) > 0 && (s.qty || 0) <= (s.min_qty || 0)).length
  const estNilai    = stock.reduce((a, s) => a + (s.qty || 0) * (s.harga_jual || 0), 0)
  const totalKat    = new Set(stock.map(s => KAT_MAP[s.kategori] || s.kategori)).size
  const kritisItems = stock.filter(s => (s.min_qty || 0) > 0 && (s.qty || 0) <= (s.min_qty || 0))

  const STATS = [
    { label: 'Total Produk',  value: String(totalProduk), sub: 'terdaftar',             Icon: Package,       iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'Stok Kritis',   value: String(stokKritis),  sub: 'perlu restok segera',   Icon: AlertTriangle, iconColor: stokKritis > 0 ? '#dc2626' : '#64748b', iconBg: stokKritis > 0 ? '#fef2f2' : '#f8fafc' },
    {
      label: 'Est. Nilai Stok',
      value: estNilai >= 1_000_000 ? `Rp ${(estNilai / 1_000_000).toFixed(1)}jt` : fmt(estNilai),
      sub: 'berdasarkan harga jual', Icon: DollarSign, iconColor: '#16a34a', iconBg: '#f0fdf4',
    },
    { label: 'Kategori', value: String(totalKat), sub: 'jenis produk', Icon: Tag, iconColor: '#7c3aed', iconBg: '#f5f3ff' },
  ]

  const inputStyle = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, outline: 'none', background: 'white',
    color: '#0f172a', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: value.length > 10 ? 17 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BarChart2 size={16} color="#2563eb" strokeWidth={2} style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#1d4ed8', margin: 0, fontWeight: 500 }}>
          Halaman ini untuk monitoring stok. Untuk mengubah data produk, gunakan menu <strong>Produk &amp; Harga</strong>.
        </p>
      </div>

      {/* Stok Kritis Alert */}
      {kritisItems.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} color="#dc2626" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: 0 }}>Stok Kritis — Segera Restok</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {kritisItems.map(s => (
              <span key={s.id} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: 'white', border: '1px solid #fecaca', color: '#dc2626' }}>
                {s.nama} — {s.qty || 0}/{s.min_qty} {s.satuan || 'kg'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter + Search + Tambah Stok */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {kats.map(k => (
            <button key={k} onClick={() => setKatFilter(k)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', outline: 'none', border: 'none', transition: 'all 0.15s',
              background: katFilter === k ? '#2563eb' : 'white',
              color: katFilter === k ? 'white' : '#64748b',
              boxShadow: katFilter === k ? 'none' : '0 0 0 1px #e2e8f0',
            }}>{k === 'semua' ? 'Semua' : k}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 36px', fontSize: 13, outline: 'none', background: 'white', width: 200, color: '#0f172a', fontFamily: 'inherit' }} />
          </div>
          {canEdit && (
            <button onClick={() => { setAddModal(true); setAddError('') }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white',
              borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <Plus size={15} /> Tambah Stok
            </button>
          )}
        </div>
      </div>

      {/* Stock Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Produk', 'Kategori', 'Stok', 'Min. Stok', 'Harga Jual', 'Lokasi'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    {stock.length === 0 ? 'Belum ada produk. Tambah produk di menu Produk & Harga.' : 'Tidak ada produk yang cocok.'}
                  </td>
                </tr>
              )}
              {filtered.map((s, idx) => {
                const kat      = KAT_MAP[s.kategori] || s.kategori || 'Lainnya'
                const isKritis = (s.min_qty || 0) > 0 && (s.qty || 0) <= (s.min_qty || 0)
                return (
                  <tr key={s.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isKritis && <AlertTriangle size={13} color="#dc2626" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.nama}</span>
                        {s.ukuran && <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: 4 }}>{s.ukuran}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#f1f5f9', color: '#64748b' }}>{kat}</span>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: 140 }}>
                      <StockBar qty={s.qty || 0} minQty={s.min_qty || 0} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {s.min_qty || 0} {s.satuan || 'kg'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {fmt(s.harga_jual)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                      {s.location || '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Log */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={15} color="#64748b" />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>Riwayat Pergerakan Stok</p>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>(50 terbaru)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Waktu', 'Produk', 'Tipe', 'Qty', 'Sumber', 'Keterangan'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Belum ada riwayat pergerakan stok.
                  </td>
                </tr>
              )}
              {logs.map((log, idx) => (
                <tr key={log.id}
                  style={{ borderBottom: idx < logs.length - 1 ? '1px solid #f8fafc' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(log.created_at)}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{log.product_name || '–'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: log.type === 'masuk' ? '#f0fdf4' : '#fef2f2',
                      color: log.type === 'masuk' ? '#16a34a' : '#dc2626',
                    }}>
                      {log.type === 'masuk'
                        ? <ArrowDownCircle size={12} />
                        : <ArrowUpCircle size={12} />}
                      {log.type === 'masuk' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: log.type === 'masuk' ? '#16a34a' : '#dc2626' }}>
                    {log.type === 'masuk' ? '+' : '-'}{log.qty}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                    {log.source === 'order' ? `SO: ${log.source_ref || '–'}` : 'Manual'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{log.notes || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tambah Stok Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)', width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>Tambah Stok</h3>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Produk</label>
                <select value={addForm.product_id} onChange={e => setAddForm(f => ({ ...f, product_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- Pilih Produk --</option>
                  {stock.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}{s.ukuran ? ` (${s.ukuran})` : ''} — stok: {s.qty || 0} {s.satuan || 'kg'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Jumlah Ditambahkan</label>
                <input type="number" min="0.01" step="0.01" placeholder="cth: 50" value={addForm.qty}
                  onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Keterangan (opsional)</label>
                <input placeholder="cth: beli dari supplier A" value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              </div>
              {addError && <p style={{ color: '#dc2626', fontSize: 12.5, margin: 0 }}>{addError}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              <button onClick={handleAddStock} disabled={addSaving} style={{
                flex: 1, background: addSaving ? '#f1f5f9' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: addSaving ? '#94a3b8' : 'white', borderRadius: 10, padding: '10px 0',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: addSaving ? 'not-allowed' : 'pointer',
              }}>
                {addSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setAddModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
