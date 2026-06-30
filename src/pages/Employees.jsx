import { useState, useEffect } from 'react'
import { Users, UserCheck, Shield, Briefcase, Plus, Edit2, Trash2, X, Phone, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ROLE_CFG = {
  admin:  { bg: '#eff6ff', text: '#2563eb', label: 'Admin'  },
  staff:  { bg: '#f0fdf4', text: '#16a34a', label: 'Staff'  },
  driver: { bg: '#fff8e1', text: '#d97706', label: 'Driver' },
  gudang: { bg: '#f5f3ff', text: '#7c3aed', label: 'Gudang' },
}

const EMPTY_FORM = { name: '', jabatan: '', role: 'staff', phone: '', active: true }

const inputStyle = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, outline: 'none',
  background: 'white', color: '#0f172a', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }

export default function Employees() {
  const { isRole } = useAuth()
  const canEdit = isRole('admin') || isRole('owner')

  const [employees, setEmployees]               = useState([])
  const [search, setSearch]                     = useState('')
  const [loading, setLoading]                   = useState(true)
  const [showAddModal, setShowAddModal]         = useState(false)
  const [showEditModal, setShowEditModal]       = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [form, setForm]                         = useState(EMPTY_FORM)
  const [editId, setEditId]                     = useState(null)
  const [saving, setSaving]                     = useState(false)
  const [formError, setFormError]               = useState('')

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, name, jabatan, phone, role, active, created_at')
      .order('name')
    setEmployees(data || [])
    setLoading(false)
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.jabatan || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.phone || '').toLowerCase().includes(q)
    )
  })

  const totalAll   = employees.length
  const adminCount = employees.filter(e => e.role === 'admin').length
  const staffCount = employees.filter(e => e.role === 'staff').length
  const aktifCount = employees.filter(e => e.active).length

  const STATS = [
    { label: 'Total Karyawan', value: String(totalAll),   sub: 'terdaftar',      Icon: Users,     iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'Admin',          value: String(adminCount), sub: 'pengguna admin', Icon: Shield,    iconColor: '#7c3aed', iconBg: '#f5f3ff' },
    { label: 'Staff',          value: String(staffCount), sub: 'staff & driver', Icon: Briefcase, iconColor: '#d97706', iconBg: '#fff8e1' },
    { label: 'Aktif',          value: String(aktifCount), sub: 'karyawan aktif', Icon: UserCheck, iconColor: '#16a34a', iconBg: '#f0fdf4' },
  ]

  function openAdd() { setForm(EMPTY_FORM); setFormError(''); setShowAddModal(true) }

  function openEdit(emp) {
    setEditId(emp.id)
    setForm({ name: emp.name || '', jabatan: emp.jabatan || '', role: emp.role || 'staff', phone: emp.phone || '', active: emp.active ?? true })
    setFormError('')
    setShowEditModal(true)
  }

  async function handleAdd() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Nama karyawan wajib diisi.'); return }
    setSaving(true)
    const { error } = await supabase.from('employees').insert({
      name: form.name.trim(), jabatan: form.jabatan.trim() || null,
      role: form.role, phone: form.phone.trim() || null, active: form.active,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowAddModal(false)
    loadEmployees()
  }

  async function handleEdit() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Nama karyawan wajib diisi.'); return }
    setSaving(true)
    const { error } = await supabase.from('employees').update({
      name: form.name.trim(), jabatan: form.jabatan.trim() || null,
      role: form.role, phone: form.phone.trim() || null, active: form.active,
    }).eq('id', editId)
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowEditModal(false)
    setEditId(null)
    loadEmployees()
  }

  async function handleDelete(id) {
    await supabase.from('employees').delete().eq('id', id)
    setShowDeleteConfirm(null)
    loadEmployees()
  }

  function EmployeeModal({ title, onClose, onSave }) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={18} /></button>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{formError}</p>
              </div>
            )}
            <div>
              <label style={labelStyle}>Nama Lengkap *</label>
              <input type="text" placeholder="cth: Budi Santoso" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Jabatan</label>
              <input type="text" placeholder="cth: Kepala Gudang" value={form.jabatan}
                onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="driver">Driver</option>
                <option value="gudang">Gudang</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nomor Telepon</label>
              <input type="tel" placeholder="cth: 08123456789" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10 }}>
              <span style={{ fontSize: 14, color: '#0f172a' }}>Status Aktif</span>
              <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                style={{ width: 44, height: 26, borderRadius: 26, background: form.active ? '#2563eb' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: form.active ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.22)', transition: 'left 0.2s ease' }} />
              </div>
            </div>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
            <button onClick={onSave} disabled={saving}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: saving ? '#93c5fd' : '#2563eb', fontSize: 14, fontWeight: 600, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..."
            style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 36px', fontSize: 13, outline: 'none', background: 'white', width: 240, color: '#0f172a', fontFamily: 'inherit' }} />
        </div>
        {canEdit && (
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={15} /> Tambah Karyawan
          </button>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Nama', 'Jabatan', 'Role', 'Telepon', 'Status', ...(canEdit ? ['Aksi'] : [])].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === (canEdit ? 5 : 4) ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canEdit ? 6 : 5} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {employees.length === 0 ? 'Belum ada karyawan. Klik "Tambah Karyawan" untuk menambahkan.' : 'Tidak ada karyawan yang cocok dengan pencarian.'}
                </td></tr>
              ) : filtered.map((emp, idx) => {
                const rc = ROLE_CFG[emp.role] || ROLE_CFG.staff
                return (
                  <tr key={emp.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${rc.text}, ${rc.text}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                          {(emp.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{emp.jabatan || <span style={{ color: '#cbd5e1' }}>–</span>}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: rc.bg, color: rc.text }}>{rc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {emp.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={12} color="#94a3b8" />
                          <span style={{ fontSize: 13, color: '#64748b' }}>{emp.phone}</span>
                        </div>
                      ) : <span style={{ color: '#cbd5e1' }}>–</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: emp.active ? '#f0fdf4' : '#f8fafc', color: emp.active ? '#16a34a' : '#94a3b8', border: `1px solid ${emp.active ? '#bbf7d0' : '#e2e8f0'}` }}>
                        {emp.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {canEdit && (
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          <button onClick={() => openEdit(emp)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 6, lineHeight: 0 }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(emp.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 6, lineHeight: 0 }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <EmployeeModal title="Tambah Karyawan" onClose={() => { setShowAddModal(false); setFormError('') }} onSave={handleAdd} />}
      {showEditModal && <EmployeeModal title="Edit Karyawan" onClose={() => { setShowEditModal(false); setEditId(null); setFormError('') }} onSave={handleEdit} />}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 300, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '24px 20px 16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={20} color="#dc2626" />
              </div>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>Hapus Karyawan?</p>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0, lineHeight: 1.5 }}>Data karyawan ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ display: 'block', width: '100%', padding: '13px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#dc2626', borderBottom: '1px solid #f1f5f9', fontFamily: 'inherit' }}>Hapus</button>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ display: 'block', width: '100%', padding: '13px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#2563eb', fontFamily: 'inherit' }}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
