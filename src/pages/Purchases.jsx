import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Check, ChevronDown, ChevronUp, ShoppingCart, Package, CreditCard, Trash2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }
const GLASS = {
  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

const TYPE_CFG = {
  PO:  { label: 'Purchase Order', color: '#007aff', bg: '#eff6ff', prefix: 'PO',  Icon: ShoppingCart },
  GRP: { label: 'Penerimaan',     color: '#34c759', bg: '#f0fdf4', prefix: 'GRP', Icon: Package },
  AP:  { label: 'Hutang Dagang',  color: '#ff9500', bg: '#fff8e1', prefix: 'AP',  Icon: CreditCard },
}

const STATUS_CFG = {
  draft:     { label: 'Draft',     color: '#8e8e93', bg: '#f2f2f7' },
  confirmed: { label: 'Dikonfirmasi', color: '#007aff', bg: '#eff6ff' },
  cancelled: { label: 'Dibatalkan', color: '#ff3b30', bg: '#fff0f0' },
  received:  { label: 'Diterima',  color: '#34c759', bg: '#f0fdf4' },
  unpaid:    { label: 'Belum Bayar', color: '#ff9500', bg: '#fff8e1' },
  paid:      { label: 'Lunas',     color: '#34c759', bg: '#f0fdf4' },
  overdue:   { label: 'Jatuh Tempo', color: '#ff3b30', bg: '#fff0f0' },
}

function statusesFor(type) {
  if (type === 'PO')  return ['draft', 'confirmed', 'cancelled']
  if (type === 'GRP') return ['draft', 'received']
  if (type === 'AP')  return ['unpaid', 'paid', 'overdue']
  return []
}

function formatRp(n) {
  if (n == null || n === '') return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

function genNumber(type, existing) {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = TYPE_CFG[type].prefix
  const pattern = new RegExp(`^${prefix}-${ym}-(\\d+)$`)
  const max = existing.reduce((m, r) => {
    const match = r.number?.match(pattern)
    return match ? Math.max(m, parseInt(match[1])) : m
  }, 0)
  return `${prefix}-${ym}-${String(max + 1).padStart(3, '0')}`
}

function dbToDoc(r) {
  return {
    id: r.id, number: r.number, type: r.type, date: r.date,
    status: r.status || 'draft', supplierName: r.supplier_name || '',
    supplierAddress: r.supplier_address || '', supplierPhone: r.supplier_phone || '',
    refNumber: r.ref_number || '', items: r.items || [],
    subtotal: r.subtotal, taxPct: r.tax_pct, discount: r.discount, total: r.total,
    dueDate: r.due_date || '', notes: r.notes || '',
    createdByName: r.created_by_name || '', createdAt: r.created_at,
  }
}

const BLANK_PO = () => ({
  type: 'PO', date: new Date().toISOString().slice(0, 10),
  supplierName: '', supplierPhone: '', supplierAddress: '',
  notes: '', items: [], taxPct: 0, discount: 0,
})
const BLANK_GRP = () => ({
  type: 'GRP', date: new Date().toISOString().slice(0, 10),
  supplierName: '', refNumber: '', notes: '', items: [],
})
const BLANK_AP = () => ({
  type: 'AP', date: new Date().toISOString().slice(0, 10),
  supplierName: '', refNumber: '',
  dueDate: '', total: '', notes: '',
})

function blankFor(type) {
  if (type === 'PO')  return BLANK_PO()
  if (type === 'GRP') return BLANK_GRP()
  return BLANK_AP()
}

function blankItem(type) {
  if (type === 'PO')  return { _id: Date.now(), name: '', qty: '', unit: 'kg', hargaBeli: '' }
  if (type === 'GRP') return { _id: Date.now(), name: '', orderedQty: '', receivedQty: '', unit: 'kg', condition: 'baik' }
  return null
}

function calcPO(items, taxPct, discount) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.hargaBeli) || 0), 0)
  const tax = subtotal * ((parseFloat(taxPct) || 0) / 100)
  const disc = parseFloat(discount) || 0
  return { subtotal, tax, total: subtotal + tax - disc }
}

// ─── Item rows ────────────────────────────────────────────────────────────────
function ItemRowPO({ item, onChange, onRemove, isOwner }) {
  const s = { padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d1d6', fontSize: 13, ...FF, outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '1fr 80px 60px 100px 28px' : '1fr 80px 60px 28px', gap: 6, alignItems: 'start' }}>
      <input value={item.name} onChange={e => onChange({ ...item, name: e.target.value })} placeholder="Nama item" style={s} />
      <input value={item.qty} onChange={e => onChange({ ...item, qty: e.target.value })} placeholder="Qty" type="number" min="0" style={s} />
      <input value={item.unit} onChange={e => onChange({ ...item, unit: e.target.value })} placeholder="Sat." style={s} />
      {isOwner && <input value={item.hargaBeli} onChange={e => onChange({ ...item, hargaBeli: e.target.value })} placeholder="Harga beli" type="number" min="0" style={s} />}
      <button onClick={onRemove} style={{ background: '#fff0f0', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginTop: 1 }}><Trash2 size={13} color="#ff3b30" /></button>
    </div>
  )
}

function ItemRowGRP({ item, onChange, onRemove }) {
  const s = { padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d1d6', fontSize: 13, ...FF, outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 55px 80px 28px', gap: 6, alignItems: 'start' }}>
      <input value={item.name} onChange={e => onChange({ ...item, name: e.target.value })} placeholder="Nama item" style={s} />
      <input value={item.orderedQty} onChange={e => onChange({ ...item, orderedQty: e.target.value })} placeholder="Order" type="number" min="0" style={s} />
      <input value={item.receivedQty} onChange={e => onChange({ ...item, receivedQty: e.target.value })} placeholder="Terima" type="number" min="0" style={s} />
      <input value={item.unit} onChange={e => onChange({ ...item, unit: e.target.value })} placeholder="Sat." style={s} />
      <select value={item.condition} onChange={e => onChange({ ...item, condition: e.target.value })} style={{ ...s, paddingRight: 4 }}>
        <option value="baik">Baik</option>
        <option value="cacat">Cacat</option>
        <option value="return">Return</option>
      </select>
      <button onClick={onRemove} style={{ background: '#fff0f0', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginTop: 1 }}><Trash2 size={13} color="#ff3b30" /></button>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function PurchaseModal({ form, setForm, onClose, onSaved, isOwner, allDocs }) {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const { profile } = useAuth()

  const type   = form.type
  const cfg    = TYPE_CFG[type]
  const { subtotal, tax, total: calcTotal } = type === 'PO' ? calcPO(form.items || [], form.taxPct, form.discount) : {}

  function addItem() {
    const item = blankItem(type)
    if (!item) return
    setForm(f => ({ ...f, items: [...(f.items || []), item] }))
  }
  function updateItem(idx, val) { setForm(f => { const items = [...f.items]; items[idx] = val; return { ...f, items } }) }
  function removeItem(idx) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  function field(label, key, type_ = 'text', placeholder = '') {
    return (
      <div key={key}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px 2px' }}>{label}</p>
        <input type={type_} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d1d6', fontSize: 14, ...FF, outline: 'none', background: 'white' }} />
      </div>
    )
  }

  async function save() {
    if (saving) return
    const isNew = !form.editId
    setSaving(true)
    try {
      const number = isNew ? genNumber(type, allDocs) : form.number
      const status = isNew ? (type === 'AP' ? 'unpaid' : 'draft') : form.status

      let t = null, sub = null, disc = null, tpct = null
      if (type === 'PO' && isOwner) { sub = subtotal; tpct = parseFloat(form.taxPct) || 0; disc = parseFloat(form.discount) || 0; t = calcTotal }
      if (type === 'AP' && isOwner) { t = parseFloat(form.total) || null }

      const payload = {
        number, type, status,
        date: form.date,
        supplier_name: form.supplierName?.trim() || null,
        supplier_phone: form.supplierPhone?.trim() || null,
        supplier_address: form.supplierAddress?.trim() || null,
        ref_number: form.refNumber?.trim() || null,
        items: type !== 'AP' ? (form.items || []).map(({ _id, ...rest }) => rest) : [],
        subtotal: sub, tax_pct: tpct, discount: disc, total: t,
        due_date: form.dueDate || null,
        notes: form.notes?.trim() || null,
        created_by_name: profile?.name || null,
      }

      if (form.editId) {
        await supabase.from('purchases').update(payload).eq('id', form.editId)
        onSaved({ id: form.editId, ...payload })
      } else {
        const { data, error } = await supabase.from('purchases').insert(payload).select().single()
        if (error) throw error
        onSaved(data)
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (err) { alert('Gagal: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', ...FF }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}><X size={22} /></button>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{form.editId ? `Edit ${cfg.label}` : `Buat ${cfg.label}`}</p>
          <button onClick={save} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, ...FF, color: saved ? '#34c759' : '#007aff', display: 'flex', alignItems: 'center', gap: 4 }}>
            {saved ? <><Check size={15} /> Tersimpan</> : saving ? '...' : 'Simpan'}
          </button>
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Date + ref */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'AP' ? '1fr 1fr' : '1fr 1fr', gap: 12 }}>
            {field('Tanggal', 'date', 'date')}
            {type === 'AP' && field('Due Date', 'dueDate', 'date')}
            {type !== 'AP' && field('No. Referensi', 'refNumber', 'text', 'opsional')}
          </div>
          {type === 'AP' && field('No. Referensi (PO/GRP)', 'refNumber', 'text', 'opsional')}

          {/* Supplier */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#3c3c43', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Supplier</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {field('Nama Supplier', 'supplierName', 'text', 'Nama supplier')}
              {type === 'PO' && (
                <>
                  {field('Telepon', 'supplierPhone', 'tel', '08xx-xxxx-xxxx')}
                  {field('Alamat', 'supplierAddress', 'text', 'Alamat supplier')}
                </>
              )}
            </div>
          </div>

          {/* Items (PO & GRP) */}
          {type !== 'AP' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#3c3c43', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item</p>
                <button onClick={addItem} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: cfg.bg, color: cfg.color, cursor: 'pointer', fontWeight: 600, ...FF, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} /> Tambah
                </button>
              </div>
              {/* Column headers */}
              {type === 'PO' && (
                <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '1fr 80px 60px 100px 28px' : '1fr 80px 60px 28px', gap: 6, marginBottom: 4 }}>
                  {['Nama Item', 'Qty', 'Satuan', ...(isOwner ? ['Harga Beli'] : []), ''].map((h, i) => (
                    <p key={i} style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>{h}</p>
                  ))}
                </div>
              )}
              {type === 'GRP' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 55px 80px 28px', gap: 6, marginBottom: 4 }}>
                  {['Nama Item', 'Order', 'Terima', 'Sat.', 'Kondisi', ''].map((h, i) => (
                    <p key={i} style={{ fontSize: 10, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>{h}</p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(form.items || []).map((item, idx) =>
                  type === 'PO'
                    ? <ItemRowPO key={item._id || idx} item={item} onChange={v => updateItem(idx, v)} onRemove={() => removeItem(idx)} isOwner={isOwner} />
                    : <ItemRowGRP key={item._id || idx} item={item} onChange={v => updateItem(idx, v)} onRemove={() => removeItem(idx)} />
                )}
              </div>
              {(form.items || []).length === 0 && (
                <p style={{ fontSize: 13, color: '#aeaeb2', textAlign: 'center', margin: '12px 0 4px' }}>Belum ada item</p>
              )}

              {/* PO totals */}
              {type === 'PO' && isOwner && (form.items || []).length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'white', borderRadius: 10, border: '1px solid #e5e5ea' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px', gap: 10, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#8e8e93', margin: '0 0 4px' }}>Pajak (%)</p>
                      <input value={form.taxPct || ''} onChange={e => setForm(f => ({ ...f, taxPct: e.target.value }))} type="number" min="0" max="100" placeholder="0"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d1d6', fontSize: 13, ...FF, outline: 'none' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#8e8e93', margin: '0 0 4px' }}>Diskon (Rp)</p>
                      <input value={form.discount || ''} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} type="number" min="0" placeholder="0"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 8px', borderRadius: 8, border: '1px solid #d1d1d6', fontSize: 13, ...FF, outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 8 }}>
                    {[['Subtotal', subtotal], ['Pajak', tax], ['Diskon', -(parseFloat(form.discount) || 0)]].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <p style={{ fontSize: 12, color: '#6e6e73', margin: 0 }}>{l}</p>
                        <p style={{ fontSize: 12, color: '#3c3c43', margin: 0 }}>{formatRp(Math.abs(v))}</p>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '0.5px solid #e5e5ea' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Total</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#007aff', margin: 0 }}>{formatRp(calcTotal)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AP fields */}
          {type === 'AP' && isOwner && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px 2px' }}>Total Hutang (Rp)</p>
              <input type="number" min="0" value={form.total || ''} onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                placeholder="Nominal hutang"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d1d6', fontSize: 14, ...FF, outline: 'none', background: 'white' }} />
            </div>
          )}

          {/* Notes */}
          {field('Catatan', 'notes', 'text', 'opsional')}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function PurchaseDetail({ doc, onClose, onStatusChange, isOwner, canEdit }) {
  const cfg = TYPE_CFG[doc.type]
  const st  = STATUS_CFG[doc.status] || {}
  const statuses = statusesFor(doc.type)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', ...FF }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}><X size={22} /></button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{doc.number}</p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <div style={{ width: 22 }} />
        </div>

        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Meta */}
          <div style={{ ...GLASS, padding: '14px 16px' }}>
            {[
              ['Tanggal', doc.date],
              ['Supplier', doc.supplierName || '-'],
              doc.supplierPhone ? ['Telepon', doc.supplierPhone] : null,
              doc.refNumber ? ['Referensi', doc.refNumber] : null,
              doc.dueDate ? ['Jatuh Tempo', doc.dueDate] : null,
              doc.createdByName ? ['Dibuat oleh', doc.createdByName] : null,
            ].filter(Boolean).map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 13, color: '#8e8e93', margin: 0 }}>{l}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', margin: 0, textAlign: 'right', maxWidth: '60%' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          {doc.type !== 'AP' && (doc.items || []).length > 0 && (
            <div style={{ ...GLASS, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f0f0f0' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#3c3c43', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item ({doc.items.length})</p>
              </div>
              {doc.items.map((item, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderBottom: idx < doc.items.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{item.name}</p>
                      {doc.type === 'PO' && <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{item.qty} {item.unit}</p>}
                      {doc.type === 'GRP' && (
                        <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>
                          Order: {item.orderedQty} · Terima: {item.receivedQty} {item.unit} · <span style={{ color: item.condition === 'baik' ? '#34c759' : '#ff3b30' }}>{item.condition}</span>
                        </p>
                      )}
                    </div>
                    {doc.type === 'PO' && isOwner && item.hargaBeli && (
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#007aff', margin: 0 }}>{formatRp((parseFloat(item.qty) || 0) * (parseFloat(item.hargaBeli) || 0))}</p>
                    )}
                  </div>
                </div>
              ))}
              {doc.type === 'PO' && isOwner && doc.total != null && (
                <div style={{ padding: '10px 14px', background: '#fafafa', borderTop: '0.5px solid #e5e5ea' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Total</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#007aff', margin: 0 }}>{formatRp(doc.total)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AP total */}
          {doc.type === 'AP' && isOwner && doc.total != null && (
            <div style={{ ...GLASS, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 14, color: '#3c3c43', margin: 0 }}>Total Hutang</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#ff9500', margin: 0 }}>{formatRp(doc.total)}</p>
            </div>
          )}

          {/* Notes */}
          {doc.notes && (
            <div style={{ ...GLASS, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Catatan</p>
              <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>{doc.notes}</p>
            </div>
          )}

          {/* Status change */}
          {canEdit && statuses.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Ubah Status</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {statuses.filter(s => s !== doc.status).map(s => {
                  const sc = STATUS_CFG[s]
                  return (
                    <button key={s} onClick={() => onStatusChange(doc, s)}
                      style={{ fontSize: 13, padding: '7px 14px', borderRadius: 10, border: 'none', background: sc.bg, color: sc.color, cursor: 'pointer', fontWeight: 600, ...FF }}>
                      → {sc.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Purchases() {
  const { isRole, profile } = useAuth()
  const isOwner  = isRole('owner')
  const isAdmin  = isRole('admin')
  const canEdit  = isOwner || isAdmin

  const [tab,    setTab]    = useState('PO')
  const [docs,   setDocs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form,   setForm]   = useState(null)   // null = closed
  const [detail, setDetail] = useState(null)   // doc to show

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('purchases').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    if (data) setDocs(data.map(dbToDoc))
    setLoading(false)
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const tabDocs = docs.filter(d => d.type === tab)
  const filtered = tabDocs.filter(d => {
    const q = search.toLowerCase()
    return !q || d.number.toLowerCase().includes(q) || (d.supplierName || '').toLowerCase().includes(q) || (d.refNumber || '').toLowerCase().includes(q)
  })

  const counts = { PO: docs.filter(d => d.type === 'PO').length, GRP: docs.filter(d => d.type === 'GRP').length, AP: docs.filter(d => d.type === 'AP').length }
  const apUnpaid = docs.filter(d => d.type === 'AP' && (d.status === 'unpaid' || d.status === 'overdue')).length

  function openCreate() {
    setForm({ ...blankFor(tab), items: tab !== 'AP' ? [blankItem(tab)] : undefined })
  }

  function openEdit(doc) {
    setDetail(null)
    const f = {
      editId: doc.id, type: doc.type, number: doc.number, status: doc.status,
      date: doc.date, dueDate: doc.dueDate, supplierName: doc.supplierName,
      supplierPhone: doc.supplierPhone, supplierAddress: doc.supplierAddress,
      refNumber: doc.refNumber, notes: doc.notes,
      items: (doc.items || []).map((it, i) => ({ ...it, _id: i })),
      taxPct: doc.taxPct, discount: doc.discount, total: doc.total,
    }
    setForm(f)
  }

  function handleSaved(raw) {
    const saved = dbToDoc(raw)
    setDocs(prev => {
      const idx = prev.findIndex(d => d.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  async function handleStatusChange(doc, newStatus) {
    setDetail(null)
    await supabase.from('purchases').update({ status: newStatus }).eq('id', doc.id)
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: newStatus } : d))
  }

  const TabBtn = ({ t }) => {
    const cfg = TYPE_CFG[t]
    const isActive = tab === t
    return (
      <button onClick={() => setTab(t)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 18px', borderRadius: 12, border: 'none',
        background: isActive ? cfg.color : 'rgba(0,0,0,0.04)',
        color: isActive ? 'white' : '#6e6e73',
        fontWeight: 600, fontSize: 13, cursor: 'pointer', ...FF,
        transition: 'all 0.15s',
      }}>
        <cfg.Icon size={14} />
        {cfg.label}
        {counts[t] > 0 && (
          <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 99, background: isActive ? 'rgba(255,255,255,0.25)' : '#e5e5ea', color: isActive ? 'white' : '#6e6e73', fontWeight: 700 }}>
            {counts[t]}
          </span>
        )}
        {t === 'AP' && apUnpaid > 0 && !isActive && (
          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 99, background: '#ff3b30', color: 'white', fontWeight: 700 }}>{apUnpaid}</span>
        )}
      </button>
    )
  }

  const cfg = TYPE_CFG[tab]

  return (
    <div style={{ maxWidth: 760, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Pembelian</h2>
          <p style={{ fontSize: 13, color: '#8e8e93', margin: '3px 0 0' }}>Purchase Order · Penerimaan · Hutang Dagang</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: cfg.color, color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF }}>
            <Plus size={15} /> Buat
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TabBtn t="PO" /><TabBtn t="GRP" /><TabBtn t="AP" />
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} color="#8e8e93" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cari nomor, supplier...`}
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 11, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, ...FF, outline: 'none', background: 'white' }} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ ...GLASS, padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: '#8e8e93', fontSize: 14, margin: 0 }}>Memuat...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...GLASS, padding: '48px 24px', textAlign: 'center' }}>
          <cfg.Icon size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Belum ada {cfg.label}</p>
          {canEdit && <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>Klik "+ Buat" untuk membuat dokumen baru</p>}
        </div>
      ) : (
        <div style={{ ...GLASS, overflow: 'hidden' }}>
          {filtered.map((doc, idx) => {
            const st = STATUS_CFG[doc.status] || {}
            return (
              <div key={doc.id} onClick={() => setDetail(doc)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderBottom: idx < filtered.length - 1 ? '0.5px solid #f0f0f0' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={18} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{doc.number}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#8e8e93', margin: 0 }}>
                    {doc.supplierName || <span style={{ color: '#c7c7cc' }}>—</span>} · {doc.date}
                    {doc.type !== 'AP' && ` · ${doc.items?.length || 0} item`}
                    {doc.refNumber ? ` · Ref: ${doc.refNumber}` : ''}
                  </p>
                  {doc.dueDate && doc.type === 'AP' && (
                    <p style={{ fontSize: 11.5, color: doc.status === 'overdue' ? '#ff3b30' : '#aeaeb2', margin: '2px 0 0' }}>Due: {doc.dueDate}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isOwner && doc.total != null
                    ? <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, margin: 0 }}>{formatRp(doc.total)}</p>
                    : doc.type !== 'AP' && <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>{doc.items?.length || 0} item</p>
                  }
                  {canEdit && (
                    <button onClick={e => { e.stopPropagation(); openEdit(doc) }}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, border: '0.5px solid rgba(0,0,0,0.1)', background: 'white', color: '#3c3c43', cursor: 'pointer', ...FF, marginTop: 4 }}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AP summary for owner */}
      {tab === 'AP' && isOwner && docs.filter(d => d.type === 'AP' && (d.status === 'unpaid' || d.status === 'overdue')).length > 0 && (() => {
        const unpaidDocs = docs.filter(d => d.type === 'AP' && (d.status === 'unpaid' || d.status === 'overdue'))
        const totalHutang = unpaidDocs.reduce((s, d) => s + (parseFloat(d.total) || 0), 0)
        return (
          <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>Total Hutang Belum Lunas</p>
              <p style={{ fontSize: 11, color: '#aeaeb2', margin: '2px 0 0' }}>{unpaidDocs.length} dokumen</p>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#ff9500', margin: 0 }}>{formatRp(totalHutang)}</p>
          </div>
        )
      })()}

      {/* Modals */}
      {form && (
        <PurchaseModal
          form={form} setForm={setForm}
          onClose={() => setForm(null)}
          onSaved={raw => { handleSaved(raw); setForm(null) }}
          isOwner={isOwner} allDocs={docs}
        />
      )}
      {detail && (
        <PurchaseDetail
          doc={detail}
          onClose={() => setDetail(null)}
          onStatusChange={handleStatusChange}
          isOwner={isOwner}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
