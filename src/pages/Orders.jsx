import { useState } from 'react'
import { Plus, Search, Eye, Trash2, X, Edit2, Check } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">{label}</label>{children}</div>
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition"

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border capitalize
                ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {s === 'semua' ? 'Semua' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari order atau klien..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-52" />
          </div>
          {canEdit && (
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={16} /> Tambah Order
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="px-5 py-3 text-left font-semibold tracking-wide">No. Order</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Klien</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Tanggal</th>
                <th className="px-5 py-3 text-right font-semibold tracking-wide">Total</th>
                <th className="px-5 py-3 text-center font-semibold tracking-wide">Status</th>
                <th className="px-5 py-3 text-center font-semibold tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">Tidak ada order.</td></tr>
              )}
              {filtered.map(order => {
                const sc = STATUS_CFG[order.status] || STATUS_CFG.pending
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-700 font-semibold text-xs">{order.id}</td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{order.client}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{order.date}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">{fmt(totalOrder(order.items))}</td>
                    <td className="px-5 py-3.5 text-center">
                      {canEdit ? (
                        <select
                          value={order.status}
                          onChange={e => changeStatus(order.id, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none capitalize"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                          {['pending','proses','selesai','batal'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setView(order)} title="Detail"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Eye size={15} />
                        </button>
                        {canEdit && <>
                          <button onClick={() => openEdit(order)} title="Edit"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => setDeleteConfirm(order.id)} title="Hapus"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
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
        <Modal title={`Detail Order — ${view.id}`} onClose={() => setView(null)}
          footer={<>
            {canEdit && <button onClick={() => { openEdit(view); setView(null) }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              <Edit2 size={15} /> Edit
            </button>}
            <button onClick={() => setView(null)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">Tutup</button>
          </>}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-0.5">Klien</p><p className="font-semibold text-slate-800">{view.client}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-0.5">Tanggal</p><p className="font-semibold">{view.date}</p></div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-0.5">Status</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ background: STATUS_CFG[view.status]?.bg, color: STATUS_CFG[view.status]?.text }}>
                {view.status}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-0.5">Total</p><p className="font-bold text-blue-700">{fmt(totalOrder(view.items))}</p></div>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Item Pesanan</p>
            <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="px-3 py-2 text-left text-slate-500 text-xs font-semibold">Produk</th>
                <th className="px-3 py-2 text-right text-slate-500 text-xs font-semibold">Qty</th>
                <th className="px-3 py-2 text-right text-slate-500 text-xs font-semibold">Harga</th>
                <th className="px-3 py-2 text-right text-slate-500 text-xs font-semibold">Subtotal</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {view.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5">{item.name}</td>
                    <td className="px-3 py-2.5 text-right">{item.qty} {item.unit}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{fmt(item.price)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmt(item.qty * item.price)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-3 py-2.5 text-right text-slate-600 font-semibold text-sm">Total</td>
                  <td className="px-3 py-2.5 text-right font-bold text-blue-700">{fmt(totalOrder(view.items))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {view.catatan && (
            <div><p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wide">Catatan</p>
              <p className="text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-slate-700">{view.catatan}</p>
            </div>
          )}
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {form && (
        <Modal title={editing ? `Edit Order — ${form.id}` : 'Tambah Order Baru'} onClose={() => { setForm(null); setEditing(null) }}
          footer={<>
            <button onClick={saveOrder}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
              <Check size={15} /> Simpan Order
            </button>
            <button onClick={() => { setForm(null); setEditing(null) }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nama Klien">
              <input value={form.client} onChange={e => setField('client', e.target.value)} placeholder="Nama klien / toko" className={inputCls} />
            </Field>
            <Field label="Tanggal">
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={e => setField('status', e.target.value)} className={inputCls}>
              {['pending','proses','selesai','batal'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-600 text-[13px] font-semibold">Item Pesanan</label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                <Plus size={13} /> Tambah Item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2.5">
                  <input value={item.name} onChange={e => setItem(idx, 'name', e.target.value)} placeholder="Nama produk"
                    className="col-span-4 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                  <input type="number" value={item.qty} onChange={e => setItem(idx, 'qty', e.target.value)} placeholder="Qty"
                    className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                  <select value={item.unit} onChange={e => setItem(idx, 'unit', e.target.value)}
                    className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
                    <option>kg</option><option>ekor</option><option>ikat</option><option>box</option><option>pcs</option>
                  </select>
                  <input type="number" value={item.price} onChange={e => setItem(idx, 'price', e.target.value)} placeholder="Harga/unit"
                    className="col-span-3 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                  <button onClick={() => form.items.length > 1 && removeItem(idx)}
                    className="col-span-1 text-slate-300 hover:text-red-500 transition flex justify-center">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-bold text-blue-700">
              Total: {fmt(totalOrder(form.items.map(i => ({ ...i, qty: +i.qty||0, price: +i.price||0 }))))}
            </div>
          </div>

          <Field label="Catatan (opsional)">
            <textarea value={form.catatan} onChange={e => setField('catatan', e.target.value)} rows={2}
              placeholder="Catatan tambahan..."
              className={inputCls + ' resize-none'} />
          </Field>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Hapus Order?</h3>
            <p className="text-slate-500 text-sm mb-5">Order <strong>{deleteConfirm}</strong> akan dihapus permanen.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => deleteOrder(deleteConfirm)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">Ya, Hapus</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
