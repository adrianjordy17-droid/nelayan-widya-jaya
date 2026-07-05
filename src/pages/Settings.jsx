import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Building2, Bell, Users, Trash2, Plus, Check, X, Edit2,
  MessageSquare, Send, Eye, EyeOff, ChevronRight,
  Phone, MapPin, Mail, Hash, FileText, Clock, Shield, Lock,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { generateDailyReport, sendToWhatsApp } from '../lib/whatsapp'
import { supabase } from '../lib/supabase'
import { notifSupported, checkSubscribed, enablePush, disablePush } from '../lib/notifications'

const INIT_WA_CONFIG = { token: '', target: '', sendTime: '18:00', enabled: false }
const INIT_COMPANY = {
  name: 'UD. Nelayan Widya Jaya',
  phone: '+62 812-3456-7890',
  address: 'Pelabuhan Muara Baru, Jakarta Utara',
  email: 'info@nelayan-widyajaya.id',
  npwp: '12.345.678.9-012.000',
  nib: '1234567890123',
}
const ROLE_CFG = {
  owner: { bg: '#fff8e1', text: '#b45309', label: 'Pemilik' },
  admin: { bg: '#eff6ff', text: '#1d4ed8', label: 'Admin'   },
  staff: { bg: '#f0fdf4', text: '#15803d', label: 'Staff'   },
}

/* ── iOS-style Toggle ── */
function Toggle({ on, onChange, color = '#34c759' }) {
  return (
    <div onClick={onChange} style={{
      width: 51, height: 31, borderRadius: 31,
      background: on ? color : '#e5e5ea',
      cursor: 'pointer', position: 'relative',
      transition: 'background 0.22s ease', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2,
        left: on ? 22 : 2, width: 27, height: 27,
        borderRadius: '50%', background: 'white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
        transition: 'left 0.22s ease',
      }} />
    </div>
  )
}

/* ── Section group ── */
function Group({ label, footer, children }) {
  return (
    <div>
      {label && (
        <p style={{
          fontSize: 12, fontWeight: 600, color: '#6e6e73',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          paddingLeft: 6, marginBottom: 7,
        }}>{label}</p>
      )}
      <div style={{
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden',
      }}>
        {children}
      </div>
      {footer && (
        <p style={{ fontSize: 12, color: '#8e8e93', padding: '6px 6px 0', lineHeight: 1.5 }}>
          {footer}
        </p>
      )}
    </div>
  )
}

/* ── Row with right-aligned input ── */
function InputRow({ icon: Icon, iconBg = '#007aff', label, value, onChange, type = 'text', placeholder, disabled, last, suffix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '11px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(0,0,0,0.07)',
      background: 'transparent',
    }}>
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: disabled ? '#c7c7cc' : iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color="white" strokeWidth={1.9} />
        </div>
      )}
      <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flexShrink: 0, minWidth: 110, fontWeight: 400 }}>
        {label}
      </p>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          style={{
            border: 'none', outline: 'none',
            textAlign: 'right', fontSize: 15,
            color: disabled ? '#c7c7cc' : '#3c3c43',
            background: 'transparent', padding: 0,
            fontFamily: 'inherit', width: '100%', maxWidth: 220,
          }}
        />
        {suffix}
      </div>
    </div>
  )
}

/* ── Row with toggle ── */
function ToggleRow({ icon: Icon, iconBg = '#007aff', label, desc, on, onChange, last, toggleColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '12px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(0,0,0,0.07)',
      background: 'transparent',
    }}>
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color="white" strokeWidth={1.9} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, fontWeight: 400 }}>{label}</p>
        {desc && <p style={{ fontSize: 12.5, color: '#8e8e93', marginTop: 2 }}>{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} color={toggleColor} />
    </div>
  )
}

/* ── Action row (blue tap-able row) ── */
function ActionRow({ icon: Icon, iconBg, label, onClick, disabled, color = '#007aff', last, destructive }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13,
        padding: '12px 16px',
        borderBottom: last ? 'none' : '0.5px solid #f0f0f0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: hover && !disabled ? '#f9f9f9' : 'white',
        transition: 'background 0.1s',
      }}>
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: disabled ? '#e5e5ea' : (iconBg || color),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color="white" strokeWidth={1.9} />
        </div>
      )}
      <p style={{
        fontSize: 15, margin: 0, fontWeight: 400,
        color: disabled ? '#c7c7cc' : destructive ? '#ff3b30' : color,
      }}>{label}</p>
    </div>
  )
}

/* ── Info banner row ── */
function InfoRow({ children, last }) {
  return (
    <div style={{
      padding: '13px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(0,0,0,0.07)',
      background: 'transparent',
    }}>
      {children}
    </div>
  )
}

/* ── Save confirm row ── */
function SaveRow({ onSave, saved, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      padding: '11px 16px',
      borderTop: '0.5px solid rgba(0,0,0,0.07)',
      background: 'transparent',
    }}>
      <button onClick={onSave} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 15, fontWeight: 500,
        color: saved ? '#34c759' : '#007aff',
        padding: 0, display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'inherit',
      }}>
        {saved ? <><Check size={15} /> Tersimpan</> : 'Simpan'}
      </button>
    </div>
  )
}

/* ── Modal (Apple sheet-style) ── */
function Modal({ title, onClose, children, onSave }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#f2f2f7', borderRadius: 16,
        width: '100%', maxWidth: 400,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          background: '#f2f2f7',
          borderBottom: '0.5px solid #d1d1d6',
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, color: '#007aff', padding: 0, fontFamily: 'inherit',
          }}>Batal</button>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{title}</p>
          <button onClick={onSave} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 600, color: '#007aff', padding: 0, fontFamily: 'inherit',
          }}>Simpan</button>
        </div>
        <div style={{ padding: '16px 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, profile, isRole, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany]   = useLocalStorage('nwj_company', INIT_COMPANY)
  const [users, setUsers]       = useState([])
  const [notifs, setNotifs]     = useLocalStorage('nwj_notifs', { lowStock: true, newOrder: true, dailyReport: false })
  const [account, setAccount]   = useState({ name: profile?.name || '', email: profile?.email || '' })
  const [waConfig, setWaConfig] = useLocalStorage('nwj_wa_config', INIT_WA_CONFIG)

  useEffect(() => {
    if (profile) setAccount({ name: profile.name || '', email: profile.email || '' })
  }, [profile])

  useEffect(() => {
    supabase.from('profiles').select('id, name, email, role')
      .order('role')
      .then(({ data, error }) => {
        if (error) console.error('profiles fetch error:', error.message)
        if (data) setUsers(data)
      })
  }, [])

  // Load company settings from DB once profile is available
  useEffect(() => {
    if (profile?.role === 'owner' && profile?.settings?.company) {
      setCompany(c => ({ ...INIT_COMPANY, ...profile.settings.company }))
    }
  }, [profile?.id])

  const [waStatus, setWaStatus]       = useState({ loading: false, msg: '', ok: null })
  const [showToken, setShowToken]     = useState(false)
  const [companySaved, setCompanySaved] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [userModal, setUserModal]     = useState(false)
  const [userForm, setUserForm]       = useState({ name: '', email: '', role: 'staff' })
  const [editUserId, setEditUserId]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError]     = useState('')

  useEffect(() => {
    checkSubscribed().then(setPushEnabled)
  }, [])

  async function handleTogglePush() {
    setPushLoading(true)
    setPushError('')
    try {
      if (pushEnabled) {
        await disablePush()
        setPushEnabled(false)
      } else {
        await enablePush()
        setPushEnabled(true)
      }
    } catch (err) {
      setPushError(err.message)
    } finally {
      setPushLoading(false)
    }
  }

  async function uploadAvatar(file) {
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      await refreshProfile()
    } catch (err) { alert('Gagal upload: ' + err.message) }
    finally { setAvatarUploading(false) }
  }

  async function saveCompany() {
    if (user) {
      try {
        const cur = profile?.settings || {}
        await supabase.from('profiles').update({ settings: { ...cur, company } }).eq('id', user.id)
        await refreshProfile()
      } catch {}
    }
    setCompanySaved(true)
    setTimeout(() => setCompanySaved(false), 2500)
  }

  async function saveAccount() {
    if (user) {
      await supabase.from('profiles').update({ name: account.name, email: account.email }).eq('id', user.id)
    }
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 2500)
  }

  function openEditUser(u) { setUserForm({ name: u.name, email: u.email || '', role: u.role }); setEditUserId(u.id); setUserModal(true) }

  async function saveUser() {
    if (!userForm.name) return
    if (editUserId) {
      const { error } = await supabase.from('profiles').update({
        name: userForm.name, role: userForm.role,
      }).eq('id', editUserId)
      if (!error) setUsers(prev => prev.map(u => u.id === editUserId ? { ...u, name: userForm.name, role: userForm.role } : u))
    }
    setUserModal(false)
  }

  async function delUser(id) {
    await supabase.from('profiles').delete().eq('id', id)
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeleteConfirm(null)
  }

  async function testSendWA() {
    setWaStatus({ loading: true, msg: 'Mengambil data...', ok: null })
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      const [{ data: docs }, { data: products }, { data: attendance }] = await Promise.all([
        supabase.from('documents').select('*').eq('type', 'SO'),
        supabase.from('products').select('nama, qty, min_qty, satuan'),
        supabase.from('attendance').select('name, status').eq('date', todayStr),
      ])
      const ordersWA = (docs || []).map(d => ({
        id: d.number, client: d.client_name, date: d.date, catatan: d.notes || '',
        status: d.status === 'delivered' ? 'selesai' : d.status === 'dispatched' ? 'proses' : d.status === 'cancelled' ? 'batal' : 'pending',
        items: d.items || [],
      }))
      const stockWA = (products || []).map(p => ({ name: p.nama, qty: p.qty || 0, minQty: p.min_qty || 0, unit: p.satuan || 'kg' }))
      const attendWA = (attendance || []).map(a => ({ name: a.name, status: a.status }))
      setWaStatus({ loading: true, msg: 'Mengirim...', ok: null })
      await sendToWhatsApp({ token: waConfig.token, target: waConfig.target, message: generateDailyReport(ordersWA, stockWA, attendWA) })
      setWaStatus({ loading: false, msg: 'Berhasil terkirim!', ok: true })
    } catch (err) {
      setWaStatus({ loading: false, msg: err.message, ok: false })
    }
    setTimeout(() => setWaStatus({ loading: false, msg: '', ok: null }), 5000)
  }

  const roleColor = ROLE_CFG[profile?.role]

  return (
    <div style={{
      maxWidth: 560,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', gap: 32,
    }}>

      {/* ── Profile card (top) ── */}
      <div style={{
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden',
        boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div onClick={() => avatarInputRef.current?.click()} style={{
            width: 60, height: 60, borderRadius: '50%', cursor: 'pointer', overflow: 'hidden',
            background: `linear-gradient(135deg, ${roleColor?.text || '#007aff'}, ${roleColor?.text || '#007aff'}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'white',
            boxShadow: `0 4px 14px ${roleColor?.text || '#007aff'}44`,
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile?.name || 'U').slice(0, 2).toUpperCase()
            }
          </div>
          <div onClick={() => avatarInputRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 20, height: 20, borderRadius: '50%',
            background: '#007aff', border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 10,
          }}>
            {avatarUploading ? '…' : '📷'}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{profile?.name}</p>
          <p style={{ fontSize: 13, color: '#8e8e93', marginTop: 3 }}>{profile?.email}</p>
          <span style={{
            display: 'inline-block', marginTop: 5,
            fontSize: 11.5, fontWeight: 600, padding: '2px 9px',
            borderRadius: 99, letterSpacing: '0.02em',
            background: roleColor?.bg, color: roleColor?.text,
          }}>
            {roleColor?.label || profile?.role}
          </span>
        </div>
      </div>

      {/* ── Profil Akun ── */}
      <Group label="Profil Akun">
        <InputRow icon={User} iconBg="#007aff" label="Nama" value={account.name}
          onChange={e => setAccount(a => ({ ...a, name: e.target.value }))}
          placeholder="Nama lengkap" />
        <InputRow icon={Mail} iconBg="#34aadc" label="Email" type="email" value={account.email}
          onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
          placeholder="email@domain.com" />
        <InputRow icon={Shield} iconBg="#8e8e93" label="Jabatan"
          value={ROLE_CFG[profile?.role]?.label || profile?.role || ''}
          disabled last />
        <SaveRow onSave={saveAccount} saved={accountSaved} />
      </Group>

      {/* ── Profil Perusahaan ── */}
      {isRole('owner') && (
        <Group label="Profil Perusahaan">
          <InputRow icon={Building2} iconBg="#5856d6" label="Nama" value={company.name}
            onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
            disabled={!isRole('owner')} placeholder="Nama perusahaan" />
          <InputRow icon={Phone} iconBg="#34c759" label="Telepon" value={company.phone}
            onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
            disabled={!isRole('owner')} placeholder="+62 ..." />
          <InputRow icon={MapPin} iconBg="#ff3b30" label="Alamat" value={company.address}
            onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
            disabled={!isRole('owner')} placeholder="Alamat usaha" />
          <InputRow icon={Mail} iconBg="#34aadc" label="Email" type="email" value={company.email}
            onChange={e => setCompany(c => ({ ...c, email: e.target.value }))}
            disabled={!isRole('owner')} placeholder="info@perusahaan.id" />
          <InputRow icon={Hash} iconBg="#ff9500" label="NPWP" value={company.npwp}
            onChange={e => setCompany(c => ({ ...c, npwp: e.target.value }))}
            disabled={!isRole('owner')} placeholder="xx.xxx.xxx.x-xxx.xxx" />
          <InputRow icon={FileText} iconBg="#af52de" label="No. NIB" value={company.nib}
            onChange={e => setCompany(c => ({ ...c, nib: e.target.value }))}
            disabled={!isRole('owner')} placeholder="NIB 13 digit" last={!isRole('owner')} />
          {isRole('owner') && <SaveRow onSave={saveCompany} saved={companySaved} />}
        </Group>
      )}

      {/* ── Notifikasi ── */}
      <Group label="Notifikasi">
        <ToggleRow icon={Bell} iconBg="#ff9500" label="Stok Rendah"
          desc="Peringatan saat stok di bawah minimum"
          on={notifs.lowStock} onChange={() => setNotifs(p => ({ ...p, lowStock: !p.lowStock }))} />
        <ToggleRow icon={Bell} iconBg="#007aff" label="Order Masuk Baru"
          desc="Notifikasi real-time saat ada pesanan baru"
          on={notifs.newOrder} onChange={() => setNotifs(p => ({ ...p, newOrder: !p.newOrder }))} />
        <ToggleRow icon={Bell} iconBg="#5856d6" label="Laporan Harian"
          desc="Ringkasan operasional setiap pukul 18.00"
          on={notifs.dailyReport} onChange={() => setNotifs(p => ({ ...p, dailyReport: !p.dailyReport }))}
          last />
      </Group>

      {/* ── Notifikasi HP ── */}
      {(isRole('owner') || isRole('admin')) && (
        <Group
          label="Notifikasi HP"
          footer={
            !notifSupported()
              ? 'Browser ini tidak mendukung push notification. Gunakan Chrome atau Safari di iOS 16.4+.'
              : pushEnabled
              ? 'Aktif — HP ini akan dapat notifikasi saat ada laporan pengiriman masuk.'
              : 'Di iOS: install dulu ke Home Screen, baru aktifkan. Di Android: langsung bisa dari Chrome.'
          }
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 13,
            padding: '12px 16px', background: 'transparent',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: pushEnabled ? '#ff3b30' : '#8e8e93',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.22s',
            }}>
              <Bell size={15} color="white" strokeWidth={1.9} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, fontWeight: 400 }}>
                Laporan Pengiriman
              </p>
              <p style={{ fontSize: 12.5, color: pushEnabled ? '#34c759' : '#8e8e93', marginTop: 2 }}>
                {pushLoading ? 'Memproses...' : pushEnabled ? 'Aktif di perangkat ini' : 'Belum aktif'}
              </p>
            </div>
            {notifSupported() && (
              pushLoading
                ? <div style={{ width: 51, height: 31, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>...</p>
                  </div>
                : <Toggle on={pushEnabled} onChange={handleTogglePush} color="#ff3b30" />
            )}
          </div>
          {pushError && (
            <div style={{
              padding: '10px 16px', borderTop: '0.5px solid #f0f0f0',
              background: '#fff5f5',
            }}>
              <p style={{ fontSize: 13, color: '#ff3b30', margin: 0 }}>{pushError}</p>
            </div>
          )}
        </Group>
      )}

      {/* ── WhatsApp ── */}
      {isRole('owner') && <Group
        label="WhatsApp — Laporan Otomatis"
        footer="Daftar di fonnte.com → sambungkan nomor WA → salin token ke form ini. Browser harus aktif agar laporan otomatis terkirim."
      >
        {/* Token row with eye toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '11px 16px', borderBottom: '0.5px solid #f0f0f0',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: '#25d366',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={15} color="white" strokeWidth={1.9} />
          </div>
          <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flexShrink: 0, minWidth: 80, fontWeight: 400 }}>Token</p>
          <input
            type={showToken ? 'text' : 'password'}
            value={waConfig.token}
            onChange={e => setWaConfig(c => ({ ...c, token: e.target.value }))}
            placeholder="Token fonnte.com"
            style={{
              flex: 1, border: 'none', outline: 'none', textAlign: 'right',
              fontSize: 15, color: '#3c3c43', background: 'transparent',
              padding: 0, fontFamily: 'inherit',
            }}
          />
          <button type="button" onClick={() => setShowToken(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#c7c7cc', padding: 0, display: 'flex',
          }}>
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <InputRow icon={Phone} iconBg="#25d366" label="Nomor WA" value={waConfig.target}
          onChange={e => setWaConfig(c => ({ ...c, target: e.target.value }))}
          placeholder="628xxxxxxxxxx" />

        <InputRow icon={Clock} iconBg="#ff9500" label="Jam Kirim" type="time"
          value={waConfig.sendTime || '18:00'}
          onChange={e => setWaConfig(c => ({ ...c, sendTime: e.target.value }))} />

        <ToggleRow icon={Send} iconBg="#25d366" label="Laporan Otomatis"
          desc={waConfig.enabled ? `Aktif — setiap pukul ${waConfig.sendTime || '18:00'} WIB` : 'Nonaktif'}
          on={waConfig.enabled}
          onChange={() => setWaConfig(c => ({ ...c, enabled: !c.enabled }))}
          toggleColor="#25d366" />

        <ActionRow icon={Send} iconBg="#25d366" label={waStatus.loading ? 'Mengirim...' : 'Test Kirim Laporan Sekarang'}
          onClick={testSendWA}
          disabled={waStatus.loading || !waConfig.token || !waConfig.target}
          color="#25d366" last={!waStatus.msg} />

        {waStatus.msg && (
          <div style={{
            padding: '10px 16px', borderTop: '0.5px solid #f0f0f0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>{waStatus.ok ? '✅' : '❌'}</span>
            <p style={{ fontSize: 13.5, color: waStatus.ok ? '#34c759' : '#ff3b30', margin: 0 }}>
              {waStatus.msg}
            </p>
          </div>
        )}
      </Group>}

      {/* ── Manajemen Pengguna ── */}
      {(isRole('owner') || isRole('admin')) && (
        <Group label="Pengguna">
          {users.map((u, idx) => {
            const rc = ROLE_CFG[u.role] || ROLE_CFG.staff
            const isLast = idx === users.length - 1 && !isRole('owner')
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 13,
                padding: '10px 16px',
                borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${rc.text}, ${rc.text}99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'white',
                }}>
                  {(u.name || '?')[0]}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{u.name}</p>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: '1.5px 7px',
                      borderRadius: 99, background: rc.bg, color: rc.text,
                    }}>
                      {rc.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: '#8e8e93', marginTop: 2 }}>{u.email}</p>
                </div>
                {/* Actions — only owner can edit non-owner users */}
                {isRole('owner') && u.role !== 'owner' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => openEditUser(u)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', padding: 6 }}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setDeleteConfirm(u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30', padding: 6, opacity: 0.7 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {isRole('owner') && (
            <div
              onClick={() => navigate('/dashboard/employees')}
              style={{ padding: '11px 16px', borderTop: '0.5px solid #f0f0f0', background: '#fafafa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, color: '#007aff', margin: 0 }}>Kelola Daftar Karyawan</p>
              <ChevronRight size={16} color="#c7c7cc" />
            </div>
          )}
        </Group>
      )}

      {/* ── Danger zone ── */}
      <Group>
        <ActionRow label="Keluar dari Akun" onClick={signOut} destructive color="#ff3b30" last />
      </Group>

      {/* ────── MODAL: Edit User ────── */}
      {userModal && (
        <Modal title="Edit Pengguna"
          onClose={() => setUserModal(false)} onSave={saveUser}>
          <Group>
            <InputRow icon={User} iconBg="#007aff" label="Nama"
              value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nama lengkap" />
            <InputRow icon={Mail} iconBg="#34aadc" label="Email" type="email"
              value={userForm.email} disabled last={false}
              placeholder="email@nelayan.id" />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 13,
              padding: '11px 16px', background: 'transparent',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: '#ff9500',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={15} color="white" strokeWidth={1.9} />
              </div>
              <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flexShrink: 0, fontWeight: 400, minWidth: 80 }}>Role</p>
              <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                style={{
                  flex: 1, textAlign: 'right', border: 'none', outline: 'none',
                  fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit',
                }}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </Group>
        </Modal>
      )}

      {/* ────── MODAL: Delete Confirm ────── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden',
            width: '100%', maxWidth: 280, textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ padding: '24px 20px 16px' }}>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#1c1c1e', margin: '0 0 6px' }}>
                Hapus Pengguna?
              </p>
              <p style={{ fontSize: 13.5, color: '#8e8e93', margin: 0, lineHeight: 1.5 }}>
                Profil pengguna ini akan dihapus. Akun Supabase Auth tetap ada.
              </p>
            </div>
            <div style={{ borderTop: '0.5px solid #f0f0f0' }}>
              <button onClick={() => delUser(deleteConfirm)} style={{
                display: 'block', width: '100%', padding: '13px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 600, color: '#ff3b30',
                borderBottom: '0.5px solid #f0f0f0', fontFamily: 'inherit',
              }}>
                Hapus
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{
                display: 'block', width: '100%', padding: '13px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: '#007aff', fontFamily: 'inherit',
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
