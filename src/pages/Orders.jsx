import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Printer, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

const DEMO_ORDERS = [
  { id: 'ORD-001', client: 'Pasar Ikan Muara Baru', items: [{ name: 'Tongkol', qty: 50, unit: 'kg', price: 45000 }], total: 2250000, status: 'selesai', date: '2026-06-26', catatan: '' },
  { id: 'ORD-002', client: 'Resto Bahari', items: [{ name: 'Kakap Merah', qty: 20, unit: 'kg', price: 90000 }], total: 1800000, status: 'proses', date: '2026-06-27', catatan: 'Minta segar' },
  { id: 'ORD-003', client: 'Swalayan Maju', items: [{ name: 'Udang Vaname', qty: 10, unit: 'kg', price: 120000 }], total: 1200000, status: 'pending', date: '2026-06-27', catatan: '' },
  { id: 'ORD-004', client: 'Bu Sari', items: [{ name: 'Cumi-cumi', qty: 5, unit: 'kg', price: 120000 }], total: 600000, status: 'selesai', date: '2026-06-25', catatan: '' },
  { id: 'ORD-005', client: 'Pak Budi Nelayan', items: [{ name: 'Lele', qty: 100, unit: 'kg', price: 25000 }], total: 2500000, status: 'selesai', date: '2026-06-24', catatan: 'Bayar COD' },
]

const STATUS_OPTS = ['semua', 'pending', 'proses', 'selesai', 'batal']
const STATUS_STYLE = {
  selesai: 'bg-green-100 text-green-700',
  proses: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  batal: 'bg-red-100 text-red-700',
}

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function OrderModal({ order, onClose }) {
  if (!order) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-bold text-lg text-slate-800">Detail Order — {order.id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Klien</p><p className="font-semibold">{order.client}</p></div>
            <div><p className="text-slate-500">Tanggal</p><p className="font-semibold">{order.date}</p></div>
            <div><p className="text-slate-500">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[order.status]}`}>{order.status}</span>
            </div>
            <div><p className="text-slate-500">Total</p><p className="font-bold text-cyan-700">{formatRupiah(order.total)}</p></div>
          </div>
          <div>
            <p className="text-slate-500 text-sm mb-2">Item Pesanan</p>
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="px-3 py-2 text-left text-slate-500 font-medium">Produk</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Qty</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Harga</th>
                <th className="px-3 py-2 text-right text-slate-500 font-medium">Subtotal</th>
              </tr></thead>
              <tbody className="divide-y">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2 text-right">{item.qty} {item.unit}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(item.price)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatRupiah(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.catatan && <div><p className="text-slate-500 text-sm">Catatan</p><p className="text-sm mt-1 bg-slate-50 rounded-lg px-3 py-2">{order.catatan}</p></div>}
        </div>
        <div className="flex gap-2 p-6 pt-0">
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm hover:bg-cyan-700 transition"><Printer size={16} /> Cetak</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">Tutup</button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState(DEMO_ORDERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [selected, setSelected] = useState(null)
  const { hasPermission } = useAuth()

  const filtered = orders.filter(o => {
    const matchSearch = o.client.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'semua' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition border
                ${statusFilter === s ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}
            >
              {s === 'semua' ? 'Semua' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari order..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-48"
            />
          </div>
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow">
            <Plus size={16} /> Tambah Order
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-5 py-3 text-left font-medium">ID</th>
                <th className="px-5 py-3 text-left font-medium">Klien</th>
                <th className="px-5 py-3 text-left font-medium">Tanggal</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-center font-medium">Status</th>
                <th className="px-5 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Tidak ada order ditemukan.</td></tr>
              )}
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">{order.id}</td>
                  <td className="px-5 py-3.5 text-slate-800">{order.client}</td>
                  <td className="px-5 py-3.5 text-slate-500">{order.date}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{formatRupiah(order.total)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[order.status]}`}>{order.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => setSelected(order)} className="p-1.5 text-slate-400 hover:text-cyan-600 transition rounded-lg hover:bg-cyan-50">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderModal order={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
