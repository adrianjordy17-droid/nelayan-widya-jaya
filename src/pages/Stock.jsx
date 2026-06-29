import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, Package, Edit2, Trash2, X, Check, DollarSign, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = ['Ikan Laut', 'Ikan Air Tawar', 'Udang', 'Cumi', 'Lainnya']
const UNITS      = ['kg', 'ekor', 'ikat', 'box', 'pcs']

const KAT_MAP = {
  'UDANG PANCET':  'Udang',
  'UDANG VANAMEI': 'Udang',
  'CUMI':          'Cumi',
  'IKAN':          'Ikan Laut',
  'OTHER':         'Lainnya',
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '9px 13px', fontSize: 13, color: '#0f172a',
  background: 'white', outline: 'none', boxSizing: 'border-box',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }

function StockBar({ qty, minQty }) {
  const pct    = Math.min((qty / Math.max(minQty * 5, qty + 1)) * 100, 100)
  const isLow  = qty <= minQty
  const color  = isLow ? '#f87171' : pct < 50 ? '#fbbf24' : '#34d399'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: 'right', color: isLow ? '#dc2626' : '#475569' }}>
        {qty}
      </span>
    </div>
  )
}

const BLANK = { name: '', category: 'Ikan Laut', qty: '', unit: 'kg', minQty: '', price: '', location: '' }

export default function Stock() {
  const [stock,          setStock]          = useState([])
  const [catalog,        setCatalog]        = useState([])
  const [search,         setSearch]         = useState('')
  const [catFilter,      setCatFilter]      = useState('semua')
  const [modal,          setModal]          = useState(null)
  const [form,           setForm]           = useState(null)
  const [deleteConfirm,  setDeleteConfirm]  = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('stock')

  useEffect(() => {
    supabase.from('stock').select('*').order('name')
      .then(({ data }) => setStock(data || []))
    supabase.from('products').select('*').order('kategori').order('nama')
      .then(({ data }) => setCatalog(data || []))
  }, [])

  const cats     = ['semua', ...CATEGORIES]
  const lowStock = stock.filter(s => s.qty <= s.minQty)
  const filtered = stock.filter(s =>
    (s.name?.toLowerCase().includes(search.toLowerCase()) ||
     s.category?.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === 'semua' || s.category === catFilter)
  )

  function openAdd()       { setModal('add');  setForm({ ...BLANK }) }
  function openEdit(item)  { setModal('edit'); setForm({ ...item }) }
  function setF(k, v)      { setForm(f => ({ ...f, [k]: v })) }

  function pickFromCatalog(productId) {
    if (!productId) return
    const p = catalog.find(c => c.id === productId)
    if (!p) return
    const label = p.ukuran ? `${p.nama} ${p.ukuran}` : p.nama
    setForm(f => ({
      ...f,
      name:     label,
      category: KAT_MAP[p.kategori] || 'Lainnya',
      price:    p.harga_jual ?? f.price,
    }))
  }

  async function save() {
    if (!form.name || form.qty === '' || !form.price) return
    const item = { ...form, qty: +form.qty, minQty: +form.minQty || 0, price: +form.price }
    if (modal === 'edit') {
      setStock(prev => prev.map(s => s.id === form.id ? item : s))
      await supabase.from('stock').update(item).eq('id', form.id)
    } else {
      const { data } = await supabase.from('stock').insert(item).select().single()
      setStock(prev => [...prev, data || item])
    }
    setModal(null)
    setForm(null)
  }

  async function del(id) {
    setStock(prev => prev.filter(s => s.id !== id))
    setDeleteConfirm(null)
    await supabase.from('stock').delete().eq('id', id)
  }

  const totalNilai = stock.reduce((a, s) => a + (s.qty * s.price), 0)
  const uniqueCats = new Set(stock.map(s => s.category)).size

  const STATS = [
    { label: 'Total Produk', value: stock.length,    sub: 'jenis produk',  Icon: Package,       iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'Stok Kritis',  value: lowStock.length, sub: 'perlu restok',  Icon: AlertTriangle, iconColor: '#dc2626', iconBg: '#fef2f2' },
    { label: 'Nilai Stok',   value: fmt(totalNilai), sub: 'estimasi total', Icon: DollarSign,    iconColor: '#16a34a', iconBg: '#f0fdf4' },
    { label: 'Kategori',     value: uniqueCats,      sub: 'jenis kategori', Icon: Tag,           iconColor: '#d97706', iconBg: '#fffbeb' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0 }}>{label}</p>
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

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 18px' }}>
          <AlertTriangle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 2px' }}>
              Peringatan Stok Kritis — {lowStock.length} produk perlu restok
            </p>
            <p style={{ fontSize: 11.5, color: '#b45309', margin: 0 }}>
              {lowStock.map(s => `${s.name} (${s.qty} ${s.unit})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              border: catFilter === c ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: catFilter === c ? '#2563eb' : 'white',
              color: catFilter === c ? 'white' : '#64748b',
              transition: 'all 0.15s',
            }}>
              {c === 'semua' ? 'Semua' : c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk..."
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 32px', fontSize: 13, outline: 'none', width: 200, background: 'white', color: '#0f172a' }}
            />
          </div>
          {canEdit && (
            <button onClick={openAdd} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: 'white', borderRadius: 10, padding: '9px 16px',
              fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            }}>
              <Plus size={15} /> Tambah Stok
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Produk', 'Stok', 'Min. Stok', 'Harga/kg', 'Lokasi', canEdit ? 'Aksi' : null].filter(Boolean).map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: h === 'Harga/kg' ? 'right' : h === 'Aksi' ? 'center' : 'left',
                    fontSize: 11, fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              )}
              {filtered.map((item, idx) => {
                const isLow = item.qty <= item.minQty
                return (
                  <tr key={item.id}
                    style={{ borderTop: idx > 0 ? '1px solid #f8fafc' : 'none', background: isLow ? '#fffbeb' : 'white', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = isLow ? '#fffbeb' : 'white'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>{item.category}</span>
                        {isLow && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>Kritis</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><StockBar qty={item.qty} minQty={item.minQty} /></td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>{item.minQty} {item.unit}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(item.price)}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{item.location}</td>
                    {canEdit && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button onClick={() => openEdit(item)} title="Edit" style={{ padding: 6, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.color = '#ca8a04' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(item.id)} title="Hapus" style={{ padding: 6, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
                            <Trash2 size={14} />
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

      {/* Add/Edit Modal */}
      {modal && form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)', width: '100%', maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {modal === 'edit' ? `Edit Stok — ${form.name}` : 'Tambah Stok'}
              </h3>
              <button onClick={() => { setModal(null); setForm(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>

              {/* Pilih dari katalog produk */}
              {modal === 'add' && catalog.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: '#0a84ff', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Pilih dari Katalog Produk
                  </label>
                  <select
                    defaultValue=""
                    onChange={e => pickFromCatalog(e.target.value)}
                    style={{ ...selectStyle, borderColor: '#bfdbfe' }}
                  >
                    <option value="">— Pilih produk (opsional) —</option>
                    {['UDANG PANCET','UDANG VANAMEI','CUMI','IKAN','OTHER'].map(kat => {
                      const items = catalog.filter(c => c.kategori === kat)
                      if (!items.length) return null
                      return (
                        <optgroup key={kat} label={kat}>
                          {items.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nama}{p.ukuran ? ` ${p.ukuran}` : ''} — Rp {Number(p.harga_jual || 0).toLocaleString('id-ID')}
                            </option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                </div>
              )}

              <Field label="Nama Produk">
                <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Nama produk..." style={inputStyle} />
              </Field>
              <Field label="Kategori">
                <select value={form.category} onChange={e => setF('category', e.target.value)} style={selectStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Stok Saat Ini">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" value={form.qty} onChange={e => setF('qty', e.target.value)} placeholder="0" style={inputStyle} />
                  <select value={form.unit} onChange={e => setF('unit', e.target.value)} style={{ ...selectStyle, width: 90, flexShrink: 0 }}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Stok Minimum">
                <input type="number" value={form.minQty} onChange={e => setF('minQty', e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
              <Field label="Harga per Unit (Rp)">
                <input type="number" value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
              <Field label="Lokasi Penyimpanan">
                <input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="Gudang A, Freezer 1, ..." style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              <button onClick={save} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', borderRadius: 10, padding: '9px 18px',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>
                <Check size={14} /> Simpan
              </button>
              <button onClick={() => { setModal(null); setForm(null) }} style={{
                padding: '9px 16px', border: '1px solid #e2e8f0', color: '#64748b',
                borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer',
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)', padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Hapus Stok?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Data stok ini akan dihapus permanen.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => del(deleteConfirm)} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Ya, Hapus
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ border: '1px solid #e2e8f0', color: '#64748b', background: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
