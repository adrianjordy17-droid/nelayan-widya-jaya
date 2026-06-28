import { useState, useEffect } from 'react'
import { Plus, Search, Phone, MapPin, Star, Edit2, Trash2, X, Check, Users, UserCheck, ShoppingCart, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
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
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={13}
          onClick={() => onSet && onSet(i)}
          style={{
            color: i <= n ? '#f59e0b' : '#e2e8f0',
            fill: i <= n ? '#f59e0b' : '#e2e8f0',
            cursor: onSet ? 'pointer' : 'default',
          }}
        />
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '9px 13px', fontSize: 13, color: '#0f172a',
  background: 'white', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
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

const BLANK = { name: '', type: 'Restoran', contact: '', phone: '', address: '', totalOrders: 0, totalSpend: 0, rating: 4, active: true }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('semua')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { hasPermission, demoMode } = useAuth()
  const canEdit = hasPermission('clients')

  useEffect(() => {
    if (demoMode) { setClients(INIT_CLIENTS); return }
    supabase.from('clients').select('*').order('name')
      .then(({ data }) => setClients(data || []))
  }, [demoMode])

  const allTypes = ['semua', ...TYPES.filter(t => clients.some(c => c.type === t))]
  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return (c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q)) &&
      (typeFilter === 'semua' || c.type === typeFilter)
  })

  function openAdd() { setModal('add'); setForm({ ...BLANK, id: Date.now() }) }
  function openEdit(c) { setModal('edit'); setForm({ ...c }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name || !form.contact) return
    if (modal === 'edit') {
      setClients(prev => prev.map(c => c.id === form.id ? form : c))
      if (!demoMode) await supabase.from('clients').update(form).eq('id', form.id)
    } else {
      setClients(prev => [...prev, form])
      if (!demoMode) await supabase.from('clients').insert(form)
    }
    setModal(null); setForm(null)
  }

  async function del(id) {
    setClients(prev => prev.filter(c => c.id !== id))
    setDeleteConfirm(null)
    if (!demoMode) await supabase.from('clients').delete().eq('id', id)
  }

  async function toggleActive(id) {
    const client = clients.find(c => c.id === id)
    setClients(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c))
    if (!demoMode && client) await supabase.from('clients').update({ active: !client.active }).eq('id', id)
  }

  // Stat calculations
  const totalTransaksi = clients.reduce((a, c) => a + c.totalOrders, 0)
  const totalOmzet = clients.reduce((a, c) => a + c.totalSpend, 0)
  const klienAktif = clients.filter(c => c.active).length

  const STATS = [
    {
      label: 'Total Klien',
      value: String(clients.length),
      sub: 'terdaftar',
      Icon: Users,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      label: 'Klien Aktif',
      value: String(klienAktif),
      sub: 'aktif bertransaksi',
      Icon: UserCheck,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      label: 'Total Transaksi',
      value: String(totalTransaksi),
      sub: 'order dari semua klien',
      Icon: ShoppingCart,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      label: 'Total Omzet',
      value: totalOmzet >= 1000000
        ? `Rp ${(totalOmzet / 1000000).toFixed(1).replace('.0', '')} jt`
        : `Rp ${totalOmzet.toLocaleString('id-ID')}`,
      sub: 'total belanja klien',
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
        {/* Type Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
                background: typeFilter === t ? '#2563eb' : 'white',
                color: typeFilter === t ? 'white' : '#64748b',
                border: typeFilter === t ? '1px solid #2563eb' : '1px solid #e2e8f0',
              }}
            >
              {t === 'semua' ? 'Semua' : t}
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
              placeholder="Cari klien..."
              style={{
                border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 36px',
                fontSize: 13, outline: 'none', background: 'white', width: 200,
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
              <Plus size={15} /> Tambah Klien
            </button>
          )}
        </div>
      </div>

      {/* Client Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {filtered.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '48px 0', fontSize: 13 }}>
            Tidak ada klien.
          </p>
        )}
        {filtered.map(client => {
          const [bg, tc] = (TYPE_COLOR[client.type] || '#f8fafc:#64748b').split(':')
          return (
            <div
              key={client.id}
              style={{
                background: 'white', borderRadius: 14, border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                padding: 18, display: 'flex', flexDirection: 'column', gap: 0,
                opacity: client.active ? 1 : 0.65,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.10)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)'}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                  <h4 style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, margin: '0 0 5px', lineHeight: 1.3 }}>
                    {client.name}
                  </h4>
                  <Stars n={client.rating} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: bg, color: tc,
                  }}>
                    {client.type}
                  </span>
                  {!client.active && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 500,
                      background: '#f1f5f9', color: '#94a3b8',
                    }}>
                      Nonaktif
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                  <Phone size={11} style={{ flexShrink: 0 }} />
                  <span>{client.contact} · {client.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                  <MapPin size={11} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.address}</span>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 12, borderTop: '1px solid #f1f5f9',
              }}>
                <div>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 2px' }}>Order</p>
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5, margin: 0 }}>{client.totalOrders}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 2px' }}>Total Belanja</p>
                  <p style={{ fontWeight: 700, color: '#2563eb', fontSize: 13.5, margin: 0 }}>{fmt(client.totalSpend)}</p>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEdit(client)}
                      title="Edit"
                      style={{
                        padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#d97706'; e.currentTarget.style.background = '#fffbeb' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(client.id)}
                      title="Hapus"
                      style={{
                        padding: 6, background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', borderRadius: 8, display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                    >
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
          <div style={{
            background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
            width: '100%', maxWidth: 520, margin: 'auto',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
            }}>
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>
                {modal === 'edit' ? 'Edit Klien' : 'Tambah Klien Baru'}
              </h3>
              <button
                onClick={() => { setModal(null); setForm(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Nama Perusahaan / Klien">
                  <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Nama klien..." style={inputStyle} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Tipe">
                  <select value={form.type} onChange={e => setF('type', e.target.value)} style={inputStyle}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Nama Kontak">
                  <input value={form.contact} onChange={e => setF('contact', e.target.value)} placeholder="Pak/Bu ..." style={inputStyle} />
                </Field>
                <Field label="Nomor HP">
                  <input value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="08xx-xxxx-xxxx" style={inputStyle} />
                </Field>
                <Field label="Rating">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <Stars n={form.rating} onSet={v => setF('rating', v)} />
                    <span style={{ fontSize: 12.5, color: '#94a3b8' }}>{form.rating}/5</span>
                  </div>
                </Field>
              </div>
              <Field label="Alamat">
                <input value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Jl. ..." style={inputStyle} />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  onClick={() => setF('active', !form.active)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: form.active ? '#2563eb' : '#e2e8f0',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 16, height: 16, background: 'white', borderRadius: '50%',
                    position: 'absolute', top: 4, left: form.active ? 24 : 4,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                  {form.active ? 'Klien Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex', gap: 8, padding: '14px 24px',
              borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px',
            }}>
              <button
                onClick={save}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white',
                  borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Check size={14} /> Simpan
              </button>
              <button
                onClick={() => { setModal(null); setForm(null) }}
                style={{
                  padding: '9px 16px', border: '1.5px solid #e2e8f0', color: '#64748b',
                  borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
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
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px', fontSize: 15 }}>Hapus Klien?</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 24px' }}>
              Data klien ini akan dihapus permanen.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => del(deleteConfirm)}
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
