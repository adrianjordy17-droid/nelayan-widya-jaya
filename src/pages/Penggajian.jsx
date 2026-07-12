import { useState, useEffect } from 'react'
import { Users, Plus, X, Trash2, CalendarDays, Wallet, HandCoins, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }
const GLASS = {
  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function fmtRp(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }
function curYM() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}` }
function fmtMonth(ym) { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}` }
function shiftYM(ym, d) { const [y, m] = ym.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` }

const inputStyle = { width: '100%', border: '1px solid #d1d1d6', borderRadius: 9, padding: '8px 11px', fontSize: 13.5, outline: 'none', background: 'white', color: '#1c1c1e', boxSizing: 'border-box', ...FF }

export default function Penggajian() {
  const { isRole, profile } = useAuth()
  const isOwner = isRole('owner')

  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [finance, setFinance] = useState([])
  const [month, setMonth] = useState(curYM())
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [finForm, setFinForm] = useState(null)  // { employee, jenis }
  const [finSaving, setFinSaving] = useState(false)
  const [openEmp, setOpenEmp] = useState(null)   // expanded rincian

  useEffect(() => {
    if (!isOwner) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const [empRes, attRes, finRes] = await Promise.all([
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase.from('attendance').select('name,type,status,date').like('date', `${month}-%`),
        supabase.from('employee_finance').select('*').order('tanggal', { ascending: false }),
      ])
      if (finRes.error) { setNeedsSetup(true); setLoading(false); return }
      setEmployees(empRes.data || [])
      setAttendance(attRes.data || [])
      setFinance(finRes.data || [])
      setLoading(false)
    })()
  }, [isOwner, month])

  async function saveGaji(empId, value) {
    const gaji = parseFloat(value) || 0
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, gaji } : e))
    const { error } = await supabase.from('employees').update({ gaji }).eq('id', empId)
    if (error) alert('Gagal menyimpan gaji: ' + error.message)
  }

  async function addFinance() {
    if (!finForm?.amount) return
    setFinSaving(true)
    const payload = {
      employee_id: finForm.employee.id,
      jenis: finForm.jenis,
      amount: parseFloat(finForm.amount) || 0,
      tanggal: finForm.tanggal || new Date().toISOString().slice(0, 10),
      catatan: finForm.catatan?.trim() || null,
      created_by: profile?.name || null,
    }
    const { data, error } = await supabase.from('employee_finance').insert(payload).select().single()
    setFinSaving(false)
    if (error) { alert('Gagal menyimpan: ' + error.message); return }
    setFinance(prev => [data, ...prev])
    setFinForm(null)
  }

  async function delFinance(id) {
    setFinance(prev => prev.filter(f => f.id !== id))
    await supabase.from('employee_finance').delete().eq('id', id)
  }

  if (!isOwner) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: '#8e8e93', ...FF }}>Hanya owner yang bisa mengakses Penggajian.</div>
  }
  if (loading) {
    return <div style={{ padding: '48px 0', textAlign: 'center', color: '#8e8e93', fontSize: 15, ...FF }}>Memuat data...</div>
  }
  if (needsSetup) {
    return (
      <div style={{ maxWidth: 640, ...FF }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: '0 0 12px' }}>Penggajian Karyawan</h2>
        <div style={{ ...GLASS, padding: '18px 20px', border: '1px solid #fde68a', background: '#fff8e1' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 8px' }}>Perlu setup database sekali</p>
          <p style={{ fontSize: 13, color: '#92400e', margin: '0 0 10px' }}>
            Buka Supabase → SQL Editor → tempel isi file <strong>supabase/payroll.sql</strong> → Run. Setelah itu refresh halaman ini.
          </p>
        </div>
      </div>
    )
  }

  const rows = employees.map(emp => {
    const att = attendance.filter(a => a.name === emp.name && a.type === 'masuk')
    const hadir = att.filter(a => a.status === 'hadir').length
    const telat = att.filter(a => a.status === 'telat').length
    const fin = finance.filter(f => f.employee_id === emp.id)
    const kasbon = fin.filter(f => f.jenis === 'kasbon').reduce((s, f) => s + (f.amount || 0), 0)
    const pinjaman = fin.filter(f => f.jenis === 'pinjaman').reduce((s, f) => s + (f.amount || 0), 0)
    const gaji = parseFloat(emp.gaji) || 0
    return { emp, hadir, telat, fin, kasbon, pinjaman, gaji, bersih: gaji - kasbon - pinjaman }
  })

  return (
    <div style={{ maxWidth: 720, ...FF, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Penggajian Karyawan</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...GLASS, padding: '6px 10px' }}>
          <button onClick={() => setMonth(m => shiftYM(m, -1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 16, padding: '0 4px' }}>‹</button>
          <CalendarDays size={14} color="#007aff" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', minWidth: 96, textAlign: 'center' }}>{fmtMonth(month)}</span>
          <button onClick={() => setMonth(m => shiftYM(m, 1))} disabled={month >= curYM()} style={{ background: 'none', border: 'none', cursor: month >= curYM() ? 'default' : 'pointer', color: month >= curYM() ? '#c7c7cc' : '#8e8e93', fontSize: 16, padding: '0 4px' }}>›</button>
        </div>
      </div>

      {rows.length === 0 && (
        <div style={{ ...GLASS, padding: '40px', textAlign: 'center', color: '#8e8e93' }}>
          <Users size={34} color="#c7c7cc" style={{ margin: '0 auto 10px', display: 'block' }} />
          Belum ada karyawan aktif.
        </div>
      )}

      {rows.map(({ emp, hadir, telat, fin, kasbon, pinjaman, gaji, bersih }) => {
        const isOpen = openEmp === emp.id
        return (
          <div key={emp.id} style={{ ...GLASS, overflow: 'hidden' }}>
            {/* Header karyawan */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#007aff', fontSize: 16 }}>
                {(emp.name || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{emp.name}</p>
                <p style={{ fontSize: 12, color: '#8e8e93', margin: '1px 0 0' }}>{emp.jabatan || 'Karyawan'}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 10.5, color: '#8e8e93', margin: 0 }}>Gaji Bersih</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: bersih >= 0 ? '#16a34a' : '#ff3b30', margin: '1px 0 0' }}>{fmtRp(bersih)}</p>
              </div>
            </div>

            {/* Absen */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '3px 9px', borderRadius: 7 }}>
                <CheckCircle size={13} /> Hadir {hadir}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: telat > 0 ? '#ca8a04' : '#8e8e93', background: telat > 0 ? '#fefce8' : '#f2f2f7', padding: '3px 9px', borderRadius: 7 }}>
                <Clock size={13} /> Telat {telat}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aeaeb2', alignSelf: 'center' }}>{fmtMonth(month)}</span>
            </div>

            {/* Gaji / Kasbon / Pinjaman */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#3c3c43', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Wallet size={14} color="#007aff" /> Gaji Pokok</span>
                <input type="number" min="0" defaultValue={gaji || ''} placeholder="0"
                  onBlur={e => saveGaji(emp.id, e.target.value)}
                  style={{ ...inputStyle, width: 150, textAlign: 'right' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#3c3c43', display: 'inline-flex', alignItems: 'center', gap: 6 }}><HandCoins size={14} color="#ff9500" /> Kasbon</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: kasbon > 0 ? '#ff9500' : '#8e8e93' }}>{fmtRp(kasbon)}</span>
                  <button onClick={() => setFinForm({ employee: emp, jenis: 'kasbon', amount: '', tanggal: new Date().toISOString().slice(0, 10), catatan: '' })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none', borderRadius: 8, background: 'rgba(255,149,0,0.12)', color: '#ff9500', padding: '5px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...FF }}>
                    <Plus size={13} /> Tambah
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#3c3c43', display: 'inline-flex', alignItems: 'center', gap: 6 }}><HandCoins size={14} color="#af52de" /> Pinjaman</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: pinjaman > 0 ? '#af52de' : '#8e8e93' }}>{fmtRp(pinjaman)}</span>
                  <button onClick={() => setFinForm({ employee: emp, jenis: 'pinjaman', amount: '', tanggal: new Date().toISOString().slice(0, 10), catatan: '' })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none', borderRadius: 8, background: 'rgba(175,82,222,0.12)', color: '#af52de', padding: '5px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...FF }}>
                    <Plus size={13} /> Tambah
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1c1e' }}>Gaji Bersih</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: bersih >= 0 ? '#16a34a' : '#ff3b30' }}>{fmtRp(bersih)}</span>
              </div>

              {fin.length > 0 && (
                <button onClick={() => setOpenEmp(isOpen ? null : emp.id)} style={{ background: 'none', border: 'none', color: '#007aff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0, ...FF }}>
                  {isOpen ? 'Tutup rincian' : `Lihat rincian (${fin.length})`}
                </button>
              )}
              {isOpen && fin.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: f.jenis === 'kasbon' ? '#ff9500' : '#af52de', margin: 0, textTransform: 'capitalize' }}>{f.jenis} · {fmtRp(f.amount)}</p>
                    <p style={{ fontSize: 10.5, color: '#8e8e93', margin: '1px 0 0' }}>{f.tanggal}{f.catatan ? ` · ${f.catatan}` : ''}</p>
                  </div>
                  <button onClick={() => delFinance(f.id)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: 4, flexShrink: 0 }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Modal tambah kasbon/pinjaman */}
      {finForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#f2f2f7', borderRadius: 16, width: '100%', maxWidth: 380, overflow: 'hidden', ...FF }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid #d1d1d6' }}>
              <button onClick={() => setFinForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}><X size={20} /></button>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0, textTransform: 'capitalize' }}>Tambah {finForm.jenis} — {finForm.employee.name}</p>
              <button onClick={addFinance} disabled={finSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: finSaving ? '#c7c7cc' : '#007aff', padding: 0, ...FF }}>{finSaving ? '...' : 'Simpan'}</button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>NOMINAL (Rp) *</label>
                <input type="number" min="0" value={finForm.amount} onChange={e => setFinForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>TANGGAL</label>
                <input type="date" value={finForm.tanggal} onChange={e => setFinForm(f => ({ ...f, tanggal: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>CATATAN</label>
                <input value={finForm.catatan} onChange={e => setFinForm(f => ({ ...f, catatan: e.target.value }))} placeholder="opsional" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
