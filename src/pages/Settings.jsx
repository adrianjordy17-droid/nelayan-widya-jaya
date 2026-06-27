import { useState } from 'react'
import { Save, User, Building, Bell, Users, Trash2, Plus, Check, X, Edit2, MessageSquare, Send, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { generateDailyReport, sendToWhatsApp } from '../lib/whatsapp'

const INIT_WA_CONFIG = { token: '', target: '', sendTime: '18:00', enabled: false }

const INIT_COMPANY = {
  name: 'UD. Nelayan Widya Jaya',
  phone: '+62 812-3456-7890',
  address: 'Pelabuhan Muara Baru, Jakarta Utara',
  email: 'info@nelayan-widyajaya.id',
  npwp: '12.345.678.9-012.000',
  nib: '1234567890123',
}

const INIT_USERS = [
  { id: 1, name: 'Jordy',  email: 'jordy@nelayan.id',  role: 'owner', active: true },
  { id: 2, name: 'April',  email: 'april@nelayan.id',  role: 'admin', active: true },
  { id: 3, name: 'Bimbim', email: 'bimbim@nelayan.id', role: 'staff', active: true },
  { id: 4, name: 'Wowo',   email: 'wowo@nelayan.id',   role: 'staff', active: true },
]

const ROLE_CFG = {
  owner: { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  admin: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  staff: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
}

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { profile, isRole } = useAuth()
  const [company, setCompany]     = useLocalStorage('nwj_company', INIT_COMPANY)
  const [users, setUsers]         = useLocalStorage('nwj_users', INIT_USERS)
  const [notifs, setNotifs]       = useLocalStorage('nwj_notifs', { lowStock: true, newOrder: true, dailyReport: false })
  const [account, setAccount]     = useLocalStorage('nwj_account', { name: profile?.name || '', email: profile?.email || '' })

  const [waConfig, setWaConfig]     = useLocalStorage('nwj_wa_config', INIT_WA_CONFIG)
  const [waStatus, setWaStatus]     = useState({ loading: false, msg: '', ok: null })
  const [showToken, setShowToken]   = useState(false)

  const [companySaved, setCompanySaved] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [userModal, setUserModal] = useState(false)
  const [userForm, setUserForm]   = useState({ name: '', email: '', role: 'staff' })
  const [editUserId, setEditUserId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  function saveCompany() {
    setCompanySaved(true)
    setTimeout(() => setCompanySaved(false), 2000)
  }
  function saveAccount() {
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 2000)
  }

  function openAddUser()   { setUserForm({ name: '', email: '', role: 'staff' }); setEditUserId(null); setUserModal(true) }
  function openEditUser(u) { setUserForm({ name: u.name, email: u.email, role: u.role }); setEditUserId(u.id); setUserModal(true) }

  function saveUser() {
    if (!userForm.name || !userForm.email) return
    if (editUserId) {
      setUsers(prev => prev.map(u => u.id === editUserId ? { ...u, ...userForm } : u))
    } else {
      setUsers(prev => [...prev, { id: Date.now(), ...userForm, active: true }])
    }
    setUserModal(false)
  }

  async function testSendWA() {
    setWaStatus({ loading: true, msg: 'Mengirim...', ok: null })
    try {
      const orders     = JSON.parse(localStorage.getItem('nwj_orders') || '[]')
      const stock      = JSON.parse(localStorage.getItem('nwj_stock') || '[]')
      const attendance = JSON.parse(localStorage.getItem('nwj_attendance') || '[]')
      const message    = generateDailyReport(orders, stock, attendance)
      await sendToWhatsApp({ token: waConfig.token, target: waConfig.target, message })
      setWaStatus({ loading: false, msg: 'Berhasil terkirim!', ok: true })
    } catch (err) {
      setWaStatus({ loading: false, msg: err.message, ok: false })
    }
    setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 5000)
  }

  function delUser(id) {
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeleteConfirm(null)
  }

  function toggleUserActive(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Company */}
      <Section icon={Building} title="Profil Perusahaan">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { k: 'name',    label: 'Nama Perusahaan' },
            { k: 'phone',   label: 'No. Telepon' },
            { k: 'address', label: 'Alamat', col: 2 },
            { k: 'email',   label: 'Email Bisnis', type: 'email' },
            { k: 'npwp',    label: 'NPWP' },
            { k: 'nib',     label: 'No. NIB' },
          ].map(({ k, label, type = 'text', col }) => (
            <div key={k} className={col === 2 ? 'sm:col-span-2' : ''}>
              <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">{label}</label>
              <input type={type} value={company[k] || ''}
                onChange={e => setCompany(c => ({ ...c, [k]: e.target.value }))}
                disabled={!isRole('owner')}
                className={inputCls} />
            </div>
          ))}
        </div>
        {isRole('owner') && (
          <button onClick={saveCompany}
            className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
            {companySaved ? <><Check size={16} /> Tersimpan!</> : <><Save size={16} /> Simpan Perubahan</>}
          </button>
        )}
      </Section>

      {/* Account */}
      <Section icon={User} title="Profil Akun Saya">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Nama Lengkap</label>
            <input value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Email</label>
            <input type="email" value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Jabatan</label>
            <input value={profile?.role || ''} disabled className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Password Baru</label>
            <input type="password" placeholder="Kosongkan jika tidak diubah" className={inputCls} />
          </div>
        </div>
        <button onClick={saveAccount}
          className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          {accountSaved ? <><Check size={16} /> Tersimpan!</> : <><Save size={16} /> Simpan</>}
        </button>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifikasi">
        <div className="space-y-4">
          {[
            { key: 'lowStock',     label: 'Peringatan stok rendah',  desc: 'Notifikasi ketika stok di bawah minimum' },
            { key: 'newOrder',     label: 'Order masuk baru',        desc: 'Notifikasi real-time saat ada pesanan baru' },
            { key: 'dailyReport',  label: 'Laporan harian',          desc: 'Ringkasan operasional setiap pukul 18.00' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between gap-4 py-1">
              <div>
                <p className="text-sm font-semibold text-slate-800">{n.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
              </div>
              <div onClick={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))}
                className={`w-11 h-6 rounded-full transition cursor-pointer shrink-0 ${notifs[n.key] ? 'bg-blue-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full m-1 shadow transition-transform ${notifs[n.key] ? 'translate-x-5' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* WhatsApp */}
      <Section icon={MessageSquare} title="Integrasi WhatsApp — Laporan Otomatis">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
            <strong>Cara setup:</strong> Daftar di <strong>fonnte.com</strong> → sambungkan WA → salin token ke form ini.
            Laporan akan dikirim otomatis setiap hari di jam yang ditentukan (tab browser harus terbuka).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">
                Fonnte API Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={waConfig.token}
                  onChange={e => setWaConfig(c => ({ ...c, token: e.target.value }))}
                  placeholder="Token dari fonnte.com"
                  className={inputCls + ' pr-10'}
                />
                <button type="button" onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">
                Nomor WA Tujuan
              </label>
              <input
                value={waConfig.target}
                onChange={e => setWaConfig(c => ({ ...c, target: e.target.value }))}
                placeholder="6281234567890 (tanpa +)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">
                Jam Kirim Laporan
              </label>
              <input
                type="time"
                value={waConfig.sendTime || '18:00'}
                onChange={e => setWaConfig(c => ({ ...c, sendTime: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-slate-600 text-[13px] font-semibold mb-2">
                Laporan Otomatis
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setWaConfig(c => ({ ...c, enabled: !c.enabled }))}
                  className={`w-11 h-6 rounded-full transition cursor-pointer ${waConfig.enabled ? 'bg-green-500' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full m-1 shadow transition-transform ${waConfig.enabled ? 'translate-x-5' : ''}`} />
                </div>
                <span className={`text-sm font-semibold ${waConfig.enabled ? 'text-green-600' : 'text-slate-400'}`}>
                  {waConfig.enabled ? `Aktif — pukul ${waConfig.sendTime || '18:00'}` : 'Nonaktif'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={testSendWA}
              disabled={waStatus.loading || !waConfig.token || !waConfig.target}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
              <Send size={15} />
              {waStatus.loading ? 'Mengirim...' : 'Test Kirim Laporan Sekarang'}
            </button>
            {waStatus.msg && (
              <span className={`text-sm font-medium ${waStatus.ok ? 'text-green-600' : 'text-red-500'}`}>
                {waStatus.ok ? '✅' : '❌'} {waStatus.msg}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* User management */}
      {(isRole('owner') || isRole('admin')) && (
        <Section icon={Users} title="Manajemen Pengguna">
          <div className="space-y-2.5 mb-4">
            {users.map(u => {
              const rc = ROLE_CFG[u.role] || ROLE_CFG.staff
              return (
                <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: rc.text }}>
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        {!u.active && <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md">Nonaktif</span>}
                      </div>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                      {u.role}
                    </span>
                    {isRole('owner') && u.role !== 'owner' && (
                      <>
                        <button onClick={() => openEditUser(u)} title="Edit"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => toggleUserActive(u.id)} title="Toggle Aktif"
                          className={`p-1.5 rounded-lg transition text-xs font-medium ${u.active ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-blue-500 hover:bg-blue-50'}`}>
                          {u.active ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => setDeleteConfirm(u.id)} title="Hapus"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {isRole('owner') && (
            <button onClick={openAddUser}
              className="flex items-center gap-2 border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition w-full justify-center">
              <Plus size={16} /> Tambah Pengguna Baru
            </button>
          )}
        </Section>
      )}

      {/* User modal */}
      {userModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editUserId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button onClick={() => setUserModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Nama Lengkap</label>
                <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nama lengkap..." />
              </div>
              <div>
                <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="email@nelayan.id" />
              </div>
              <div>
                <label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Role</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
              <button onClick={saveUser} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                <Check size={15} /> Simpan
              </button>
              <button onClick={() => setUserModal(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Hapus Pengguna?</h3>
            <p className="text-slate-500 text-sm mb-5">Akun pengguna ini akan dihapus permanen.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => delUser(deleteConfirm)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">Ya, Hapus</button>
              <button onClick={() => setDeleteConfirm(null)} className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm hover:bg-slate-50 transition">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
