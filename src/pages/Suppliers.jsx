import { useState, useEffect } from 'react'
import { Plus, Search, X, Check, Phone, MapPin, Building2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }
const GLASS = {
  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

function dbToSupplier(r) {
  return {
    id: r.id, name: r.name, contactPerson: r.contact_person || '',
    phone: r.phone || '', address: r.address || '', email: r.email || '',
    active: r.active !== false,
  }
}

const BLANK = { name: '', contact_person: '', phone: '', address: '', email: '' }

export default function Suppliers() {
  const { isRole } = useAuth()
  const canEdit = isRole('owner') || isRole('admin')

  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch]       = useState('')
  const [form, setForm]           = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    supabase.from('suppliers').select('*').order('name')
      .then(({ data }) => data && setSuppliers(data.map(dbToSupplier)))
  }, [])

  const filtered    = suppliers.filter(s => {
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.contactPerson.toLowerCase().includes(q)
  })
  const activeCount = suppliers.filter(s => s.active).length

  function openCreate() { setForm({ ...BLANK }); setSaved(false) }
  function openEdit(s) {
    setForm({ editId: s.id, name: s.name, contact_person: s.contactPerson, phone: s.phone, address: s.address, email: s.email })
    setSaved(false)
  }

  async function save() {
    if (!form.name?.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      contact_person: form.contact_person?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      email: form.email?.trim() || null,
      active: true,
    }
    try {
      if (form.editId) {
        await supabase.from('suppliers').update(payload).eq('id', form.editId)
        setSuppliers(prev => prev.map(s => s.id === form.editId ? dbToSupplier({ id: form.editId, ...payload }) : s))
      } else {
        const { data } = await supabase.from('suppliers').insert(payload).select().single()
        if (data) setSuppliers(prev => [...prev, dbToSupplier(data)].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); setForm(null) }, 900)
    } catch (err) { alert('Gagal: ' + err.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(s) {
    const active = !s.active
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, active } : x))
    await supabase.from('suppliers').update({ active }).eq('id', s.id)
  }

  return (
    <div style={{ maxWidth: 720, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Supplier</h2>
          <p style={{ fontSize: 13, color: '#8e8e93', margin: '3px 0 0' }}>{activeCount} aktif · {suppliers.length} total</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#007aff', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF }}>
            <Plus size={15} /> Tambah
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} color="#8e8e93" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, telepon, atau PIC..."
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 11, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, ...FF, outline: 'none', background: 'white' }} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ ...GLASS, padding: '48px 24px', textAlign: 'center' }}>
          <Building2 size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Belum ada supplier</p>
          {canEdit && <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>Klik "+ Tambah" untuk menambahkan supplier</p>}
        </div>
      ) : (
        <div style={{ ...GLASS, overflow: 'hidden' }}>
          {filtered.map((s, idx) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderBottom: idx < filtered.length - 1 ? '0.5px solid #f0f0f0' : 'none', opacity: s.active ? 1 : 0.5 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={18} color="#007aff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{s.name}</p>
                  {!s.active && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#f2f2f7', color: '#8e8e93' }}>Nonaktif</span>}
                </div>
                {s.contactPerson && <p style={{ fontSize: 12.5, color: '#8e8e93', margin: '1px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} />{s.contactPerson}</p>}
                {s.phone && <p style={{ fontSize: 12.5, color: '#8e8e93', margin: '1px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{s.phone}</p>}
                {s.address && <p style={{ fontSize: 12, color: '#aeaeb2', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{s.address}</p>}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(s)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)', background: 'white', color: '#3c3c43', cursor: 'pointer', ...FF }}>Edit</button>
                  <button onClick={() => toggleActive(s)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: s.active ? '#fff0f0' : '#f0fdf4', color: s.active ? '#ff3b30' : '#34c759', cursor: 'pointer', ...FF }}>
                    {s.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', ...FF }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}><X size={22} /></button>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{form.editId ? 'Edit Supplier' : 'Tambah Supplier'}</p>
              <button onClick={save} disabled={saving || !form.name?.trim()} style={{ background: 'none', border: 'none', cursor: !form.name?.trim() ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 600, ...FF, color: saved ? '#34c759' : !form.name?.trim() ? '#c7c7cc' : '#007aff', display: 'flex', alignItems: 'center', gap: 4 }}>
                {saved ? <><Check size={15} /> Tersimpan</> : saving ? '...' : 'Simpan'}
              </button>
            </div>
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Nama Supplier *', 'name',           'text',  'PT. Sumber Laut...'],
                ['Contact Person',  'contact_person', 'text',  'Nama PIC'],
                ['No. Telepon',     'phone',          'tel',   '08xx-xxxx-xxxx'],
                ['Email',           'email',          'email', 'email@supplier.com'],
                ['Alamat',          'address',        'text',  'Alamat lengkap supplier'],
              ].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 2px' }}>{label}</p>
                  <input type={type} value={form[key] || ''} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: '1px solid #d1d1d6', fontSize: 14, ...FF, outline: 'none', background: 'white' }} />
                </div>
              ))}
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}
    </div>
  )
}
