import { useState, useRef } from 'react'
import { Camera, CheckCircle, Clock, XCircle, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const DEMO_LOG = [
  { id: 1, name: 'Bimbim', role: 'staff', type: 'masuk', time: '07:02', date: '2026-06-27', photo: null, status: 'hadir' },
  { id: 2, name: 'Wowo', role: 'staff', type: 'masuk', time: '07:15', date: '2026-06-27', photo: null, status: 'hadir' },
  { id: 3, name: 'April', role: 'admin', type: 'masuk', time: '08:30', date: '2026-06-27', photo: null, status: 'hadir' },
  { id: 4, name: 'Bimbim', role: 'staff', type: 'masuk', time: '07:05', date: '2026-06-26', photo: null, status: 'hadir' },
  { id: 5, name: 'Wowo', role: 'staff', type: 'masuk', time: '—', date: '2026-06-26', photo: null, status: 'absen' },
]

const STATUS_STYLE = {
  hadir: 'bg-green-100 text-green-700',
  telat: 'bg-amber-100 text-amber-700',
  absen: 'bg-red-100 text-red-700',
}

export default function Attendance() {
  const { profile } = useAuth()
  const [log, setLog] = useState(DEMO_LOG)
  const [selfie, setSelfie] = useState(null)
  const [captureMode, setCaptureMode] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef()
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const now = format(new Date(), 'HH:mm')

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setSelfie(url)
  }

  function handleSubmit() {
    const newEntry = {
      id: Date.now(),
      name: profile?.name,
      role: profile?.role,
      type: 'masuk',
      time: now,
      date: '2026-06-27',
      photo: selfie,
      status: parseInt(now.split(':')[0]) < 8 ? 'hadir' : 'telat',
    }
    setLog(prev => [newEntry, ...prev])
    setSubmitted(true)
    setSelfie(null)
  }

  const todayLog = log.filter(l => l.date === '2026-06-27')

  return (
    <div className="space-y-6">
      {/* Selfie absensi card */}
      <div className="bg-gradient-to-br from-cyan-700 to-sky-800 rounded-2xl p-6 text-white shadow-lg">
        <h3 className="font-bold text-lg mb-1">Absensi Selfie</h3>
        <p className="text-cyan-200 text-sm mb-5">{today} — {now} WIB</p>

        {submitted ? (
          <div className="flex items-center gap-3 bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-4">
            <CheckCircle size={24} className="text-green-300" />
            <div>
              <p className="font-semibold">Absensi berhasil dicatat!</p>
              <p className="text-sm text-cyan-200">Pukul {now} WIB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selfie ? (
              <div className="flex gap-4 items-start">
                <img src={selfie} alt="Selfie" className="w-28 h-28 rounded-xl object-cover border-2 border-white/20 shadow" />
                <div className="flex-1">
                  <p className="text-sm text-cyan-100 mb-3">Foto terambil. Konfirmasi absensi?</p>
                  <div className="flex gap-2">
                    <button onClick={handleSubmit} className="flex items-center gap-2 bg-green-500 hover:bg-green-400 px-4 py-2 rounded-xl text-sm font-medium transition">
                      <CheckCircle size={16} /> Konfirmasi Hadir
                    </button>
                    <button onClick={() => setSelfie(null)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm transition">
                      <XCircle size={16} /> Ulang
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 bg-white text-cyan-800 font-semibold px-5 py-3 rounded-xl hover:bg-cyan-50 transition shadow"
                >
                  <Camera size={18} /> Ambil Foto Selfie
                </button>
                <button
                  onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-5 py-3 rounded-xl text-sm transition border border-white/20"
                >
                  <Upload size={16} /> Upload Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhoto} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hadir', count: todayLog.filter(l => l.status === 'hadir').length, color: 'bg-green-100 text-green-700' },
          { label: 'Telat', count: todayLog.filter(l => l.status === 'telat').length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Absen', count: todayLog.filter(l => l.status === 'absen').length, color: 'bg-red-100 text-red-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-3xl font-bold text-slate-800">{s.count}</p>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Log Absensi Hari Ini</h3>
          <span className="text-sm text-slate-500">{today}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-6 py-3 text-left font-medium">Nama</th>
                <th className="px-6 py-3 text-left font-medium">Jabatan</th>
                <th className="px-6 py-3 text-left font-medium">Jam Masuk</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
                <th className="px-6 py-3 text-center font-medium">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayLog.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{entry.name}</td>
                  <td className="px-6 py-3.5 text-slate-500 capitalize">{entry.role}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock size={14} className="text-slate-400" />
                      {entry.time}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {entry.photo
                      ? <img src={entry.photo} alt="selfie" className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-200" />
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
