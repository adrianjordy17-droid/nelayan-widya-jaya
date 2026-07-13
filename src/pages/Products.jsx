import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, X, Tag, Clock, TrendingUp, TrendingDown, RefreshCw, Check } from 'lucide-react'

const KATEGORI_LIST = ['UDANG PANCET', 'UDANG VANAMEI', 'CUMI', 'IKAN', 'OTHER']
const SATUAN_LIST   = ['PER KG', 'PER PACK', 'PER EKOR']

// Tebak kategori & satuan dari nama/unit produk di DO/GR
function guessKat(name) {
  const n = (name || '').toUpperCase()
  if (n.includes('PANCET')) return 'UDANG PANCET'
  if (n.includes('VANAMEI') || n.includes('VANNAMEI') || n.includes('VANAME')) return 'UDANG VANAMEI'
  if (n.includes('UDANG')) return 'UDANG VANAMEI'
  if (n.includes('CUMI') || n.includes('SOTONG')) return 'CUMI'
  if (n.includes('IKAN') || n.includes('KAKAP') || n.includes('TENGGIRI') || n.includes('BANDENG') || n.includes('KERAPU') || n.includes('DORI') || n.includes('SALMON') || n.includes('TUNA')) return 'IKAN'
  return 'OTHER'
}
function guessSatuan(unit) {
  const u = (unit || '').toLowerCase()
  if (u.includes('pack') || u.includes('pak') || u.includes('pcs') || u.includes('bungkus')) return 'PER PACK'
  if (u.includes('ekor') || u.includes('ptg')) return 'PER EKOR'
  return 'PER KG'
}

const KATEGORI_LABEL = {
  'UDANG PANCET':  'Udang Pancet',
  'UDANG VANAMEI': 'Udang Vanamei',
  'CUMI':          'Cumi',
  'IKAN':          'Ikan',
  'OTHER':         'Lainnya',
}

const KATEGORI_COLOR = {
  'UDANG PANCET':  '#ff9500',
  'UDANG VANAMEI': '#ff6b35',
  'CUMI':          '#0a84ff',
  'IKAN':          '#30d158',
  'OTHER':         '#8e8e93',
}

function fmtRp(val) {
  if (val === null || val === undefined || val === '') return '—'
  return 'Rp ' + Number(val).toLocaleString('id-ID')
}

function fmtTime(ts) {
  if (!ts) return '–'
  const d = new Date(ts)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const EMPTY_FORM = {
  nama: '', ukuran: '', kategori: 'UDANG PANCET',
  harga_jual: '', harga_modal: '', satuan: 'PER KG',
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid #e5e5ea', fontSize: 14, outline: 'none',
  background: 'white', color: '#1c1c1e', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 12, fontWeight: 500, color: '#6b6b6b',
  marginBottom: 4, display: 'block',
}

export default function Products() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const canEdit = isOwner || profile?.role === 'admin'

  const [products,      setProducts]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeKat,     setActiveKat]     = useState('ALL')
  const [showModal,     setShowModal]     = useState(false)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [editId,        setEditId]        = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Price history state
  const [historyProduct,  setHistoryProduct]  = useState(null)
  const [priceHistory,    setPriceHistory]    = useState([])
  const [historyLoading,  setHistoryLoading]  = useState(false)

  // Sync dari DO/GR state
  const [syncOpen,    setSyncOpen]    = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncItems,   setSyncItems]   = useState([])
  const [syncSaving,  setSyncSaving]  = useState(false)

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('kategori')
      .order('created_at')
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

  const allFiltered = activeKat === 'ALL'
    ? products
    : products.filter(p => p.kategori === activeKat)

  const grouped = KATEGORI_LIST.reduce((acc, k) => {
    const items = allFiltered.filter(p => p.kategori === k)
    if (items.length) acc[k] = items
    return acc
  }, {})

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(p) {
    setForm({
      nama:        p.nama        || '',
      ukuran:      p.ukuran      || '',
      kategori:    p.kategori    || 'UDANG PANCET',
      harga_jual:  p.harga_jual  ?? '',
      harga_modal: p.harga_modal ?? '',
      satuan:      p.satuan      || 'PER KG',
    })
    setEditId(p.id)
    setShowModal(true)
  }

  async function openHistory(p) {
    setHistoryProduct(p)
    setHistoryLoading(true)
    setPriceHistory([])
    try {
      const { data } = await supabase
        .from('product_price_history')
        .select('*')
        .eq('product_id', p.id)
        .order('changed_at', { ascending: false })
        .limit(30)
      setPriceHistory(data || [])
    } catch {}
    setHistoryLoading(false)
  }

  async function handleSave() {
    if (!form.nama.trim()) return
    setSaving(true)

    const payload = {
      nama:       form.nama.trim(),
      ukuran:     form.ukuran.trim(),
      kategori:   form.kategori,
      harga_jual: form.harga_jual !== '' ? Number(form.harga_jual) : null,
      satuan:     form.satuan,
    }
    if (isOwner) {
      payload.harga_modal = form.harga_modal !== '' ? Number(form.harga_modal) : null
    }

    if (editId) {
      const oldProduct = products.find(p => p.id === editId)
      await supabase.from('products').update(payload).eq('id', editId)

      // Record price change if harga_jual or harga_modal changed
      const oldHJ = oldProduct?.harga_jual ?? null
      const newHJ = payload.harga_jual ?? null
      const oldHM = isOwner ? (oldProduct?.harga_modal ?? null) : undefined
      const newHM = isOwner ? (payload.harga_modal ?? null) : undefined

      const priceChanged = oldHJ !== newHJ || (isOwner && oldHM !== newHM)
      if (priceChanged) {
        try {
          await supabase.from('product_price_history').insert({
            product_id:      editId,
            product_name:    payload.nama,
            harga_jual_old:  oldHJ,
            harga_jual_new:  newHJ,
            harga_modal_old: isOwner ? oldHM : null,
            harga_modal_new: isOwner ? newHM : null,
            changed_by:      profile?.id || null,
          })
        } catch {}
      }
    } else {
      await supabase.from('products').insert(payload)
    }

    setSaving(false)
    setShowModal(false)
    loadProducts()
  }

  async function handleDelete(id) {
    await supabase.from('products').delete().eq('id', id)
    setDeleteConfirm(null)
    loadProducts()
  }

  // Kumpulkan produk unik dari DO & GR, bandingkan dgn daftar produk yg ada.
  async function openSync() {
    setSyncOpen(true)
    setSyncLoading(true)
    setSyncItems([])
    try {
      const [doRes, grRes] = await Promise.all([
        supabase.from('documents').select('date,items').eq('type', 'DO'),
        supabase.from('documents').select('date,items').eq('type', 'GR'),
      ])
      // name(lower) -> { name, jual, unit, date, rank }  rank: GR(jual)=2 > DO(price)=1
      const map = {}
      function consider(name, jual, unit, date, rank) {
        const key = (name || '').toLowerCase().trim()
        if (!key || jual < 0) return
        const cur = map[key]
        const d = date || ''
        if (!cur) { map[key] = { name: name.trim(), jual, unit: unit || '', date: d, rank }; return }
        const replace = jual > 0 && (rank > cur.rank || (rank === cur.rank && d >= cur.date) || cur.jual === 0)
        if (replace) map[key] = { name: cur.name, jual, unit: unit || cur.unit, date: d, rank }
        else if (!cur.unit && unit) cur.unit = unit
      }
      ;(grRes.data || []).forEach(doc => (doc.items || []).forEach(it => {
        if (!it.name) return
        consider(it.name, parseFloat(it.jual) || parseFloat(it.price) || 0, it.unit, doc.date, 2)
      }))
      ;(doRes.data || []).forEach(doc => (doc.items || []).forEach(it => {
        if (!it.name) return
        consider(it.name, parseFloat(it.price) || 0, it.unit, doc.date, 1)
      }))
      const existingByName = {}
      products.forEach(p => { existingByName[(p.nama || '').toLowerCase().trim()] = p })
      const items = []
      Object.values(map).forEach(m => {
        const ex = existingByName[m.name.toLowerCase().trim()]
        if (!ex) {
          items.push({ action: 'add', nama: m.name, kategori: guessKat(m.name), harga_jual: m.jual || '', satuan: guessSatuan(m.unit), selected: true })
        } else if ((ex.harga_jual === null || ex.harga_jual === undefined || ex.harga_jual === '') && m.jual > 0) {
          items.push({ action: 'update', id: ex.id, nama: ex.nama, kategori: ex.kategori, harga_jual: m.jual, satuan: ex.satuan, selected: true })
        }
      })
      items.sort((a, b) => (a.action === b.action ? a.nama.localeCompare(b.nama) : a.action === 'add' ? -1 : 1))
      setSyncItems(items)
    } catch (e) { alert('Gagal membaca DO/GR: ' + (e.message || e)) }
    setSyncLoading(false)
  }

  function toggleSync(i) {
    setSyncItems(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s))
  }
  function setSyncField(i, field, value) {
    setSyncItems(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function confirmSync() {
    const chosen = syncItems.filter(s => s.selected)
    if (!chosen.length) { setSyncOpen(false); return }
    setSyncSaving(true)
    try {
      const toInsert = chosen.filter(s => s.action === 'add').map(s => ({
        nama: s.nama.trim(), kategori: s.kategori, satuan: s.satuan,
        harga_jual: s.harga_jual !== '' ? Number(s.harga_jual) : null,
      }))
      if (toInsert.length) await supabase.from('products').insert(toInsert)
      for (const s of chosen.filter(s => s.action === 'update')) {
        await supabase.from('products').update({ harga_jual: s.harga_jual !== '' ? Number(s.harga_jual) : null }).eq('id', s.id)
      }
    } catch (e) { alert('Gagal sinkron: ' + (e.message || e)) }
    setSyncSaving(false)
    setSyncOpen(false)
    loadProducts()
  }

  return (
    <div className="rw" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Daftar Produk</h1>
          <p style={{ fontSize: 13, color: '#8e8e93', margin: '4px 0 0' }}>
            {products.length} produk&nbsp;
            <span style={{ color: '#ff9500', fontWeight: 500 }}>• Harga sewaktu-waktu bisa berubah</span>
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={openSync} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 10,
              background: '#f2f2f7', color: '#0a84ff', border: 'none',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}>
              <RefreshCw size={14} strokeWidth={2.5} />
              Sinkron dari DO/GR
            </button>
            <button onClick={openAdd} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 10,
              background: '#0a84ff', color: 'white', border: 'none',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={15} strokeWidth={2.5} />
              Tambah Produk
            </button>
          </div>
        )}
      </div>

      {/* ── Category Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', ...KATEGORI_LIST].map(k => (
          <button
            key={k}
            onClick={() => setActiveKat(k)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeKat === k ? 600 : 400,
              background: activeKat === k
                ? (k === 'ALL' ? '#1c1c1e' : KATEGORI_COLOR[k])
                : '#e5e5ea',
              color: activeKat === k ? 'white' : '#3c3c43',
              transition: 'all 0.15s',
            }}
          >
            {k === 'ALL' ? 'Semua' : KATEGORI_LABEL[k]}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8e8e93', fontSize: 14 }}>
          Memuat produk...
        </div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
        }}>
          <Tag size={40} color="#c7c7cc" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Belum ada produk</p>
          <p style={{ fontSize: 13, color: '#8e8e93', marginTop: 6 }}>Tambahkan produk pertama Anda</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8e8e93', fontSize: 14 }}>
          Tidak ada produk di kategori ini.
        </div>
      ) : (
        Object.entries(grouped).map(([kat, items]) => (
          <div key={kat} style={{ marginBottom: 24 }}>

            {/* Category heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: KATEGORI_COLOR[kat], flexShrink: 0 }} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {KATEGORI_LABEL[kat]}
              </h2>
              <span style={{ fontSize: 11.5, color: '#8e8e93' }}>{items.length} produk</span>
            </div>

            {/* Table */}
            <div style={{
              background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.88)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflowX: 'auto',
            }}>
              <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <th style={thStyle('left')}>Nama / Ukuran</th>
                    <th style={thStyle('right')}>Harga Jual</th>
                    {isOwner && <th style={thStyle('right')}>Modal</th>}
                    {isOwner && <th style={{ ...thStyle('right'), color: '#30d158' }}>Margin</th>}
                    <th style={thStyle('center')}>Satuan</th>
                    {canEdit && <th style={{ ...thStyle('right'), width: 90 }} />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p, i) => {
                    const margin = (p.harga_jual != null && p.harga_modal != null)
                      ? p.harga_jual - p.harga_modal
                      : null
                    return (
                      <tr key={p.id} style={{ borderBottom: i < items.length - 1 ? '0.5px solid #f9f9f9' : 'none' }}>
                        <td style={{ padding: '11px 16px' }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{p.nama}</p>
                          {p.ukuran && <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{p.ukuran}</p>}
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>
                          {fmtRp(p.harga_jual)}
                        </td>
                        {isOwner && (
                          <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 13.5, color: '#3c3c43' }}>
                            {fmtRp(p.harga_modal)}
                          </td>
                        )}
                        {isOwner && (
                          <td style={{
                            padding: '11px 16px', textAlign: 'right', fontSize: 13.5, fontWeight: 600,
                            color: margin === null ? '#8e8e93' : margin >= 0 ? '#30d158' : '#ff3b30',
                          }}>
                            {margin !== null ? fmtRp(margin) : '—'}
                          </td>
                        )}
                        <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#f2f2f7', color: '#8e8e93' }}>
                            {p.satuan || 'PER KG'}
                          </span>
                        </td>
                        {canEdit && (
                          <td style={{ padding: '11px 16px' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => openHistory(p)} title="Riwayat Harga" style={iconBtn('#f0f9ff')}>
                                <Clock size={13} color="#0a84ff" />
                              </button>
                              <button onClick={() => openEdit(p)} style={iconBtn('#f2f2f7')}>
                                <Edit2 size={13} color="#0a84ff" />
                              </button>
                              <button onClick={() => setDeleteConfirm(p.id)} style={iconBtn('#fff1f0')}>
                                <Trash2 size={13} color="#ff3b30" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ══ Add / Edit Modal ══ */}
      {showModal && (
        <div style={overlay}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>
                {editId ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
              <button onClick={() => setShowModal(false)} style={closeBtn}>
                <X size={15} color="#3c3c43" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Kategori</label>
                <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))} style={inputStyle}>
                  {KATEGORI_LIST.map(k => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nama Produk *</label>
                <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="e.g. Cumi Tube India" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Ukuran / Size <span style={{ color: '#c7c7cc' }}>(opsional)</span></label>
                <input value={form.ukuran} onChange={e => setForm(f => ({ ...f, ukuran: e.target.value }))} placeholder="e.g. 5-8, size 4, 21/25" style={inputStyle} />
              </div>

              <div className="rg-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Harga Jual (Rp)</label>
                  <input type="number" value={form.harga_jual} onChange={e => setForm(f => ({ ...f, harga_jual: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Satuan</label>
                  <select value={form.satuan} onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))} style={inputStyle}>
                    {SATUAN_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {isOwner && (
                <div>
                  <label style={{ ...labelStyle, color: '#30d158' }}>
                    Harga Modal (Rp)
                    <span style={{ fontSize: 10.5, color: '#30d158', marginLeft: 6, fontWeight: 400 }}>— hanya terlihat oleh Owner</span>
                  </label>
                  <input type="number" value={form.harga_modal} onChange={e => setForm(f => ({ ...f, harga_modal: e.target.value }))} placeholder="0" style={{ ...inputStyle, borderColor: '#c2f0cc' }} />
                </div>
              )}

              {editId && (
                <p style={{ fontSize: 11.5, color: '#8e8e93', margin: 0, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                  Perubahan harga akan dicatat otomatis di riwayat harga produk.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Batal</button>
              <button onClick={handleSave} disabled={saving || !form.nama.trim()} style={{
                ...btnPrimary,
                background: (saving || !form.nama.trim()) ? '#c7c7cc' : '#0a84ff',
                cursor: (saving || !form.nama.trim()) ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Sync dari DO/GR Modal ══ */}
      {syncOpen && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Sinkron dari DO/GR</h3>
                <p style={{ fontSize: 12.5, color: '#8e8e93', margin: '3px 0 0' }}>Produk yang biasa dipakai di surat jalan / penerimaan barang.</p>
              </div>
              <button onClick={() => setSyncOpen(false)} style={closeBtn}><X size={15} color="#3c3c43" /></button>
            </div>

            {syncLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>Membaca produk dari DO/GR...</div>
            ) : syncItems.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Check size={34} color="#30d158" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Semua produk sudah sinkron.</p>
                <p style={{ fontSize: 12.5, color: '#8e8e93', marginTop: 4 }}>Tidak ada produk baru dari DO/GR yang perlu ditambahkan.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
                  <button onClick={() => setSyncItems(prev => prev.map(s => ({ ...s, selected: true })))} style={{ fontSize: 12, fontWeight: 600, color: '#0a84ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Pilih semua</button>
                  <span style={{ color: '#d1d1d6' }}>·</span>
                  <button onClick={() => setSyncItems(prev => prev.map(s => ({ ...s, selected: false })))} style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Kosongkan</button>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8e8e93' }}>{syncItems.filter(s => s.selected).length} dipilih</span>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
                  {syncItems.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #eef0f2', background: s.selected ? '#f5faff' : '#fafafa' }}>
                      <button onClick={() => toggleSync(i)} style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                        border: s.selected ? 'none' : '1.5px solid #c7c7cc', background: s.selected ? '#0a84ff' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {s.selected && <Check size={14} color="white" strokeWidth={3} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nama}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, flexShrink: 0, background: s.action === 'add' ? 'rgba(48,209,88,0.14)' : 'rgba(255,149,0,0.14)', color: s.action === 'add' ? '#1f9e42' : '#c47600' }}>
                            {s.action === 'add' ? 'BARU' : 'ISI HARGA'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={s.kategori} onChange={e => setSyncField(i, 'kategori', e.target.value)} disabled={s.action === 'update'}
                            style={{ fontSize: 11.5, padding: '4px 6px', borderRadius: 7, border: '1px solid #e5e5ea', background: 'white', color: '#3c3c43' }}>
                            {KATEGORI_LIST.map(k => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
                          </select>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 11.5, color: '#8e8e93' }}>Jual Rp</span>
                            <input type="number" value={s.harga_jual} onChange={e => setSyncField(i, 'harga_jual', e.target.value)} placeholder="0"
                              style={{ width: 90, fontSize: 12.5, padding: '4px 7px', borderRadius: 7, border: '1px solid #e5e5ea', textAlign: 'right' }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#aeb0b5' }}>{s.satuan}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setSyncOpen(false)} style={btnSecondary}>Batal</button>
                  <button onClick={confirmSync} disabled={syncSaving || syncItems.filter(s => s.selected).length === 0}
                    style={{ ...btnPrimary, background: (syncSaving || syncItems.filter(s => s.selected).length === 0) ? '#c7c7cc' : '#0a84ff', cursor: syncSaving ? 'not-allowed' : 'pointer' }}>
                    {syncSaving ? 'Menyimpan...' : `Tambahkan (${syncItems.filter(s => s.selected).length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ Price History Modal ══ */}
      {historyProduct && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Riwayat Harga</h3>
                <p style={{ fontSize: 12.5, color: '#8e8e93', margin: '3px 0 0' }}>{historyProduct.nama}{historyProduct.ukuran ? ` — ${historyProduct.ukuran}` : ''}</p>
              </div>
              <button onClick={() => setHistoryProduct(null)} style={closeBtn}>
                <X size={15} color="#3c3c43" />
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#8e8e93', fontSize: 13 }}>Memuat riwayat...</div>
            ) : priceHistory.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Clock size={32} color="#c7c7cc" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 14, color: '#8e8e93', margin: 0 }}>Belum ada riwayat perubahan harga.</p>
                <p style={{ fontSize: 12, color: '#c7c7cc', marginTop: 4 }}>Riwayat akan tercatat setiap kali harga diubah.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <th style={thStyle('left')}>Tanggal</th>
                      <th style={thStyle('right')}>Harga Jual</th>
                      {isOwner && <th style={thStyle('right')}>Harga Modal</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((h, i) => {
                      const hjChanged = h.harga_jual_old !== h.harga_jual_new
                      const hmChanged = h.harga_modal_old !== h.harga_modal_new
                      return (
                        <tr key={h.id || i} style={{ borderBottom: '0.5px solid #f9f9f9' }}>
                          <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {fmtTime(h.changed_at)}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            {hjChanged ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>{fmtRp(h.harga_jual_old)}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: h.harga_jual_new > h.harga_jual_old ? '#dc2626' : '#16a34a' }}>
                                  {fmtRp(h.harga_jual_new)}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>–</span>
                            )}
                          </td>
                          {isOwner && (
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              {hmChanged ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                  <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>{fmtRp(h.harga_modal_old)}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: h.harga_modal_new > h.harga_modal_old ? '#dc2626' : '#16a34a' }}>
                                    {fmtRp(h.harga_modal_new)}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>–</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={() => setHistoryProduct(null)} style={{ ...btnSecondary, flex: 'none', width: '100%' }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm ══ */}
      {deleteConfirm && (
        <div style={overlay}>
          <div style={{ ...card, maxWidth: 320, textAlign: 'center', padding: '28px 24px' }}>
            <p style={{ fontSize: 38, margin: '0 0 12px' }}>🗑️</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: '0 0 8px' }}>Hapus Produk?</h3>
            <p style={{ fontSize: 13.5, color: '#8e8e93', margin: '0 0 20px' }}>
              Produk akan dihapus permanen dari daftar.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={btnSecondary}>Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ ...btnPrimary, background: '#ff3b30' }}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── shared mini-styles ── */
function thStyle(align) {
  return {
    padding: '10px 16px', textAlign: align,
    fontSize: 11, fontWeight: 600, color: '#8e8e93',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  }
}
function iconBtn(bg) {
  return {
    width: 28, height: 28, borderRadius: 7, border: 'none',
    background: bg, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
const overlay = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const card = {
  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(48px) saturate(2)', WebkitBackdropFilter: 'blur(48px) saturate(2)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.9)',
  padding: 24, width: '100%', maxWidth: 440,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const closeBtn = {
  background: '#f2f2f7', border: 'none', cursor: 'pointer',
  width: 30, height: 30, borderRadius: 99,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const btnSecondary = {
  flex: 1, padding: '11px 0', borderRadius: 11,
  background: '#f2f2f7', border: 'none', fontSize: 14, fontWeight: 600,
  color: '#3c3c43', cursor: 'pointer',
}
const btnPrimary = {
  flex: 2, padding: '11px 0', borderRadius: 11,
  border: 'none', fontSize: 14, fontWeight: 600,
  color: 'white', cursor: 'pointer',
}
