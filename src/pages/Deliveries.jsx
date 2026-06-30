import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Camera, Check, Plus, X, Truck, Store, FileText, Calendar, Package, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function shiftDay(d, delta) {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + delta)
  return dt.toISOString().slice(0, 10)
}
function fmtDay(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '12px 16px', borderBottom: last ? 'none' : '0.5px solid #f0f0f0',
    }}>
      <p style={{ fontSize: 15, color: '#8e8e93', margin: 0, flexShrink: 0 }}>{label}</p>
      <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, textAlign: 'right', maxWidth: '65%', lineHeight: 1.4 }}>{value || '–'}</p>
    </div>
  )
}

function StepBar({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, padding: '0 4px' }}>
      {/* Step 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: step === 1 ? '#ff9500' : '#34c759',
          fontSize: 13, fontWeight: 700, color: 'white',
        }}>
          {step === 1 ? '1' : <Check size={14} strokeWidth={2.5} />}
        </div>
        <p style={{ fontSize: 11, fontWeight: 600, color: step === 1 ? '#ff9500' : '#34c759', margin: '4px 0 0', textAlign: 'center' }}>
          Di Gudang
        </p>
      </div>

      {/* connector */}
      <div style={{ flex: 1, height: 2, background: step === 1 ? '#e5e5ea' : '#34c759', marginBottom: 18, maxWidth: 60 }} />

      {/* Step 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: step === 2 ? '#34c759' : '#e5e5ea',
          fontSize: 13, fontWeight: 700, color: step === 2 ? 'white' : '#c7c7cc',
        }}>
          2
        </div>
        <p style={{ fontSize: 11, fontWeight: 600, color: step === 2 ? '#34c759' : '#8e8e93', margin: '4px 0 0', textAlign: 'center' }}>
          Di Lokasi
        </p>
      </div>
    </div>
  )
}

function emptyForm() {
  return {
    clientName: '', deliveryDate: new Date().toISOString().slice(0, 10),
    weightSent: '',
    photoSentFile: null, photoSentPreview: null,
    notes: '',
    doRef: '', doId: null, doItems: [],
  }
}

function mapReport(r) {
  return {
    id: r.id,
    clientName: r.client_name,
    deliveryDate: r.delivery_date,
    weightSent: r.weight_sent,
    weightReceived: r.weight_received,
    photoSentUrl: r.photo_sent_url,
    photoReceivedUrl: r.photo_received_url,
    notes: r.notes,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
    doId: r.do_id || null,
    doRef: r.do_ref || '',
  }
}

export default function Deliveries() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [reports, setReports] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [modal, setModal] = useState(null)        // null | 'new' | report-object (detail)
  const [completing, setCompleting] = useState(null) // in-transit report being completed (Step 2)
  const [form, setForm] = useState(emptyForm())
  const [step2, setStep2] = useState({ weightReceived: '', photoFile: null, photoPreview: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const sentRef = useRef(null)
  const recvRef = useRef(null)

  useEffect(() => {
    supabase.from('delivery_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setReports(data.map(mapReport))
      })
  }, [])

  // Midnight auto-advance selectedDate
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10)
      if (now !== selectedDate) setSelectedDate(now)
    }, 60_000)
    return () => clearInterval(t)
  }, [selectedDate])

  useEffect(() => {
    if (location.state?.doRef) {
      const { doRef, doId, clientName, items } = location.state
      setForm(f => ({ ...f, doRef: doRef || '', doId: doId || null, doItems: items || [], clientName: clientName || '' }))
      setSaved(false)
      setModal('new')
      window.history.replaceState({}, document.title)
    }
  }, [])

  function handlePhotoSent(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, photoSentFile: file, photoSentPreview: URL.createObjectURL(file) }))
    e.target.value = ''
  }

  function handlePhotoRecv(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStep2(s => ({ ...s, photoFile: file, photoPreview: URL.createObjectURL(file) }))
    e.target.value = ''
  }

  async function uploadPhoto(file, path) {
    try {
      await supabase.storage.from('delivery-photos').upload(path, file, { upsert: true })
      const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path)
      return data?.publicUrl || null
    } catch { return null }
  }

  // ── Step 1: Simpan keberangkatan di gudang ──
  async function saveStep1(andContinue = false) {
    if (!form.clientName.trim()) return
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      let photoSentUrl = null
      if (form.photoSentFile) photoSentUrl = await uploadPhoto(form.photoSentFile, `${id}/sent.jpg`)

      const report = mapReport({
        id,
        client_name: form.clientName.trim(),
        delivery_date: form.deliveryDate,
        weight_sent: form.weightSent !== '' ? parseFloat(form.weightSent) : null,
        weight_received: null,
        photo_sent_url: photoSentUrl,
        photo_received_url: null,
        notes: form.notes.trim(),
        created_by_name: profile?.name || '',
        created_at: new Date().toISOString(),
        do_id: form.doId || null,
        do_ref: form.doRef || '',
      })

      setReports(prev => [report, ...prev])

      await supabase.from('delivery_reports').insert({
        id,
        client_name: report.clientName,
        delivery_date: report.deliveryDate,
        weight_sent: report.weightSent,
        weight_received: null,
        photo_sent_url: photoSentUrl,
        photo_received_url: null,
        notes: report.notes,
        created_by: user?.id,
        created_by_name: report.createdByName,
        do_id: form.doId || null,
        do_ref: form.doRef || null,
      })

      setSaved(true)
      if (andContinue) {
        setTimeout(() => {
          setSaved(false)
          setForm(f => ({ ...emptyForm(), deliveryDate: f.deliveryDate }))
        }, 800)
      } else {
        setTimeout(() => { setSaved(false); setModal(null) }, 1000)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Step 2: Simpan penerimaan di lokasi ──
  async function saveStep2() {
    if (!completing) return
    setSaving(true)
    try {
      let photoReceivedUrl = null
      if (step2.photoFile) photoReceivedUrl = await uploadPhoto(step2.photoFile, `${completing.id}/received.jpg`)

      const weightReceived = step2.weightReceived !== '' ? parseFloat(step2.weightReceived) : null

      await supabase.from('delivery_reports').update({
        weight_received: weightReceived,
        photo_received_url: photoReceivedUrl,
      }).eq('id', completing.id)

      if (completing.doId) {
        await supabase.from('documents').update({ status: 'delivered' }).eq('id', completing.doId)
      }

      setReports(prev => prev.map(r =>
        r.id === completing.id
          ? { ...r, weightReceived, photoReceivedUrl }
          : r
      ))

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setCompleting(null)
        setStep2({ weightReceived: '', photoFile: null, photoPreview: null })
      }, 1000)
    } finally {
      setSaving(false)
    }
  }

  const isDetail = modal && modal !== 'new'
  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday  = selectedDate === todayStr

  // Always show in-transit reports; show completed ones only for selectedDate
  const displayedReports = reports.filter(r => {
    const inTransit = r.weightReceived == null && r.photoReceivedUrl == null
    return inTransit || r.deliveryDate === selectedDate
  })

  return (
    <div style={{ maxWidth: 600, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Laporan Kirim</h2>
        <button
          onClick={() => { setForm(emptyForm()); setSaved(false); setModal('new') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#007aff', color: 'white', border: 'none',
            borderRadius: 10, padding: '8px 16px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF,
          }}
        >
          <Plus size={15} /> Tambah
        </button>
      </div>

      {/* Day Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 13, padding: '11px 16px', boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
        <button
          onClick={() => setSelectedDate(d => shiftDay(d, -1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} color="#007aff" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{fmtDay(selectedDate)}</span>
          {isToday && <span style={{ fontSize: 10, background: '#007aff', color: 'white', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>Hari Ini</span>}
        </div>
        <button
          onClick={() => setSelectedDate(d => shiftDay(d, 1))}
          disabled={isToday}
          style={{ background: 'none', border: 'none', cursor: isToday ? 'default' : 'pointer', color: isToday ? '#c7c7cc' : '#8e8e93', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* List */}
      {displayedReports.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 13,
          boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <Truck size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Belum ada laporan pengiriman</p>
          <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>Tap "+ Tambah" untuk membuat laporan baru</p>
        </div>
      ) : (
        <div style={{
          background: 'white', borderRadius: 13, overflow: 'hidden',
          boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)',
        }}>
          {displayedReports.map((r, idx) => {
            const inTransit = r.weightReceived == null && r.photoReceivedUrl == null
            const diff = r.weightSent != null && r.weightReceived != null
              ? r.weightReceived - r.weightSent : null
            return (
              <div
                key={r.id}
                onClick={() => {
                  if (inTransit) {
                    setStep2({ weightReceived: '', photoFile: null, photoPreview: null })
                    setSaved(false)
                    setCompleting(r)
                  } else {
                    setModal(r)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', cursor: 'pointer',
                  borderBottom: idx === displayedReports.length - 1 ? 'none' : '0.5px solid #f0f0f0',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: inTransit
                    ? 'linear-gradient(135deg, #ff9500, #ff6b00)'
                    : 'linear-gradient(135deg, #007aff, #34aadc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {inTransit
                    ? <MapPin size={20} color="white" strokeWidth={1.8} />
                    : <Truck size={20} color="white" strokeWidth={1.8} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.clientName}
                    </p>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: 0, flexShrink: 0, marginLeft: 8 }}>
                      {formatDate(r.deliveryDate)}
                    </p>
                  </div>

                  {inTransit ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: '#fff3e0', color: '#e65100',
                      }}>
                        Dalam Perjalanan · Tap untuk selesaikan
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>
                        Kirim <strong>{r.weightSent ?? '–'} kg</strong>
                        {' → '}
                        Terima <strong>{r.weightReceived ?? '–'} kg</strong>
                      </p>
                      {diff !== null && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                          background: diff < 0 ? '#fff0f0' : '#f0fff4',
                          color: diff < 0 ? '#ff3b30' : '#34c759',
                        }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>oleh {r.createdByName}</p>
                    {!inTransit && (r.photoSentUrl || r.photoReceivedUrl) && (
                      <div style={{ display: 'flex', gap: 3 }}>
                        {r.photoSentUrl && (
                          <div style={{ width: 20, height: 20, borderRadius: 4, overflow: 'hidden', background: '#f0f0f0' }}>
                            <img src={r.photoSentUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {r.photoReceivedUrl && (
