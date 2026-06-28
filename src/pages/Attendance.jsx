import { useState, useEffect, useRef } from 'react'
import { Camera, CheckCircle, Clock, XCircle, Upload, Plus, Edit2, Trash2, X, Check, UserCheck, UserX, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const TODAY = new Date().toISOString().slice(0, 10)

const INIT_LOG = [
  { id: 1, name: 'Bimbim', role: 'staff', type: 'masuk', time: '07:02', date: TODAY, photo: null, status: 'hadir', catatan: '' },
  { id: 2, name: 'Wowo',   role: 'staff', type: 'masuk', time: '07:15', date: TODAY, photo: null, status: 'hadir', catatan: '' },
  { id: 3, name: 'April',  role: 'admin', type: 'masuk', time: '08:30', date: TODAY, photo: null, status: 'hadir', catatan: '' },
]

const STATUS_CFG = {
  hadir: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  telat: { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  absen: { bg: '#fff1f2', text: '#dc2626', border: '#fecaca' },
  izin:  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
}

const TEAM = ['Jordy', 'April', 'Bimbim', 'Wowo']

function timeStatus(time) {
  if (!time || time === '—') return 'absen'
  const h = parseInt(time.split(':')[0], 10)
  return h < 8 ? 'hadir' : 'telat'
}

const inputStyle = {
  width: '100%',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  padding: '9px 13px',
  fontSize: 13,
  color: '#0f172a',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function Attendance() {
  const { profile, hasPermission, demoMode } = useAuth()
  const [log, setLog] = useState([])
  const [selfie, setSelfie] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [dateView, setDateView] = useState(TODAY)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileRef = useRef()
  const canManage = hasPermission('attendance')

  useEffect(() => {
    if (demoMode) { setLog(INIT_LOG); return }
    supabase.from('attendance').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setLog(data || []))
  }, [demoMode])

  const today   = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const nowTime = format(new Date(), 'HH:mm')

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelfie(URL.createObjectURL(file))
  }

  async function submitSelfie() {
    const entry = {
      id: Date.now(),
      name: profile?.name || 'User',
      role: profile?.role || 'staff',
      type: 'masuk',
      time: nowTime,
      date: TODAY,
      photo: selfie,
      status: timeStatus(nowTime),
      catatan: '',
    }
    setLog(prev => [entry, ...prev])
    setSubmitted(true)
    setSelfie(null)
    if (!demoMode) {
      await supabase.from('attendance').insert({ ...entry, photo: null })
    }
  }

  function openAdd() {
    setModal('add')
    setForm({ id: Date.now(), name: TEAM[0], role: 'staff', type: 'masuk', time: '07:00', date: TODAY, photo: null, status: 'hadir', catatan: '' })
  }

  function openEdit(entry) { setModal('edit'); setForm({ ...entry }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name) return
    const entry = { ...form, status: form.status || timeStatus(form.time) }
    if (modal === 'edit') {
      setLog(prev => prev.map(e => e.id === form.id ? entry : e))
      if (!demoMode) await supabase.from('attendance').update(entry).eq('id', form.id)
    } else {
      setLog(prev => [entry, ...prev])
      if (!demoMode) await supabase.from('attendance').insert(entry)
    }
    setModal(null); setForm(null)
  }

  async function del(id) {
    setLog(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
    if (!demoMode) await supabase.from('attendance').delete().eq('id', id)
  }

  const viewLog     = log.filter(e => e.date === dateView)
  const todayLog    = log.filter(e => e.date === TODAY)
  const hadir       = todayLog.filter(e => e.status === 'hadir').length
  const telat       = todayLog.filter(e => e.status === 'telat').length
  const absen       = todayLog.filter(e => e.status === 'absen').length
  const uniqueNames = new Set(log.map(e => e.name)).size

  const alreadyAbsen = log.some(e => e.date === TODAY && e.name === (profile?.name || ''))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selfie Card */}
      <div style={{
        borderRadius: 14,
        padding: '22px 24px',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
        boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Absensi Selfie</h3>
        <p style={{ fontSize: 12.5, color: '#93c5fd', margin: '0 0 18px', textTransform: 'capitalize' }}>
          {today} — {nowTime} WIB
        </p>

        {submitted || alreadyAbsen ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(134,239,172,0.3)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <CheckCircle size={22} color="#86efac" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: 'white', margin: '0 0 2px', fontSize: 14 }}>Absensi sudah tercatat hari ini!</p>
              <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>
                Pukul {log.find(e => e.date === TODAY && e.name === profile?.name)?.time || nowTime} WIB
              </p>
            </div>
          </div>
        ) : (
          <div>
            {selfie ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <img src={selfie} alt="selfie" style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
                <div>
                  <p style={{ fontSize: 13, color: '#bfdbfe', marginBottom: 12 }}>Foto siap. Konfirmasi absensi?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={submitSelfie} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#16a34a', color: 'white', border: 'none',
                      borderRadius: 10, padding: '9px 16px', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer',
                    }}>
                      <CheckCircle size={15} /> Konfirmasi Hadir
                    </button>
                    <button onClick={() => setSelfie(null)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.1)', color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 10, padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                    }}>
                      <XCircle size={15} /> Ulang
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button onClick={() => fileRef.current.click()} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'white', color: '#1e3a8a',
                  border: 'none', borderRadius: 10, padding: '10px 18px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}>
                  <Camera size={17} /> Ambil Foto Selfie
                </button>
                <button onClick={() => fileRef.current.click()} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.12)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                }}>
                  <Upload size={15} /> Upload Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhoto} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Hadir Hari Ini',   value: hadir,        sub: 'tepat waktu',     Icon: UserCheck, iconColor: '#16a34a', iconBg: '#f0fdf4' },
          { label: 'Telat',            value: telat,        sub: 'terlambat masuk', Icon: Clock,     iconColor: '#d97706', iconBg: '#fffbeb' },
          { label: 'Absen',            value: absen,        sub: 'tidak hadir',     Icon: UserX,     iconColor: '#dc2626', iconBg: '#fef2f2' },
          { label: 'Total Karyawan',   value: uniqueNames,  sub: 'terdaftar',       Icon: Users,     iconColor: '#2563eb', iconBg: '#eff6ff' },
        ].map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{
            background: 'white',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Log Table */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}>
        {/* Table Header Bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Log Absensi</p>
            <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>
              {viewLog.length} catatan untuk tanggal yang dipilih
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={dateView}
              onChange={e => setDateView(e.target.value)}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#0f172a', background: 'white' }}
            />
            {canManage && (
              <button onClick={openAdd} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', borderRadius: 10, padding: '9px 16px',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
              }}>
                <Plus size={14} /> Tambah Manual
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Nama', 'Jabatan', 'Jam Masuk', 'Status', 'Catatan', 'Foto', canManage ? 'Aksi' : null].filter(Boolean).map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: h === 'Status' || h === 'Foto' || h === 'Aksi' ? 'center' : 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewLog.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Tidak ada data absensi untuk tanggal ini.
                  </td>
                </tr>
              )}
              {viewLog.map((entry, idx) => {
                const sc = STATUS_CFG[entry.status] || STATUS_CFG.hadir
                return (
                  <tr key={entry.id}
                    style={{ borderTop: idx > 0 ? '1px solid #f8fafc' : 'none', background: 'white', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{entry.name}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>{entry.role}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155' }}>
                        <Clock size={12} color="#94a3b8" /> {entry.time}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                        textTransform: 'capitalize',
                        background: sc.bg,
                        color: sc.text,
                        border: `1px solid ${sc.border}`,
                      }}>
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{entry.catatan || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {entry.photo
                        ? <img src={entry.photo} alt="selfie" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0', display: 'inline-block' }} />
                        : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                      }
                    </td>
                    {canManage && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button onClick={() => openEdit(entry)} title="Edit" style={{
                            padding: '6px', border: 'none', borderRadius: 8, background: 'transparent',
                            cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.color = '#ca8a04' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(entry.id)} title="Hapus" style={{
                            padding: '6px', border: 'none', borderRadius: 8, background: 'transparent',
                            cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
                          >
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

      {/* Add/Edit Modal */}
      {modal && form && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
            width: '100%', maxWidth: 460,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {modal === 'edit' ? 'Edit Absensi' : 'Tambah Absensi Manual'}
              </h3>
              <button onClick={() => { setModal(null); setForm(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Nama</label>
                <select value={form.name} onChange={e => setF('name', e.target.value)} style={inputStyle}>
                  {TEAM.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tanggal</label>
                <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Jam Masuk</label>
                <input type="time" value={form.time} onChange={e => setF('time', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} style={inputStyle}>
                  {['hadir', 'telat', 'absen', 'izin'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Catatan</label>
                <input value={form.catatan} onChange={e => setF('catatan', e.target.value)} placeholder="Izin sakit, terlambat, ..." style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              <button onClick={save} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', borderRadius: 10, padding: '9px 18px',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>
                <Check size={14} /> Simpan
              </button>
              <button onClick={() => { setModal(null); setForm(null) }} style={{
                padding: '9px 16px', border: '1px solid #e2e8f0', color: '#64748b',
                borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer',
              }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
            padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center',
          }}>
            <div style={{ width: 48, height: 48, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Hapus Data Absensi?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Catatan absensi ini akan dihapus permanen.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => del(deleteConfirm)} style={{
                background: '#dc2626', color: 'white', border: 'none', borderRadius: 10,
                padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Ya, Hapus
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{
                border: '1px solid #e2e8f0', color: '#64748b', background: 'white',
                borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer',
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
