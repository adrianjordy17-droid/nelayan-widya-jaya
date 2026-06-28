import { useState } from 'react'
import { Plus, Search, Eye, Trash2, X, Edit2, Check, ShoppingBag, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAuth } from '../contexts/AuthContext'

const INIT_ORDERS = [
  { id: 'ORD-001', client: 'Pasar Ikan Muara Baru', date: '2026-06-24', status: 'selesai', catatan: '', items: [{ name: 'Tongkol', qty: 50, unit: 'kg', price: 45000 }] },
  { id: 'ORD-002', client: 'Resto Bahari Indah', date: '2026-06-25', status: 'proses', catatan: 'Minta segar', items: [{ name: 'Kakap Merah', qty: 20, unit: 'kg', price: 90000 }] },
  { id: 'ORD-003', client: 'Swalayan Maju Jaya', date: '2026-06-27', status: 'pending', catatan: '', items: [{ name: 'Udang Vaname', qty: 10, unit: 'kg', price: 120000 }] },
  { id: 'ORD-004', client: 'Bu Sari', date: '2026-06-25', status: 'selesai', catatan: '', items: [{ name: 'Cumi-cumi', qty: 5, unit: 'kg', price: 120000 }] },
  { id: 'ORD-005', client: 'Pak Budi Nelayan', date: '2026-06-24', status: 'selesai', catatan: 'Bayar COD', items: [{ name: 'Lele', qty: 100, unit: 'kg', price: 25000 }] },
]

const STATUS_OPTS = ['semua', 'pending', 'proses', 'selesai', 'batal']
const STATUS_CFG = {
  selesai: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
  proses:  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', dot: '#3b82f6' },
  pending: { bg: '#fefce8', text: '#ca8a04', border: '#fde68a', dot: '#facc15' },
  batal:   { bg: '#fff1f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}
function totalOrder(items) { return items.reduce((a, i) => a + (i.qty * i.price), 0) }
function nextId(orders) {
  const nums = orders.map(o => parseInt(o.id.replace('ORD-', ''), 10)).filter(Boolean)
  return `ORD-${String((Math.max(0, ...nums) + 1)).padStart(3, '0')}`
}

const BLANK_ITEM = { name: '', qty: '', unit: 'kg', price: '' }
const BLANK_ORDER = { client: '', date: new Date().toISOString().slice(0, 10), status: 'pending', catatan: '', items: [{ ...BLANK_ITEM }] }

function Modal({ title, onClose, children, footer }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
        width: '100%', maxWidth: 640, margin: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
        }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
          }}><X size={20} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: 'flex', gap: 8, padding: '14px 24px',
            borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '9px 13px', fontSize: 13, color: '#0f172a',
  background: 'white', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export default function Orders() {
  const [orders, setOrders] = useLocalStorage('nwj_orders', INIT_ORDERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [view, setView] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('orders')

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return (o.client.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)) &&
      (statusFilter === 'semua' || o.status === statusFilter)
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...BLANK_ORDER, id: nextId(orders), items: [{ ...BLANK_ITEM }] })
  }
  function openEdit(order) {
    setEditing(order.id)
    setForm({ ...order, items: order.items.map(i => ({ ...i })) })
  }

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function setItem(idx, k, v) {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [k]: v }
      return { ...f, items }
    })
  }
  function addItem() { setForm(f => ({ ...f, items: [...f.items, { ...BLANK_ITEM }] })) }
  function removeItem(idx) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })) }

  function saveOrder() {
    if (!form.client || !form.date || form.items.some(i => !i.name || !i.qty || !i.price)) return
    const order = { ...form, items: form.items.map(i => ({ ...i, qty: +i.qty, price: +i.price })) }
    if (editing) {
      setOrders(prev => prev.map(o => o.id === editing ? order : o))
    } else {
      setOrders(prev => [order, ...prev])
    }
    setForm(null)
    setEditing(null)
  }

  function deleteOrder(id) {
    setOrders(prev => prev.filter(o => o.id !== id))
    setDeleteConfirm(null)
    setView(null)
  }

  function changeStatus(id, status) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  // Stat calculations
  const thisMonth = new Date().toISOString().slice(0, 7)
  const orderPending = orders.filter(o => o.status === 'pending').length
  const selesaiBulanIni = orders.filter(o => o.status === 'selesai' && (o.date || '').startsWith(thisMonth))
  const omzetBulanIni = selesaiBulanIni.reduce((a, o) => a + totalOrder(o.items), 0)

  const STATS = [
    {
      label: 'Total Order',
      value: String(orders.length),
      sub: 'semua status',
      Icon: ShoppingBag,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      label: 'Pending',
      value: String(orderPending),
      sub: 'menunggu diproses',
      Icon: Clock,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      label: 'Selesai Bulan Ini',
      value: String(selesaiBulanIni.length),
      sub: 'order selesai bulan ini',
      Icon: CheckCircle2,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      label: 'Total Omzet',
      value: omzetBulanIni >= 1000000
        ? `Rp ${(omzetBulanIni / 1000000).toFixed(1).replace('.0', '')} jt`
        : `Rp ${omzetBulanIni.toLocaleString('id-ID')}`,
      sub: 'omzet bulan ini',
      Icon: TrendingUp,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                {label}
              </p>
              <div style={{
                width: 34, height: 34, borderRadius: 9, background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: value.length > 10 ? 18 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', border: 'none', outline: 'none', transition: 'all 0.15s',
                background: statusFilter === s ? '#2563eb' : 'white',
                color: statusFilter === s ? 'white' : '#64748b',
                border: statusFilter === s ? '1px solid #2563eb' : '1px solid #e2e8f0',
                textTransform: 'capitalize',
              }}
            >
              {s === 'semua' ? 'Semua' : s}
            </button>
          ))}
        </div>

        {/* Search + Add */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari order atau klien..."
              style={{
                border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 36px',
                fontSize: 13, outline: 'none', background: 'white', width: 210,
                color: '#0f172a', fontFamily: 'inherit',
              }}
            />
          </div>
          {canEdit && (
            <button
              onClick={openAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white',
                borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Plus size={15} /> Tambah Order
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['No. Order', 'Klien', 'Tanggal', 'Total', 'Status', 'Aksi'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    textAlign: i === 3 ? 'right' : i >= 4 ? 'center' : 'left',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Tidak ada order.
                  </td>
                </tr>
              )}
              {filtered.map((order, idx) => {
                const sc = STATUS_CFG[order.status] || STATUS_CFG.pending
                return (
                  <tr
                    key={order.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 700, fontSize: 12 }}>
                      {order.id}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#0f172a', fontWeight: 500 }}>
                      {order.client}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 12 }}>
                      {order.date}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {fmt(totalOrder(order.items))}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      {canEdit ? (
                        <select
                          value={order.status}
                          onChange={e => changeStatus(order.id, e.target.value)}
                          style={{
                            fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                            border: `1px solid ${sc.border}`, background: sc.bg, color: sc.text,
                            cursor: 'pointer', outline: 'none', textTransform: 'capitalize',
                          }}
                        >
                          {['pending','proses','selesai','batal'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                          background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize', display: 'inline-block',
                        }}>
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => setView(order)}
                          title="Detail"
                          style={{
                            padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                            color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = '#eff6ff' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                        >
                          <Eye size={15} />
                        </button>
                        {canEdit && <>
                          <button
                            onClick={() => openEdit(order)}
                            title="Edit"
                            style={{
                              padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                              color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#d97706'; e.currentTarget.style.background = '#fffbeb' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(order.id)}
                            title="Hapus"
                            style={{
                              padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                              color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Detail Modal */}
      {view && (
        <Modal
          title={`Detail Order — ${view.id}`}
          onClose={() => setView(null)}
          footer={<>
            {canEdit && (
              <button
                onClick={() => { openEdit(view); setView(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white',
                  borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
            <button
              onClick={() => setView(null)}
              style={{
                padding: '9px 16px', border: '1.5px solid #e2e8f0', color: '#64748b',
                borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Tutup
            </button>
          </>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Klien', val: view.client },
              { label: 'Tanggal', val: view.date },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{val}</p>
              </div>
            ))}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</p>
              <span style={{
                fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: STATUS_CFG[view.status]?.bg, color: STATUS_CFG[view.status]?.text,
                border: `1px solid ${STATUS_CFG[view.status]?.border}`, textTransform: 'capitalize',
              }}>
                {view.status}
              </span>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</p>
              <p style={{ fontWeight: 700, color: '#2563eb', margin: 0, fontSize: 13 }}>{fmt(totalOrder(view.items))}</p>
            </div>
          </div>

          <div>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Item Pesanan
            </p>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Produk', 'Qty', 'Harga', 'Subtotal'].map((h, i) => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right',
                        color: '#94a3b8', fontSize: 11, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.items.map((item, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 12px', color: '#0f172a' }}>{item.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{item.qty} {item.unit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{fmt(item.price)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmt(item.qty * item.price)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: 12.5 }}>Total</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmt(totalOrder(view.items))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {view.catatan && (
            <div>
              <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Catatan
              </p>
              <p style={{
                fontSize: 13, background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 10, padding: '10px 14px', color: '#78350f', margin: 0,
              }}>
                {view.catatan}
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {form && (
        <Modal
          title={editing ? `Edit Order — ${form.id}` : 'Tambah Order Baru'}
          onClose={() => { setForm(null); setEditing(null) }}
          footer={<>
            <button
              onClick={saveOrder}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white',
                borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Check size={14} /> Simpan Order
            </button>
            <button
              onClick={() => { setForm(null); setEditing(null) }}
              style={{
                padding: '9px 16px', border: '1.5px solid #e2e8f0', color: '#64748b',
                borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Batal
            </button>
          </>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nama Klien">
              <input value={form.client} onChange={e => setField('client', e.target.value)} placeholder="Nama klien / toko" style={inputStyle} />
            </Field>
            <Field label="Tanggal">
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Status">
            <select value={form.status} onChange={e => setField('status', e.target.value)} style={inputStyle}>
              {['pending','proses','selesai','batal'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Item Pesanan
              </label>
              <button
                onClick={addItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600,
                }}
              >
                <Plus size={13} /> Tambah Item
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '4fr 2fr 2fr 3fr 1fr', gap: 8,
                  alignItems: 'center', background: '#f8fafc', borderRadius: 10, padding: '10px 12px',
                }}>
                  <input value={item.name} onChange={e => setItem(idx, 'name', e.target.value)} placeholder="Nama produk"
                    style={{ ...inputStyle, padding: '7px 10px', fontSize: 12.5 }} />
                  <input type="number" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} placeholder="Qty"
                    style={{ ...inputStyle, padding: '7px 10px', fontSize: 12.5 }} />
                  <select value={item.unit} onChange={e => setItem(idx, 'unit', e.target.value)}
                    style={{ ...inputStyle, padding: '7px 8px', fontSize: 12.5 }}>
                    <option>kg</option><option>ekor</option><option>ikat</option><option>box</option><option>pcs</option>
                  </select>
                  <input type="number" value={item.price} onChange={e => setItem(idx, 'price', e.target.value)} placeholder="Harga/unit"
                    style={{ ...inputStyle, padding: '7px 10px', fontSize: 12.5 }} />
                  <button
                    onClick={() => form.items.length > 1 && removeItem(idx)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
              Total: {fmt(totalOrder(form.items.map(i => ({ ...i, qty: +i.qty||0, price: +i.price||0 }))))}
            </div>
          </div>

          <Field label="Catatan (opsional)">
            <textarea
              value={form.catatan}
              onChange={e => setField('catatan', e.target.value)}
              rows={2}
              placeholder="Catatan tambahan..."
              style={{ ...inputStyle, resize: 'none' }}
            />
          </Field>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
            padding: 32, maxWidth: 360, width: '100%', textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, background: '#fef2f2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px', fontSize: 15 }}>Hapus Order?</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 24px' }}>
              Order <strong style={{ color: '#0f172a' }}>{deleteConfirm}</strong> akan dihapus permanen.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => deleteOrder(deleteConfirm)}
                style={{
                  background: '#dc2626', color: 'white', border: 'none', borderRadius: 10,
                  padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10,
                  padding: '9px 20px', fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
