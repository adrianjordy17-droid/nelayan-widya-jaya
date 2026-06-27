import { useState } from 'react'
import { Plus, Search, AlertTriangle, Package, Edit2, Trash2, X, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAuth } from '../contexts/AuthContext'

const INIT_STOCK = [
  { id: 1, name: 'Tongkol',       category: 'Ikan Laut',      qty: 250, unit: 'kg', minQty: 50,  price: 45000,  location: 'Gudang A' },
  { id: 2, name: 'Kakap Merah',   category: 'Ikan Laut',      qty: 80,  unit: 'kg', minQty: 30,  price: 90000,  location: 'Gudang A' },
  { id: 3, name: 'Udang Vaname',  category: 'Udang',          qty: 40,  unit: 'kg', minQty: 50,  price: 120000, location: 'Freezer 1' },
  { id: 4, name: 'Cumi-cumi',     category: 'Cumi',           qty: 35,  unit: 'kg', minQty: 20,  price: 120000, location: 'Freezer 1' },
  { id: 5, name: 'Lele',          category: 'Ikan Air Tawar', qty: 500, unit: 'kg', minQty: 100, price: 25000,  location: 'Kolam 1' },
  { id: 6, name: 'Bandeng',       category: 'Ikan Air Tawar', qty: 15,  unit: 'kg', minQty: 30,  price: 35000,  location: 'Kolam 2' },
  { id: 7, name: 'Udang Windu',   category: 'Udang',          qty: 22,  unit: 'kg', minQty: 30,  price: 150000, location: 'Freezer 2' },
  { id: 8, name: 'Tenggiri',      category: 'Ikan Laut',      qty: 120, unit: 'kg', minQty: 25,  price: 80000,  location: 'Gudang A' },
]

const CATEGORIES = ['Ikan Laut', 'Ikan Air Tawar', 'Udang', 'Cumi', 'Lainnya']
const UNITS      = ['kg', 'ekor', 'ikat', 'box', 'pcs']

function fmt(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition"

function Field({ label, children }) {
  return <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">{label}</label>{children}</div>
}

function StockBar({ qty, minQty }) {
  const pct  = Math.min((qty / Math.max(minQty * 5, qty + 1)) * 100, 100)
  const isLow = qty <= minQty
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${isLow ? 'text-red-600' : 'text-slate-600'}`}>{qty}</span>
    </div>
  )
}

const BLANK = { name: '', category: 'Ikan Laut', qty: '', unit: 'kg', minQty: '', price: '', location: '' }

export default function Stock() {
  const [stock, setStock] = useLocalStorage('nwj_stock', INIT_STOCK)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('semua')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('stock')

  const cats = ['semua', ...CATEGORIES]
  const lowStock = stock.filter(s => s.qty <= s.minQty)
  const filtered = stock.filter(s =>
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === 'semua' || s.category === catFilter)
  )

  function openAdd() { setModal('add'); setForm({ ...BLANK, id: Date.now() }) }
  function openEdit(item) { setModal('edit'); setForm({ ...item }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function save() {
    if (!form.name || form.qty === '' || !form.price) return
    const item = { ...form, qty: +form.qty, minQty: +form.minQty || 0, price: +form.price }
    if (modal === 'edit') {
      setStock(prev => prev.map(s => s.id === form.id ? item : s))
    } else {
      setStock(prev => [...prev, item])
    }
    setModal(null)
    setForm(null)
  }

  function del(id) {
    setStock(prev => prev.filter(s => s.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jenis',    value: stock.length,          color: '#eff6ff', ic: '#2563eb' },
          { label: 'Stok Rendah',   value: lowStock.length,        color: '#fff1f2', ic: '#dc2626' },
          { label: 'Total Qty',     value: stock.reduce((a, s) => a + s.qty, 0).toLocaleString('id') + ' kg', color: '#f0fdf4', ic: '#16a34a' },
          { label: 'Nilai Stok',    value: fmt(stock.reduce((a, s) => a + s.qty * s.price, 0)), color: '#fefce8', ic: '#ca8a04' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center" style={{ background: c.color }}>
              <Package size={16} style={{ color: c.ic }} />
            </div>
            <p className="text-slate-400 text-xs">{c.label}</p>
            <p className="font-bold text-slate-800 text-lg mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-700 text-sm font-semibold">Stok Rendah — Perlu Restok</p>
            <p className="text-red-500 text-xs mt-0.5">{lowStock.map(s => `${s.name} (${s.qty} ${s.unit})`).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border
                ${catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {c === 'semua' ? 'Semua' : c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
          </div>
          {canEdit && (
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={16} /> Tambah Produk
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
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Produk</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Kategori</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide w-40">Stok</th>
                <th className="px-5 py-3 text-right font-semibold tracking-wide">Harga/unit</th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">Lokasi</th>
                {canEdit && <th className="px-5 py-3 text-center font-semibold tracking-wide">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">Tidak ada produk.</td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50/80 transition ${item.qty <= item.minQty ? 'bg-red-50/30' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {item.name}
                    {item.qty <= item.minQty && <span className="ml-2 text-[11px] text-red-500 font-normal bg-red-50 px-1.5 py-0.5 rounded-md">⚠ Rendah</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{item.category}</td>
                  <td className="px-5 py-3.5"><StockBar qty={item.qty} minQty={item.minQty} /></td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-700">{fmt(item.price)}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{item.location}</td>
                  {canEdit && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(item)} title="Edit"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteConfirm(item.id)} title="Hapus"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{modal === 'edit' ? `Edit Produk — ${form.name}` : 'Tambah Produk Baru'}</h3>
              <button onClick={() => { setModal(null); setForm(null) }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nama Produk">
                  <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Tongkol, Udang, ..." className={inputCls} />
                </Field>
                <Field label="Kategori">
                  <select value={form.category} onChange={e => setF('category', e.target.value)} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Stok Saat Ini">
                  <div className="flex gap-2">
                    <input type="number" value={form.qty} onChange={e => setF('qty', e.target.value)} placeholder="0" className={inputCls} />
                    <select value={form.unit} onChange={e => setF('unit', e.target.value)} className={inputCls + ' w-24'}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="Stok Minimum">
                  <input type="number" value={form.minQty} onChange={e => setF('minQty', e.target.value)} placeholder="0" className={inputCls} />
                </Field>
                <Field label="Harga per Unit (Rp)">
                  <input type="number" value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" className={inputCls} />
                </Field>
                <Field label="Lokasi Penyimpanan">
                  <input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="Gudang A, Freezer 1, ..." className={inputCls} />
                </Field>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={save} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                <Check size={15} /> Simpan
              </button>
              <button onClick={() => { setModal(null); setForm(null) }} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Hapus Produk?</h3>
            <p className="text-slate-500 text-sm mb-5">Data produk ini akan dihapus permanen.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => del(deleteConfirm)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">Ya, Hapus</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
