import { useState, useEffect, useRef } from 'react'
import { Camera, CheckCircle, Clock, XCircle, Upload, Plus, Edit2, Trash2, X, Check, UserCheck, UserX, Users, Settings, CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const STATUS_CFG = {
  hadir: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  telat: { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  absen: { bg: '#fff1f2', text: '#dc2626', border: '#fecaca' },
  izin:  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
}

function loadSchedule() {
  try { return JSON.parse(localStorage.getItem('nwj_work_schedule') || '{"jamMasuk":"08:00"}') }
  catch { return { jamMasuk: '08:00' } }
}

function timeStatus(time, jamMasuk = '08:00') {
  if (!time || time === '—') return 'absen'
  return time <= jamMasuk ? 'hadir' : 'telat'
}

const inputStyle = {
  width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '9px 13px', fontSize: 13, color: '#0f172a',
  background: 'white', outline: 'none', boxSizing: 'border-box',
}

function StatCard({ label, value, sub, Icon, iconColor, iconBg }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 16, padding: '18px 20px',
      border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0 }}>{label}</p>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </div>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
    </div>
  )
}

export default function Attendance() {
  const { user, profile } = useAuth()
  const isOwner  = profile?.role === 'owner'
  const isStaff  = profile?.role === 'staff'
  const canManage = profile?.role === 'owner' || profile?.role === 'admin'

  // ── Reactive today (auto-updates at midnight) ──
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10))
  const thisMonth = today.slice(0, 7)

  const [log, setLog]                       = useState([])
  const [selfie, setSelfie]                 = useState(null)
  const [selfieFile, setSelfieFile]         = useState(null)
  const [submitted, setSubmitted]           = useState(false)
  const [submittedPulang, setSubmittedPulang] = useState(false)
  const [dateView, setDateView]             = useState(today)
  const [modal, setModal]                   = useState(null)
  const [form, setForm]                     = useState(null)
  const [deleteConfirm, setDeleteConfirm]   = useState(null)
  const [staffList, setStaffList]           = useState([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [schedule, setSchedule]             = useState(loadSchedule)
  const [schedForm, setSchedForm]           = useState(null)
  const [reportMonth, setReportMonth]       = useState(() => new Date().toISOString().slice(0, 7))
  const fileRef = useRef()

  // ── Midnight detection: update today, reset check-in state ──
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10)
      if (now !== today) {
        setToday(now)
        setDateView(now)
        setSubmitted(false)
        setSubmittedPulang(false)
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [today])

  // ── Fetch attendance: staff only see their own records, re-fetch when today changes ──
  useEffect(() => {
    if (!profile) return
    let q = supabase.from('attendance').select('*').order('created_at', { ascending: false })
    if (isStaff) q = q.eq('name', profile.name)
    q.then(({ data }) => setLog(data || []))
  }, [profile?.name, isStaff, today])

  // ── Employee list from employees table (auto-updates when employees are added) ──
  useEffect(() => {
    if (!canManage) return
    supabase.from('employees').select('id, name, jabatan, role').eq('active', true).order('name')
      .then(({ data }) => setStaffList(data || []))
  }, [canManage])

  // ── Total active employees for stat card ──
  useEffect(() => {
    if (!canManage) return
    supabase.from('employees').select('id', { count: 'exact' }).eq('active', true)
      .then(({ count }) => setTotalEmployees(count || 0))
  }, [canManage])

  // ── Load work schedule from DB profile settings (overrides localStorage on first load) ──
  useEffect(() => {
    if (profile?.settings?.work_schedule) setSchedule(profile.settings.work_schedule)
  }, [profile?.id])

  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const nowTime    = format(new Date(), 'HH:mm')
  const jamMasuk   = schedule.jamMasuk || '08:00'

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelfieFile(file)
    setSelfie(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function submitSelfie() {
    const status = timeStatus(nowTime, jamMasuk)
    let photoUrl = null
    if (selfieFile) {
      try {
        const ext = selfieFile.name.split('.').pop() || 'jpg'
        const path = `${profile?.id || 'u'}-${today}-${nowTime.replace(':', '')}.${ext}`
        const { error: upErr } = await supabase.storage.from('attendance-photos').upload(path, selfieFile, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('attendance-photos').getPublicUrl(path)
          photoUrl = publicUrl
        }
      } catch {}
    }
    const entry = {
      name: profile?.name || 'User',
      role: profile?.role || 'staff',
      type: 'masuk',
      time: nowTime,
      date: today,
      photo: photoUrl,
      status,
      catatan: status === 'telat' ? `Terlambat — jam masuk: ${jamMasuk}` : '',
    }
    const { data } = await supabase.from('attendance').insert(entry).select().single()
    setLog(prev => [data || { ...entry, id: Date.now() }, ...prev])
    setSubmitted(true)
    setSelfie(null)
    setSelfieFile(null)
  }

  async function submitPulang() {
    const masukEntry = log.find(e => e.date === today && e.name === profile?.name && e.type === 'masuk')
    const entry = {
      name: profile?.name || 'User',
      role: profile?.role || 'staff',
      type: 'pulang',
      time: nowTime,
      date: today,
      photo: null,
      status: masukEntry?.status || 'hadir',
      catatan: '',
    }
    const { data } = await supabase.from('attendance').insert(entry).select().single()
    setLog(prev => [data || { ...entry, id: Date.now() }, ...prev])
    setSubmittedPulang(true)
  }

  function openAdd() {
    setModal('add')
    setForm({
      name: staffList[0]?.name || '',
      role: staffList[0]?.role || 'staff',
      type: 'masuk',
      time: '07:00', date: today,
      photo: null, status: 'hadir', catatan: '',
    })
  }

  function openEdit(entry) { setModal('edit'); setForm({ ...entry }) }
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name) return
    const entry = { ...form, status: form.status || timeStatus(form.time, jamMasuk) }
    if (modal === 'edit') {
      setLog(prev => prev.map(e => e.id === form.id ? entry : e))
      await supabase.from('attendance').update(entry).eq('id', form.id)
    } else {
      const { data } = await supabase.from('attendance').insert(entry).select().single()
      setLog(prev => [data || { ...entry, id: Date.now() }, ...prev])
    }
    setModal(null); setForm(null)
  }

  async function del(id) {
    setLog(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
    await supabase.from('attendance').delete().eq('id', id)
  }

  async function saveSchedule() {
    const s = { jamMasuk: schedForm.jamMasuk || '08:00' }
    localStorage.setItem('nwj_work_schedule', JSON.stringify(s))
    if (user) {
      try {
        const cur = profile?.settings || {}
        await supabase.from('profiles').update({ settings: { ...cur, work_schedule: s } }).eq('id', user.id)
      } catch {}
    }
    setSchedule(s)
    setSchedForm(null)
  }

  // ── Computed stats ──
  const todayLog   = log.filter(e => e.date === today && e.type !== 'pulang')
  const hadirAll   = todayLog.filter(e => e.status === 'hadir').length
  const telatAll   = todayLog.filter(e => e.status === 'telat').length
  const absenAll   = todayLog.filter(e => e.status === 'absen').length

  const myMonthMasuk = log.filter(e => e.date.startsWith(thisMonth) && e.type === 'masuk')
  const myHadir = myMonthMasuk.filter(e => e.status === 'hadir').length
  const myTelat = myMonthMasuk.filter(e => e.status === 'telat').length
  const myIzin  = myMonthMasuk.filter(e => e.status === 'izin').length
  const myAbsen = myMonthMasuk.filter(e => e.status === 'absen').length

  const myMasukEntry  = log.find(e => e.date === today && e.name === profile?.name && e.type === 'masuk')
  const myPulangEntry = log.find(e => e.date === today && e.name === profile?.name && e.type === 'pulang')

  const viewLog = log.filter(e => e.date === dateView)

  // ── Monthly attendance report ──
  const reportLog = log.filter(e => e.date.startsWith(reportMonth) && e.type === 'masuk')
  const reportEmpMap = {}
  reportLog.forEach(e => {
    const n = e.name || '–'
    if (!reportEmpMap[n]) reportEmpMap[n] = { name: n, hadir: 0, telat: 0, izin: 0, absen: 0 }
    reportEmpMap[n][e.status] = (reportEmpMap[n][e.status] || 0) + 1
  })
  const reportRows = Object.values(reportEmpMap)
    .map(r => ({ ...r, total: r.hadir + r.telat + r.izin + r.absen }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const reportTotals = reportRows.reduce(
    (acc, r) => ({ hadir: acc.hadir + r.hadir, telat: acc.telat + r.telat, izin: acc.izin + r.izin, absen: acc.absen + r.absen, total: acc.total + r.total }),
    { hadir: 0, telat: 0, izin: 0, absen: 0, total: 0 }
  )

  // ── Auto-fill jabatan when name selected in form ──
  function handleFormName(name) {
    const emp = staffList.find(s => s.name === name)
    setForm(f => ({ ...f, name, role: emp?.role || f.role }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── OWNER ONLY: Atur Jam Kerja ── */}
      {isOwner && (
        <div style={{
          borderRadius: 14, padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
          boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Jam Kerja</h3>
            <p style={{ fontSize: 12.5, color: '#93c5fd', margin: 0 }}>
              Batas masuk: <strong style={{ color: 'white' }}>{jamMasuk} WIB</strong>
              {' — '}lewat jam ini otomatis <span style={{ color: '#fde68a' }}>Telat</span>
            </p>
          </div>
          <button
            onClick={() => setSchedForm({ jamMasuk })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'white', color: '#1e3a8a',
              border: 'none', borderRadius: 10, padding: '10px 18px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}>
            <Settings size={15} /> Atur Jam Kerja
          </button>
        </div>
      )}

      {/* ── STAFF / ADMIN: Selfie Check-in Card ── */}
      {!isOwner && (
        <div style={{
          borderRadius: 14, padding: '22px 24px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
          boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Absensi Selfie</h3>
          <p style={{ fontSize: 12.5, color: '#93c5fd', margin: '0 0 18px', textTransform: 'capitalize' }}>
            {todayLabel} — {nowTime} WIB &nbsp;·&nbsp; Batas masuk: <strong style={{ color: 'white' }}>{jamMasuk} WIB</strong>
          </p>

          {(myPulangEntry || submittedPulang) ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(134,239,172,0.3)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <CheckCircle size={22} color="#86efac" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: 'white', margin: '0 0 2px', fontSize: 14 }}>Absensi hari ini lengkap!</p>
                <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>
                  Masuk: {myMasukEntry?.time || '—'} WIB &nbsp;·&nbsp; Pulang: {myPulangEntry?.time || nowTime} WIB
                </p>
              </div>
            </div>
          ) : (myMasukEntry || submitted) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: myMasukEntry?.status === 'telat' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                border: `1px solid ${myMasukEntry?.status === 'telat' ? 'rgba(253,230,138,0.3)' : 'rgba(134,239,172,0.3)'}`,
                borderRadius: 12, padding: '14px 18px',
              }}>
                <CheckCircle size={22} color={myMasukEntry?.status === 'telat' ? '#fde047' : '#86efac'} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'white', margin: '0 0 2px', fontSize: 14 }}>
                    {myMasukEntry?.status === 'telat' ? 'Absen masuk tercatat — Terlambat' : 'Absen masuk sudah tercatat!'}
                  </p>
                  <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>Pukul {myMasukEntry?.time || nowTime} WIB</p>
                </div>
              </div>
              <button onClick={submitPulang} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'white', color: '#1e3a8a',
                border: 'none', borderRadius: 10, padding: '10px 18px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)', alignSelf: 'flex-start',
              }}>
                <Clock size={17} /> Absen Pulang — {nowTime} WIB
              </button>
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
                        borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>
                        <CheckCircle size={15} /> Konfirmasi Hadir
                      </button>
                      <button onClick={() => { setSelfie(null); setSelfieFile(null) }} style={{
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
                    <Camera size={17} /> Absen Masuk — Ambil Selfie
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
      )}

      {/* ── Stat Cards ── */}
      {isStaff ? (
        <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Hadir"  value={myHadir} sub="bulan ini" Icon={UserCheck}    iconColor="#16a34a" iconBg="#f0fdf4" />
          <StatCard label="Telat"  value={myTelat} sub="bulan ini" Icon={Clock}        iconColor="#d97706" iconBg="#fffbeb" />
          <StatCard label="Izin"   value={myIzin}  sub="bulan ini" Icon={CalendarDays} iconColor="#2563eb" iconBg="#eff6ff" />
          <StatCard label="Absen"  value={myAbsen} sub="bulan ini" Icon={UserX}        iconColor="#dc2626" iconBg="#fef2f2" />
        </div>
      ) : (
        <div className="rg-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Hadir Hari Ini"  value={hadirAll}         sub="tepat waktu"          Icon={UserCheck} iconColor="#16a34a" iconBg="#f0fdf4" />
          <StatCard label="Telat"           value={telatAll}         sub="terlambat masuk"       Icon={Clock}     iconColor="#d97706" iconBg="#fffbeb" />
          <StatCard label="Absen"           value={absenAll}         sub="tidak hadir hari ini"  Icon={UserX}     iconColor="#dc2626" iconBg="#fef2f2" />
          <StatCard label="Total Karyawan"  value={totalEmployees}   sub="karyawan aktif"        Icon={Users}     iconColor="#2563eb" iconBg="#eff6ff" />
        </div>
      )}

      {/* ── Log Absensi ── */}
      <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden' }}>

        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
              {isStaff ? 'Riwayat Absensi Saya' : 'Log Absensi'}
            </p>
            <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>
              {viewLog.length} catatan untuk tanggal yang dipilih
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date" value={dateView}
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

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                {(isStaff
                  ? ['Tipe', 'Jam', 'Status', 'Catatan', 'Foto']
                  : ['Nama', 'Jabatan', 'Tipe', 'Jam', 'Status', 'Catatan', 'Foto', 'Aksi']
                ).map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: ['Status', 'Foto', 'Aksi'].includes(h) ? 'center' : 'left',
                    fontSize: 11, fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewLog.length === 0 && (
                <tr>
                  <td
                    colSpan={isStaff ? 5 : 8}
                    style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}
                  >
                    Tidak ada data absensi untuk tanggal ini.
                  </td>
                </tr>
              )}
              {viewLog.map((entry, idx) => {
                const sc = STATUS_CFG[entry.status] || STATUS_CFG.hadir
                return (
                  <tr
                    key={entry.id}
                    style={{ borderTop: idx > 0 ? '1px solid #f8fafc' : 'none', background: 'white', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {!isStaff && (
                      <>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{entry.name}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>{entry.role}</td>
                      </>
                    )}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize',
                        background: entry.type === 'pulang' ? '#fff7ed' : '#f0fdf4',
                        color: entry.type === 'pulang' ? '#ea580c' : '#16a34a',
                        border: `1px solid ${entry.type === 'pulang' ? '#fed7aa' : '#bbf7d0'}`,
                      }}>
                        {entry.type === 'pulang' ? 'Pulang' : 'Masuk'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155' }}>
                        <Clock size={12} color="#94a3b8" /> {entry.time}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize',
                        background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
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
                    {!isStaff && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            onClick={() => openEdit(entry)}
                            title="Edit"
                            style={{ padding: 6, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef9c3'; e.currentTarget.style.color = '#ca8a04' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(entry.id)}
                            title="Hapus"
                            style={{ padding: 6, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
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

      {/* ── Laporan Absensi Bulanan (canManage only) ── */}
      {canManage && (
        <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', gap: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Laporan Absensi Bulanan</p>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>
                {reportRows.length} karyawan · {reportTotals.total} total presensi masuk
              </p>
            </div>
            <input
              type="month" value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#0f172a', background: 'white' }}
            />
          </div>

          {reportRows.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Tidak ada data absensi untuk bulan ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {['Karyawan', 'Hadir', 'Telat', 'Izin', 'Absen', 'Total'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, idx) => (
                    <tr key={row.name} style={{ borderBottom: idx < reportRows.length - 1 ? '1px solid #f8fafc' : '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>{row.name}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20, display: 'inline-block', minWidth: 28 }}>{row.hadir}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: row.telat > 0 ? '#d97706' : '#94a3b8', background: row.telat > 0 ? '#fffbeb' : '#f8fafc', padding: '3px 10px', borderRadius: 20, display: 'inline-block', minWidth: 28 }}>{row.telat}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: row.izin > 0 ? '#2563eb' : '#94a3b8', background: row.izin > 0 ? '#eff6ff' : '#f8fafc', padding: '3px 10px', borderRadius: 20, display: 'inline-block', minWidth: 28 }}>{row.izin}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: row.absen > 0 ? '#dc2626' : '#94a3b8', background: row.absen > 0 ? '#fef2f2' : '#f8fafc', padding: '3px 10px', borderRadius: 20, display: 'inline-block', minWidth: 28 }}>{row.absen}</span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{row.total}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderTop: '1.5px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{reportTotals.hadir}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: reportTotals.telat > 0 ? '#d97706' : '#94a3b8' }}>{reportTotals.telat}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: reportTotals.izin > 0 ? '#2563eb' : '#94a3b8' }}>{reportTotals.izin}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: reportTotals.absen > 0 ? '#dc2626' : '#94a3b8' }}>{reportTotals.absen}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{reportTotals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Atur Jam Kerja (owner only) ── */}
      {schedForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(48px) saturate(2)', WebkitBackdropFilter: 'blur(48px) saturate(2)', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,1)', border: '1px solid rgba(255,255,255,0.9)', width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Atur Jam Kerja</h3>
              <button onClick={() => setSchedForm(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Batas Jam Masuk (lewat jam ini → Telat)
                </label>
                <input
                  type="time" value={schedForm.jamMasuk}
                  onChange={e => setSchedForm(f => ({ ...f, jamMasuk: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Karyawan yang absen setelah <strong>{schedForm.jamMasuk} WIB</strong> akan otomatis ditandai{' '}
                <span style={{ color: '#ca8a04', fontWeight: 600 }}>Telat</span>.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              <button onClick={saveSchedule} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', borderRadius: 10, padding: '9px 18px',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              }}>
                <Check size={14} /> Simpan
              </button>
              <button onClick={() => setSchedForm(null)} style={{ padding: '9px 16px', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Tambah / Edit (manager only) ── */}
      {modal && form && canManage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(48px) saturate(2)', WebkitBackdropFilter: 'blur(48px) saturate(2)', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,1)', border: '1px solid rgba(255,255,255,0.9)', width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {modal === 'edit' ? 'Edit Absensi' : 'Tambah Absensi Manual'}
              </h3>
              <button onClick={() => { setModal(null); setForm(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <div className="rg-2" style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Nama Karyawan</label>
                {staffList.length > 0 ? (
                  <select value={form.name} onChange={e => handleFormName(e.target.value)} style={inputStyle}>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Nama karyawan" style={inputStyle} />
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tanggal</label>
                <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Jam</label>
                <input type="time" value={form.time} onChange={e => setF('time', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Tipe</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} style={inputStyle}>
                  <option value="masuk">Masuk</option>
                  <option value="pulang">Pulang</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)} style={inputStyle}>
                  {['hadir', 'telat', 'absen', 'izin'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Jabatan</label>
                <input value={form.role || ''} onChange={e => setF('role', e.target.value)} placeholder="staff / admin" style={inputStyle} />
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
              <button onClick={() => { setModal(null); setForm(null) }} style={{ padding: '9px 16px', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Konfirmasi Hapus (manager only) ── */}
      {deleteConfirm && canManage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(48px) saturate(2)', WebkitBackdropFilter: 'blur(48px) saturate(2)', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,1)', border: '1px solid rgba(255,255,255,0.9)', padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Hapus Data Absensi?</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Catatan absensi ini akan dihapus permanen.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => del(deleteConfirm)} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Ya, Hapus
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ border: '1px solid #e2e8f0', color: '#64748b', background: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
