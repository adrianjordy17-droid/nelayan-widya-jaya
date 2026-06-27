import { useState } from 'react'
import { Save, User, Building, Bell, Shield, Users, Trash2, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const DEMO_USERS = [
  { id: 1, name: 'Jordy', email: 'jordy@nelayan.id', role: 'owner', active: true },
  { id: 2, name: 'April', email: 'april@nelayan.id', role: 'admin', active: true },
  { id: 3, name: 'Bimbim', email: 'bimbim@nelayan.id', role: 'staff', active: true },
  { id: 4, name: 'Wowo', email: 'wowo@nelayan.id', role: 'staff', active: true },
]

const ROLE_STYLE = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-green-100 text-green-700',
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <Icon size={18} className="text-cyan-600" />
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, type = 'text', defaultValue, disabled }) {
  return (
    <div>
      <label className="block text-slate-600 text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

export default function Settings() {
  const { profile, isRole } = useAuth()
  const [users, setUsers] = useState(DEMO_USERS)
  const [notifSettings, setNotifSettings] = useState({ lowStock: true, newOrder: true, dailyReport: false })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Company profile */}
      <Section icon={Building} title="Profil Perusahaan">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama Perusahaan" defaultValue="UD. Nelayan Widya Jaya" disabled={!isRole('owner')} />
          <Field label="No. Telepon" defaultValue="+62 812-3456-7890" disabled={!isRole('owner')} />
          <Field label="Alamat" defaultValue="Pelabuhan Muara Baru, Jakarta Utara" disabled={!isRole('owner')} />
          <Field label="Email Bisnis" defaultValue="info@nelayan-widyajaya.id" type="email" disabled={!isRole('owner')} />
          <Field label="NPWP" defaultValue="12.345.678.9-012.000" disabled={!isRole('owner')} />
          <Field label="No. NIB" defaultValue="1234567890123" disabled={!isRole('owner')} />
        </div>
        {isRole('owner') && (
          <button onClick={handleSave} className="mt-5 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow">
            <Save size={16} /> {saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
        )}
      </Section>

      {/* Account profile */}
      <Section icon={User} title="Profil Akun Saya">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama Lengkap" defaultValue={profile?.name || ''} />
          <Field label="Email" defaultValue={profile?.email || ''} type="email" />
          <Field label="Jabatan" defaultValue={profile?.role || ''} disabled />
          <Field label="Password Baru" type="password" defaultValue="" />
        </div>
        <button onClick={handleSave} className="mt-5 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow">
          <Save size={16} /> {saved ? 'Tersimpan!' : 'Simpan'}
        </button>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifikasi">
        <div className="space-y-4">
          {[
            { key: 'lowStock', label: 'Peringatan stok rendah', desc: 'Notifikasi ketika stok dibawah minimum' },
            { key: 'newOrder', label: 'Order masuk baru', desc: 'Notifikasi real-time saat ada pesanan baru' },
            { key: 'dailyReport', label: 'Laporan harian', desc: 'Ringkasan operasional dikirim setiap pukul 18.00' },
          ].map(n => (
            <label key={n.key} className="flex items-center justify-between cursor-pointer gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.label}</p>
                <p className="text-xs text-slate-400">{n.desc}</p>
              </div>
              <div
                onClick={() => setNotifSettings(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                className={`w-11 h-6 rounded-full transition cursor-pointer ${notifSettings[n.key] ? 'bg-cyan-500' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full m-1 shadow transition-transform ${notifSettings[n.key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* User management — owner/admin only */}
      {(isRole('owner') || isRole('admin')) && (
        <Section icon={Users} title="Manajemen Pengguna">
          <div className="space-y-3 mb-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[u.role]}`}>{u.role}</span>
                  {isRole('owner') && u.role !== 'owner' && (
                    <button
                      onClick={() => setUsers(prev => prev.filter(x => x.id !== u.id))}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {isRole('owner') && (
            <button className="flex items-center gap-2 border border-dashed border-cyan-300 text-cyan-600 hover:bg-cyan-50 px-4 py-2.5 rounded-xl text-sm font-medium transition w-full justify-center">
              <Plus size={16} /> Undang Pengguna Baru
            </button>
          )}
        </Section>
      )}
    </div>
  )
}
