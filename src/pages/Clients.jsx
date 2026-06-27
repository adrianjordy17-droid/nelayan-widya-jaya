import { useState } from 'react'
import { Plus, Search, Phone, MapPin, Eye, Star } from 'lucide-react'

const DEMO_CLIENTS = [
  { id: 1, name: 'Pasar Ikan Muara Baru', type: 'Pasar', contact: 'Pak Hendra', phone: '0812-3456-7890', address: 'Muara Baru, Jakarta Utara', totalOrders: 48, totalSpend: 24000000, rating: 5, active: true },
  { id: 2, name: 'Resto Bahari Indah', type: 'Restoran', contact: 'Bu Dewi', phone: '0821-9876-5432', address: 'Ancol, Jakarta Utara', totalOrders: 32, totalSpend: 18500000, rating: 5, active: true },
  { id: 3, name: 'Swalayan Maju Jaya', type: 'Retail', contact: 'Pak Tono', phone: '0838-1122-3344', address: 'Sunter, Jakarta Utara', totalOrders: 24, totalSpend: 12200000, rating: 4, active: true },
  { id: 4, name: 'Bu Sari (Rumahan)', type: 'Perorangan', contact: 'Bu Sari', phone: '0857-6655-4433', address: 'Penjaringan, Jakarta Utara', totalOrders: 18, totalSpend: 4500000, rating: 4, active: true },
  { id: 5, name: 'Hotel Bintang Laut', type: 'Hotel', contact: 'Chef Marco', phone: '021-5544-3321', address: 'Pluit, Jakarta Utara', totalOrders: 12, totalSpend: 9800000, rating: 5, active: false },
  { id: 6, name: 'RM. Pondok Bahari', type: 'Restoran', contact: 'Pak Agus', phone: '0816-2233-4455', address: 'Kelapa Gading, Jakarta Utara', totalOrders: 8, totalSpend: 5600000, rating: 3, active: true },
]

const TYPE_STYLE = {
  Pasar: 'bg-blue-100 text-blue-700',
  Restoran: 'bg-orange-100 text-orange-700',
  Retail: 'bg-violet-100 text-violet-700',
  Perorangan: 'bg-green-100 text-green-700',
  Hotel: 'bg-amber-100 text-amber-700',
}

function formatRupiah(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`
  return `Rp ${n.toLocaleString('id')}`
}

function Stars({ n }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </div>
  )
}

export default function Clients() {
  const [clients, setClients] = useState(DEMO_CLIENTS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('semua')

  const types = ['semua', ...new Set(clients.map(c => c.type))]
  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'semua' || c.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Klien', value: clients.length },
          { label: 'Klien Aktif', value: clients.filter(c => c.active).length },
          { label: 'Total Order', value: clients.reduce((a, c) => a + c.totalOrders, 0) },
          { label: 'Total Omzet', value: formatRupiah(clients.reduce((a, c) => a + c.totalSpend, 0)) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs">{s.label}</p>
            <p className="font-bold text-slate-800 text-xl mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition border
                ${typeFilter === t ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}
            >
              {t === 'semua' ? 'Semua' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari klien..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 w-52"
            />
          </div>
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow">
            <Plus size={16} /> Tambah Klien
          </button>
        </div>
      </div>

      {/* Client cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(client => (
          <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm leading-tight">{client.name}</h4>
                <Stars n={client.rating} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[client.type] || 'bg-slate-100 text-slate-600'}`}>
                  {client.type}
                </span>
                {!client.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">Nonaktif</span>}
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
              <div className="flex items-center gap-1.5">
                <Phone size={12} className="shrink-0" /> {client.contact} — {client.phone}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="shrink-0" /> {client.address}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-center">
                <p className="text-slate-400 text-xs">Total Order</p>
                <p className="font-bold text-slate-800">{client.totalOrders}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs">Total Belanja</p>
                <p className="font-bold text-cyan-700">{formatRupiah(client.totalSpend)}</p>
              </div>
              <button className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-800 transition px-3 py-1.5 rounded-lg hover:bg-cyan-50 border border-cyan-200">
                <Eye size={13} /> Detail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
