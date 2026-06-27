import { useState } from 'react'
import { Plus, Search, AlertTriangle, TrendingDown, Package, Edit2, X, Check } from 'lucide-react'

const DEMO_STOCK = [
  { id: 1, name: 'Tongkol', category: 'Ikan Laut', qty: 250, unit: 'kg', minQty: 50, price: 45000, location: 'Gudang A', updatedAt: '2026-06-27' },
  { id: 2, name: 'Kakap Merah', category: 'Ikan Laut', qty: 80, unit: 'kg', minQty: 30, price: 90000, location: 'Gudang A', updatedAt: '2026-06-26' },
  { id: 3, name: 'Udang Vaname', category: 'Udang', qty: 40, unit: 'kg', minQty: 50, price: 120000, location: 'Freezer 1', updatedAt: '2026-06-27' },
  { id: 4, name: 'Cumi-cumi', category: 'Cumi', qty: 35, unit: 'kg', minQty: 20, price: 120000, location: 'Freezer 1', updatedAt: '2026-06-25' },
  { id: 5, name: 'Lele', category: 'Ikan Air Tawar', qty: 500, unit: 'kg', minQty: 100, price: 25000, location: 'Kolam 1', updatedAt: '2026-06-27' },
  { id: 6, name: 'Bandeng', category: 'Ikan Air Tawar', qty: 15, unit: 'kg', minQty: 30, price: 35000, location: 'Kolam 2', updatedAt: '2026-06-26' },
  { id: 7, name: 'Udang Windu', category: 'Udang', qty: 22, unit: 'kg', minQty: 30, price: 150000, location: 'Freezer 2', updatedAt: '2026-06-24' },
  { id: 8, name: 'Tenggiri', category: 'Ikan Laut', qty: 120, unit: 'kg', minQty: 25, price: 80000, location: 'Gudang A', updatedAt: '2026-06-23' },
]

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function StockBar({ qty, minQty }) {
  const pct = Math.min((qty / (minQty * 5)) * 100, 100)
  const isLow = qty <= minQty
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${isLow ? 'text-red-600' : 'text-slate-500'}`}>{qty}</span>
    </div>
  )
}

export default function Stock() {
  const [stock, setStock] = useState(DEMO_STOCK)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState(null)
  const [editQty, setEditQty] = useState('')

  const lowStockItems = stock.filter(s => s.qty <= s.minQty)
  const filtered = stock.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  function saveQty(id) {
    setStock(prev => prev.map(s => s.id === id ? { ...s, qty: parseInt(editQty) || s.qty, updatedAt: '2026-06-27' } : s))
    setEditId(null)
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jenis', value: stock.length, icon: Package, color: 'bg-cyan-500' },
          { label: 'Stok Rendah', value: lowStockItems.length, icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Total Qty (kg)', value: stock.reduce((a, s) => a + s.qty, 0).toLocaleString('id'), icon: TrendingDown, color: 'bg-blue-500' },
          { label: 'Nilai Stok', value: formatRupiah(stock.reduce((a, s) => a + s.qty * s.price, 0)), icon: Package, color: 'bg-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`${color} p-2.5 rounded-xl`}><Icon size={18} className="text-white" /></div>
            <div><p className="text-slate-500 text-xs">{label}</p><p className="font-bold text-slate-800">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
            <AlertTriangle size={16} /> Stok Rendah — Perlu Restok Segera
          </div>
          <p className="text-red-600 text-sm">{lowStockItems.map(s => `${s.name} (${s.qty} ${s.unit})`).join(', ')}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3 items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-56"
          />
        </div>
        <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow">
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-5 py-3 text-left font-medium">Produk</th>
                <th className="px-5 py-3 text-left font-medium">Kategori</th>
                <th className="px-5 py-3 text-left font-medium w-40">Stok</th>
                <th className="px-5 py-3 text-right font-medium">Harga/kg</th>
                <th className="px-5 py-3 text-left font-medium">Lokasi</th>
                <th className="px-5 py-3 text-left font-medium">Update</th>
                <th className="px-5 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => (
                <tr key={item.id} className={`hover:bg-slate-50 transition ${item.qty <= item.minQty ? 'bg-red-50/40' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {item.name}
                    {item.qty <= item.minQty && <span className="ml-2 text-xs text-red-500 font-normal">⚠ Rendah</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{item.category}</td>
                  <td className="px-5 py-3.5 w-40">
                    {editId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          className="w-20 border border-cyan-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          autoFocus
                        />
                        <button onClick={() => saveQty(item.id)} className="text-green-600 hover:text-green-700 p-1"><Check size={14} /></button>
                        <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-red-500 p-1"><X size={14} /></button>
                      </div>
                    ) : (
                      <StockBar qty={item.qty} minQty={item.minQty} />
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-700">{formatRupiah(item.price)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{item.location}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{item.updatedAt}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => { setEditId(item.id); setEditQty(String(item.qty)) }}
                      className="p-1.5 text-slate-400 hover:text-cyan-600 transition rounded-lg hover:bg-cyan-50"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
