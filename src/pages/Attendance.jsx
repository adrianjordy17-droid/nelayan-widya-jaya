import { useState, useRef } from 'react'
import { Camera, CheckCircle, Clock, XCircle, Upload, Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLocalStorage } from '../hooks/useLocalStorage'
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

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white transition"

export default function Attendance() {
  const { profile, hasPermission } = useAuth()
  const [log, setLog] = useLocalStorage('nwj_attendance', INIT_LOG)
  const [selfie, setSelfie] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [dateView, setDateView] = useState(TODAY)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileRef = useRef()
  const canManage = hasPermission('attendance')

  const today   = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const nowTime = format(new Date(), 'HH:mm')

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelfie(URL.createObjectURL(file))
  }

  function submitSelfie() {
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
  }

  function openAdd() {
    setModal('add')
    setForm({ id: Date.now(), name: TEAM[0], role: 'staff', type: 'masuk', time: '07:00', date: TODAY, photo: null, status: 'hadir', catatan: '' })
  }

  function openEdit(entry) { setModal('edit'); setForm({ ...entry }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function save() {
    if (!form.name) return
    const entry = { ...form, status: form.status || timeStatus(form.time) }
    if (modal === 'edit') {
      setLog(prev => prev.map(e => e.id === form.id ? entry : e))
    } else {
      setLog(prev => [entry, ...prev])
    }
    setModal(null); setForm(null)
  }

  function del(id) {
    setLog(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
  }

  const viewLog     = log.filter(e => e.date === dateView)
  const todayLog    = log.filter(e => e.date === TODAY)
  const hadir       = todayLog.filter(e => e.status === 'hadir').length
  const telat       = todayLog.filter(e => e.status === 'telat').length
  const absen       = todayLog.filter(e => e.status === 'absen').length

  const alreadyAbsen = log.some(e => e.date === TODAY && e.name === (profile?.name || ''))

  return (
    <div className="space-y-5">
      {/* Selfie card */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}>
        <h3 className="font-bold text-lg mb-0.5">Absensi Selfie</h3>
        <p className="text-blue-200 text-sm mb-5">{today} — {nowTime} WIB</p>

        {submitted || alreadyAbsen ? (
          <div className="flex items-center gap-3 bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-4">
            <CheckCircle size={22} className="text-green-300 shrink-0" />
            <div>
              <p className="font-semibold">Absensi sudah tercatat hari ini!</p>
              <p className="text-sm text-blue-200">Pukul {log.find(e => e.date === TODAY && e.name === profile?.name)?.time || nowTime} WIB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selfie ? (
              <div className="flex gap-4 items-start">
                <img src={selfie} alt="selfie" className="w-28 h-28 rounded-xl object-cover border-2 border-white/20 shadow" />
                <div className="flex-1">
                  <p className="text-sm text-blue-100 mb-3">Foto siap. Konfirmasi absensi?</p>
                  <div className="flex gap-2">
                    <button onClick={submitSelfie}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow">
                      <CheckCircle size={16} /> Konfirmasi Hadir
                    </button>
                    <button onClick={() => setSelfie(null)}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-sm transition border border-white/20">
                      <XCircle size={16} /> Ulang
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 bg-white text-blue-800 font-semibold px-5 py-3 rounded-xl hover:bg-blue-50 transition shadow">
                  <Camera size={18} /> Ambil Foto Selfie
                </button>
                <button onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 bg-white/12 hover:bg-white/20 px-5 py-3 rounded-xl text-sm transition border border-white/20">
                  <Upload size={16} /> Upload Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hadir', count: hadir, ...STATUS_CFG.hadir },
          { label: 'Telat', count: telat, ...STATUS_CFG.telat },
          { label: 'Absen', count: absen, ...STATUS_CFG.absen },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-3xl font-bold text-slate-800">{s.count}</p>
            <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800">Log Absensi</h3>
          <div className="flex items-center gap-3">
            <input type="date" value={dateView} onChange={e => setDateView(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {canManage && (
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
                <Plus size={15} /> Tambah Manual
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="px-6 py-3 text-left font-semibold tracking-wide">Nama</th>
                <th className="px-6 py-3 text-left font-semibold tracking-wide">Jabatan</th>
                <th className="px-6 py-3 text-left font-semibold tracking-wide">Jam</th>
                <th className="px-6 py-3 text-center font-semibold tracking-wide">Status</th>
                <th className="px-6 py-3 text-left font-semibold tracking-wide">Catatan</th>
                <th className="px-6 py-3 text-center font-semibold tracking-wide">Foto</th>
                {canManage && <th className="px-6 py-3 text-center font-semibold tracking-wide">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {viewLog.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada data absensi untuk tanggal ini.</td></tr>
              )}
              {viewLog.map(entry => {
                const sc = STATUS_CFG[entry.status] || STATUS_CFG.hadir
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{entry.name}</td>
                    <td className="px-6 py-3.5 text-slate-400 capitalize text-xs">{entry.role}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock size={13} className="text-slate-400" /> {entry.time}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                        style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 text-xs">{entry.catatan || '—'}</td>
                    <td className="px-6 py-3.5 text-center">
                      {entry.photo
                        ? <img src={entry.photo} alt="selfie" className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-200" />
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    {canManage && (
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(entry)} title="Edit"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(entry.id)} title="Hapus"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{modal === 'edit' ? 'Edit Absensi' : 'Tambah Absensi Manual'}</h3>
              <button onClick={() => { setModal(null); setForm(null) }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Nama</label>
                  <select value={form.name} onChange={e => setF('name', e.target.value)} className={inputCls}>
                    {TEAM.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Tanggal</label>
                  <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} className={inputCls} />
                </div>
                <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Jam Masuk</label>
                  <input type="time" value={form.time} onChange={e => setF('time', e.target.value)} className={inputCls} />
                </div>
                <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setF('status', e.target.value)} className={inputCls}>
                    {['hadir','telat','absen','izin'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-slate-600 text-[13px] font-semibold mb-1.5">Catatan</label>
                <input value={form.catatan} onChange={e => setF('catatan', e.target.value)} placeholder="Izin sakit, terlambat, ..." className={inputCls} />
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
            <h3 className="font-bold text-slate-800 mb-1">Hapus Data Absensi?</h3>
            <p className="text-slate-500 text-sm mb-5">Catatan absensi ini akan dihapus permanen.</p>
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
