import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react'

const KATEGORI_LIST = ['UDANG PANCET', 'UDANG VANAMEI', 'CUMI', 'IKAN', 'OTHER']
const SATUAN_LIST   = ['PER KG', 'PER PACK', 'PER EKOR']

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

  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [activeKat,      setActiveKat]      = useState('ALL')
  const [showModal,      setShowModal]      = useState(false)
  const [form,           setForm]           = useState(EMPTY_FORM)
  const [editId,         setEditId]         = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState(null)

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
      await supabase.from('products').update(payload).eq('id', editId)
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

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
          <button onClick={openAdd} style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '9px 16px', borderRadius: 10,
            background: '#0a84ff', color: 'white', border: 'none',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} strokeWidth={2.5} />
            Tambah Produk
          </button>
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
          background: 'white', borderRadius: 16,
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
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: KATEGORI_COLOR[kat], flexShrink: 0,
              }} />
              <h2 style={{
                fontSize: 13, fontWeight: 700, color: '#1c1c1e', margin: 0,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {KATEGORI_LABEL[kat]}
              </h2>
              <span style={{ fontSize: 11.5, color: '#8e8e93' }}>{items.length} produk</span>
            </div>

            {/* Table */}
            <div style={{
              background: 'white', borderRadius: 14, overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            }}>
              <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #f0f0f0' }}>
                    <th style={thStyle('left')}>Nama / Ukuran</th>
                    <th style={thStyle('right')}>Harga Jual</th>
                    {isOwner && <th style={thStyle('right')}>Modal</th>}
                    {isOwner && (
                      <th style={{ ...thStyle('right'), color: '#30d158' }}>Margin</th>
                    )}
                    <th style={thStyle('center')}>Satuan</th>
                    {canEdit && <th style={{ ...thStyle('right'), width: 72 }} />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p, i) => {
                    const margin = (p.harga_jual != null && p.harga_modal != null)
                      ? p.harga_jual - p.harga_modal
                      : null
                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: i < items.length - 1 ? '0.5px solid #f9f9f9' : 'none' }}
                      >
                        <td style={{ padding: '11px 16px' }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>
                            {p.nama}
                          </p>
                          {p.ukuran && (
                            <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>
                              {p.ukuran}
                            </p>
                          )}
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
                            padding: '11px 16px', textAlign: 'right',
                            fontSize: 13.5, fontWeight: 600,
                            color: margin === null ? '#8e8e93' : margin >= 0 ? '#30d158' : '#ff3b30',
                          }}>
                            {margin !== null ? fmtRp(margin) : '—'}
                          </td>
                        )}
                        <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                            background: '#f2f2f7', color: '#8e8e93',
                          }}>
                            {p.satuan || 'PER KG'}
                          </span>
                        </td>
                        {canEdit && (
                          <td style={{ padding: '11px 16px' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
                <select
                  value={form.kategori}
                  onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                  style={inputStyle}
                >
                  {KATEGORI_LIST.map(k => (
                    <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nama Produk *</label>
                <input
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  placeholder="e.g. Cumi Tube India"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Ukuran / Size <span style={{ color: '#c7c7cc' }}>(opsional)</span></label>
                <input
                  value={form.ukuran}
                  onChange={e => setForm(f => ({ ...f, ukuran: e.target.value }))}
                  placeholder="e.g. 5-8, size 4, 21/25"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={form.harga_jual}
                    onChange={e => setForm(f => ({ ...f, harga_jual: e.target.value }))}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Satuan</label>
                  <select
                    value={form.satuan}
                    onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                    style={inputStyle}
                  >
                    {SATUAN_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {isOwner && (
                <div>
                  <label style={{ ...labelStyle, color: '#30d158' }}>
                    Harga Modal (Rp)
                    <span style={{ fontSize: 10.5, color: '#30d158', marginLeft: 6, fontWeight: 400 }}>
                      — hanya terlihat oleh Owner
                    </span>
                  </label>
                  <input
                    type="number"
                    value={form.harga_modal}
                    onChange={e => setForm(f => ({ ...f, harga_modal: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, borderColor: '#c2f0cc' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nama.trim()}
                style={{
                  ...btnPrimary,
                  background: (saving || !form.nama.trim()) ? '#c7c7cc' : '#0a84ff',
                  cursor: (saving || !form.nama.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah'}
              </button>
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
  background: 'white', borderRadius: 20, padding: 24,
  width: '100%', maxWidth: 440,
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
