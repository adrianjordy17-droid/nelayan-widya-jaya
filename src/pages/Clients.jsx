import { useState } from 'react'
import { Plus, Search, Phone, MapPin, Star, Edit2, Trash2, X, Check } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAuth } from '../contexts/AuthContext'

const INIT_CLIENTS = [
  { id: 1, name: 'Pasar Ikan Muara Baru', type: 'Pasar',      contact: 'Pak Hendra', phone: '0812-3456-7890', address: 'Muara Baru, Jakarta Utara',    totalOrders: 48, totalSpend: 24000000, rating: 5, active: true },
  { id: 2, name: 'Resto Bahari Indah',    type: 'Restoran',   contact: 'Bu Dewi',    phone: '0821-9876-5432', address: 'Ancol, Jakarta Utara',           totalOrders: 32, totalSpend: 18500000, rating: 5, active: true },
  { id: 3, name: 'Swalayan Maju Jaya',    type: 'Retail',     contact: 'Pak Tono',   phone: '0838-1122-3344', address: 'Sunter, Jakarta Utara',          totalOrders: 24, totalSpend: 12200000, rating: 4, active: true },
  { id: 4, name: 'Bu Sari (Rumahan)',     type: 'Perorangan', contact: 'Bu Sari',    phone: '0857-6655-4433', address: 'Penjaringan, Jakarta Utara',     totalOrders: 18, totalSpend: 4500000,  rating: 4, active: true },
  { id: 5, name: 'Hotel Bintang Laut',   type: 'Hotel',      contact: 'Chef Marco', phone: '021-5544-3321',  address: 'Pluit, Jakarta Utara',           totalOrders: 12, totalSpend: 9800000,  rating: 5, active: false },
  { id: 6, name: 'RM. Pondok Bahari',    type: 'Restoran',   contact: 'Pak Agus',   phone: '0816-2233-4455', address: 'Kelapa Gading, Jakarta Utara',   totalOrders: 8,  totalSpend: 5600000,  rating: 3, active: true },
]

const TYPES = ['Pasar', 'Restoran', 'Retail', 'Hotel', 'Perorangan', 'Instansi', 'Lainnya']
const TYPE_COLOR = {
  Pasar: '#eff6ff:#2563eb', Restoran: '#fff7ed:#ea580c', Retail: '#f5f3ff:#7c3aed',
  Hotel: '#fefce8:#ca8a04', Perorangan: '#f0fdf4:#16a34a', Instansi: '#fdf2f8:#9333ea', Lainnya: '#f8fafc:#64748b',
}

function fmt(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`
  return `Rp ${n.toLocaleString('id')}`
}

function Stars({ n, onSet }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} onClick={() => onSet && onSet(i)}
          className={`${i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} ${onSet ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`} />
      ))}
    </div>
  )
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition"

function Field({ label, children }) {
  return <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">{label}</label>{children}</div>
}

const BLANK = { name: '', type: 'Restoran', contact: '', phone: '', address: '', totalOrders: 0, totalSpend: 0, rating: 4, active: true }

export default function Clients() {
  const [clients, setClients] = useLocalStorage('nwj_clients', INIT_CLIENTS)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('semua')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('clients')

  const allTypes = ['semua', ...TYPES.filter(t => clients.some(c => c.type === t))]
  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q)) &&
      (typeFilter === 'semua' || c.type === typeFilter)
  })

  function openAdd() { setModal('add'); setForm({ ...BLANK, id: Date.now() }) }
  function openEdit(c) { setModal('edit'); setForm({ ...c }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function save() {
    if (!form.name || !form.contact) return
    if (modal === 'edit') {
      setClients(prev => prev.map(c => c.id === form.id ? form : c))
    } else {
      setClients(prev => [...prev, form])
    }
    setModal(null); setForm(null)
  }

  function del(id) {
    setClients(prev => prev.filter(c => c.id !== id))
    setDeleteConfirm(null)
  }

  function toggleActive(id) {
    setClients(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c))
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Klien',  value: clients.length },
          { label: 'Klien Aktif', value: clients.filter(c => c.active).length },
          { label: 'Total Order',  value: clients.reduce((a, c) => a + c.totalOrders, 0) },
          { label: 'Total Omzet', value: fmt(clients.reduce((a, c) => a + c.totalSpend, 0)) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs">{s.label}</p>
            <p className="font-bold text-slate-800 text-xl mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {allTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border
                ${typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {t === 'semua' ? 'Semua' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari klien..."
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-52" />
          </div>
          {canEdit && (
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
              <Plus size={16} /> Tambah Klien
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-slate-400 py-12 text-sm">Tidak ada klien.</p>
        )}
        {filtered.map(client => {
          const [bg, tc] = (TYPE_COLOR[client.type] || '#f8fafc:#64748b').split(':')
          return (
            <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-semibold text-slate-800 text-sm leading-snug">{client.name}</h4>
                  <div className="mt-1"><Stars n={client.rating} /></div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: bg, color: tc }}>{client.type}</span>
                  {!client.active && <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-400">Nonaktif</span>}
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                <div className="flex items-center gap-1.5"><Phone size={11} className="shrink-0" /> {client.contact} · {client.phone}</div>
                <div className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" /> {client.address}</div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-slate-400 text-[11px]">Order</p>
                  <p className="font-bold text-slate-800 text-sm">{client.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-[11px]">Total Belanja</p>
                  <p className="font-bold text-blue-700 text-sm">{fmt(client.totalSpend)}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(client)} title="Edit"
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm(client.id)} title="Hapus"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {modal && form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{modal === 'edit' ? 'Edit Klien' : 'Tambah Klien Baru'}</h3>
              <button onClick={() => { setModal(null); setForm(null) }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Nama Perusahaan / Klien">
                    <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Nama klien..." className={inputCls} />
                  </Field>
                </div>
                <Field label="Tipe">
                  <select value={form.type} onChange={e => setF('type', e.target.value)} className={inputCls}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Nama Kontak">
                  <input value={form.contact} onChange={e => setF('contact', e.target.value)} placeholder="Pak/Bu ..." className={inputCls} />
                </Field>
                <Field label="Nomor HP">
                  <input value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="08xx-xxxx-xxxx" className={inputCls} />
                </Field>
                <Field label="Rating">
                  <div className="flex items-center gap-3 mt-1">
                    <Stars n={form.rating} onSet={v => setF('rating', v)} />
                    <span className="text-sm text-slate-500">{form.rating}/5</span>
                  </div>
                </Field>
                <div className="col-span-2">
                  <Field label="Alamat">
                    <input value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Jl. ..." className={inputCls} />
                  </Field>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div onClick={() => setF('active', !form.active)}
                      className={`w-11 h-6 rounded-full transition cursor-pointer ${form.active ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full m-1 shadow transition-transform ${form.active ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm text-slate-600 font-medium">{form.active ? 'Klien Aktif' : 'Nonaktif'}</span>
                  </label>
                </div>
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
            <h3 className="font-bold text-slate-800 mb-1">Hapus Klien?</h3>
            <p className="text-slate-500 text-sm mb-5">Data klien ini akan dihapus permanen.</p>
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
