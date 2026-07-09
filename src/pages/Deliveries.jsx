import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, Check, Plus, X, Truck, Store, FileText, Calendar, Package, MapPin, ChevronLeft, ChevronRight, PackageCheck, Trash2, Edit2 } from 'lucide-react'
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
    itemWeights: {},
    photoSentFile: null, photoSentPreview: null,
    notes: '',
    doRef: '', doId: null, doItems: [],
    isPartial: false, partialNotes: '',
    hasLocationWeigh: false,
    weightReceived: '',
    itemWeightsReceived: {},
    photoReceivedFile: null, photoReceivedPreview: null,
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
    isPartial: r.is_partial || false,
    partialNotes: r.partial_notes || '',
  }
}

export default function Deliveries() {
  const { user, profile, isRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const canEdit = isRole('admin') || isRole('owner')
  const [reports, setReports] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [modal, setModal] = useState(null)        // null | 'new' | report-object (detail)
  const [completing, setCompleting] = useState(null) // in-transit report being completed (Step 2)
  const [form, setForm] = useState(emptyForm())
  const [step2, setStep2] = useState({ weightReceived: '', itemWeights: {}, photoFile: null, photoPreview: null })
  const [completingDoItems, setCompletingDoItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ weightSent: '', weightReceived: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [grDoRefs, setGrDoRefs] = useState(new Set())
  const [susulanInfo, setSusulanInfo] = useState(null)
  const sentRef = useRef(null)
  const recvRef = useRef(null)
  const recvRef2 = useRef(null)

  useEffect(() => {
    if (!completing?.doId) { setCompletingDoItems([]); return }
    supabase.from('documents').select('items').eq('id', completing.doId).single()
      .then(({ data }) => setCompletingDoItems(data?.items || []))
  }, [completing?.doId])

  useEffect(() => {
    supabase.from('delivery_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setReports(data.map(mapReport))
      })
  }, [])

  useEffect(() => {
    supabase.from('documents').select('ref_number').eq('type', 'GR')
      .then(({ data }) => {
        if (!data) return
        setGrDoRefs(new Set(data.map(d => d.ref_number).filter(Boolean)))
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

  function handlePhotoRecv2(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, photoReceivedFile: file, photoReceivedPreview: URL.createObjectURL(file) }))
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

      let effectiveWeightSent = form.weightSent !== '' ? parseFloat(form.weightSent) : null
      if (form.doItems.length > 0) {
        const vals = Object.values(form.itemWeights)
        if (vals.length > 0) {
          const sum = vals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
          if (sum > 0) effectiveWeightSent = sum
        }
      }

      // Timbang di lokasi sekarang (single-step mode)
      let photoReceivedUrl = null
      let effectiveWeightReceived = null
      if (form.hasLocationWeigh) {
        if (form.photoReceivedFile) photoReceivedUrl = await uploadPhoto(form.photoReceivedFile, `${id}/received.jpg`)
        effectiveWeightReceived = form.weightReceived !== '' ? parseFloat(form.weightReceived) : null
        if (form.doItems.length > 0) {
          const vals = Object.values(form.itemWeightsReceived)
          if (vals.length > 0) {
            const sum = vals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
            if (sum > 0) effectiveWeightReceived = sum
          }
        }
      }

      const report = mapReport({
        id,
        client_name: form.clientName.trim(),
        delivery_date: form.deliveryDate,
        weight_sent: effectiveWeightSent,
        weight_received: effectiveWeightReceived,
        photo_sent_url: photoSentUrl,
        photo_received_url: photoReceivedUrl,
        notes: form.notes.trim(),
        created_by_name: profile?.name || '',
        created_at: new Date().toISOString(),
        do_id: form.doId || null,
        do_ref: form.doRef || '',
        is_partial: form.isPartial,
        partial_notes: form.partialNotes.trim(),
      })

      setReports(prev => [report, ...prev])

      await supabase.from('delivery_reports').insert({
        id,
        client_name: report.clientName,
        delivery_date: report.deliveryDate,
        weight_sent: effectiveWeightSent,
        weight_received: effectiveWeightReceived,
        photo_sent_url: photoSentUrl,
        photo_received_url: photoReceivedUrl,
        notes: report.notes,
        created_by: user?.id,
        created_by_name: report.createdByName,
        do_id: form.doId || null,
        do_ref: form.doRef || null,
        is_partial: form.isPartial,
        partial_notes: form.partialNotes.trim() || null,
      })

      if (form.hasLocationWeigh && form.doId && !form.isPartial) {
        await supabase.from('documents').update({ status: 'delivered' }).eq('id', form.doId)
      }

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

      let weightReceived = step2.weightReceived !== '' ? parseFloat(step2.weightReceived) : null
      if (completingDoItems.length > 0) {
        const vals = Object.values(step2.itemWeights)
        if (vals.length > 0) {
          const sum = vals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
          if (sum > 0) weightReceived = sum
        }
      }

      await supabase.from('delivery_reports').update({
        weight_received: weightReceived,
        photo_received_url: photoReceivedUrl,
      }).eq('id', completing.id)

      if (completing.doId && !completing.isPartial) {
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
        setStep2({ weightReceived: '', itemWeights: {}, photoFile: null, photoPreview: null })
      }, 1000)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(report) {
    setEditForm({
      weightSent: report.weightSent != null ? String(report.weightSent) : '',
      weightReceived: report.weightReceived != null ? String(report.weightReceived) : '',
    })
    setEditing(report)
  }

  async function saveEdit() {
    if (!editing) return
    setEditSaving(true)
    try {
      const ws = editForm.weightSent !== '' ? parseFloat(editForm.weightSent) : null
      const wr = editForm.weightReceived !== '' ? parseFloat(editForm.weightReceived) : null
      await supabase.from('delivery_reports').update({ weight_sent: ws, weight_received: wr }).eq('id', editing.id)
      setReports(prev => prev.map(r => r.id === editing.id ? { ...r, weightSent: ws, weightReceived: wr } : r))
      if (modal && modal !== 'new' && modal.id === editing.id) setModal(prev => ({ ...prev, weightSent: ws, weightReceived: wr }))
      if (completing?.id === editing.id) setCompleting(prev => ({ ...prev, weightSent: ws }))
      setEditing(null)
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteReport(report) {
    await supabase.from('delivery_reports').delete().eq('id', report.id)
    setReports(prev => prev.filter(r => r.id !== report.id))
    setModal(null)
    setConfirmDelete(false)
  }

  async function handleBuatGR(report) {
    let prefillDoc = null
    if (report.doId) {
      const { data } = await supabase.from('documents').select('*').eq('id', report.doId).single()
      if (data) {
        prefillDoc = {
          number: data.number,
          clientName: data.client_name || report.clientName,
          clientAddress: data.client_address || '',
          clientPhone: data.client_phone || '',
          clientPoNumber: data.client_po_number || '',
          items: (data.items || []).map(it => ({
            ...it,
            id: crypto.randomUUID(),
            receivedQty: String(it.qty ?? ''),
            condition: 'Baik',
            price: null,
            total: null,
          })),
        }
      }
    }
    setModal(null)
    navigate('/dashboard/documents', { state: { createType: 'GR', refNumber: report.doRef, prefillDoc } })
  }

  function handleSusulan(report) {
    // Compute rekap synchronously from in-memory reports — no network wait
    const doReports = reports.filter(r =>
      (r.doId && r.doId === report.doId) ||
      (!r.doId && r.doRef && r.doRef === report.doRef)
    )
    const totalSent     = doReports.reduce((s, r) => s + (r.weightSent || 0), 0)
    const totalReceived = doReports.filter(r => r.weightReceived != null).reduce((s, r) => s + (r.weightReceived || 0), 0)

    setSusulanInfo({
      doRef: report.doRef,
      deliveryCount: doReports.length,
      doOrderedKg: null,   // loaded in background below
      totalSent,
      totalReceived,
      deficit: Math.max(0, totalSent - totalReceived),
    })
    setConfirmDelete(false)
    setForm({ ...emptyForm(), doRef: report.doRef || '', doId: report.doId || null, doItems: [], clientName: report.clientName || '' })
    setSaved(false)
    setModal('new')

    // Load DO items + compute doOrderedKg after form is already open
    if (report.doId) {
      supabase.from('documents').select('items').eq('id', report.doId).single()
        .then(({ data }) => {
          const doItems = data?.items || []
          const allKg = doItems.length > 0 && doItems.every(it => (it.unit || '').toLowerCase() === 'kg')
          const doOrderedKg = allKg ? doItems
          setForm(f => ({ ...f, doItems }))
          setSusulanInfo(prev => {
            if (!prev) return prev
            const deficit = doOrderedKg != null
              ? Math.max(0, doOrderedKg - prev.totalReceived)
              : Math.max(0, prev.totalSent - prev.totalReceived)
            return { ...prev, doOrderedKg, deficit }
          })
        })
        .catch(() => {})
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

  // Partial DO groups: DOs with at least one partial delivery and no GR yet
  const partialDoGroups = (() => {
    const partialKeys = new Set(
      reports.filter(r => r.isPartial).map(r => r.doId || r.doRef).filter(Boolean)
    )
    const grouped = {}
    reports.forEach(r => {
      const key = r.doId || r.doRef
      if (!key || !partialKeys.has(key)) return
      if (!grouped[key]) grouped[key] = { doRef: r.doRef, doId: r.doId, clientName: r.clientName, reports: [] }
      grouped[key].reports.push(r)
    })
    return Object.values(grouped)
      .filter(g => !grDoRefs.has(g.doRef))
      .map(g => {
        const totalSent = g.reports.reduce((s, r) => s + (r.weightSent || 0), 0)
        const totalReceived = g.reports.filter(r => r.weightReceived != null).reduce((s, r) => s + (r.weightReceived || 0), 0)
        const pendingCount = g.reports.filter(r => r.weightReceived == null && r.photoReceivedUrl == null).length
        return { ...g, totalSent, totalReceived, deficit: Math.max(0, totalSent - totalReceived), pendingCount }
      })
      .filter(g => g.deficit > 0 || g.pendingCount > 0)
  })()

  return (
    <div style={{ maxWidth: 600, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Laporan Kirim</h2>
        <button
          onClick={() => { setForm(emptyForm()); setSaved(false); setSusulanInfo(null); setModal('new') }}
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

      {/* Partial DO Summary */}
      {partialDoGroups.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,140,0,0.2)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
          <div style={{ padding: '11px 16px', borderBottom: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, background: '#fff0f0', color: '#ff3b30', borderRadius: 99, padding: '2px 9px' }}>⚠ Partial Belum Selesai</span>
            <span style={{ fontSize: 12, color: '#8e8e93' }}>{partialDoGroups.length} DO</span>
          </div>
          {partialDoGroups.map((g, idx) => {
            const latestPartial = g.reports.filter(r => r.isPartial).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
            const canSusulan = g.pendingCount === 0 && latestPartial
            return (
              <div key={g.doRef || idx} style={{ padding: '12px 16px', borderBottom: idx < partialDoGroups.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{g.clientName}</p>
                    {g.doRef && <span style={{ fontSize: 11.5, color: '#007aff', fontWeight: 500, background: '#e8f4ff', padding: '1px 7px', borderRadius: 5 }}>{g.doRef}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#8e8e93' }}>{g.reports.length} kiriman</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: canSusulan ? 10 : 0 }}>
                  <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>
                    Total kirim <strong>{g.totalSent.toFixed(1)} kg</strong>
                    {' · '}
                    Diterima <strong>{g.totalReceived.toFixed(1)} kg</strong>
                  </p>
                  {g.deficit > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#fff0f0', color: '#ff3b30' }}>
                      Kurang {g.deficit.toFixed(1)} kg
                    </span>
                  )}
                  {g.pendingCount > 0 && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: '#fff3e0', color: '#e65100' }}>
                      {g.pendingCount} dalam perjalanan
                    </span>
                  )}
                </div>
                {canSusulan && (
                  <button
                    onClick={() => handleSusulan(latestPartial)}
                    style={{ padding: '8px 16px', background: '#ff9500', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Truck size={13} /> Kirim Susulan
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Day Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '11px 16px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
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
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <Truck size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Belum ada laporan pengiriman</p>
          <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>Tap "+ Tambah" untuk membuat laporan baru</p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
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
                    setStep2({ weightReceived: '', itemWeights: {}, photoFile: null, photoPreview: null })
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: '#fff3e0', color: '#e65100',
                      }}>
                        Dalam Perjalanan · Tap untuk selesaikan
                      </span>
                      {r.isPartial && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: '#fff0f0', color: '#ff3b30',
                        }}>
                          ⚠ Partial
                        </span>
                      )}
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
                      {r.isPartial && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                          background: '#fff0f0', color: '#ff3b30',
                        }}>
                          ⚠ Partial
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>oleh {r.createdByName}</p>
                    {r.doRef && (
                      <span style={{ fontSize: 11.5, color: '#007aff', fontWeight: 500, background: '#e8f4ff', padding: '1px 7px', borderRadius: 5 }}>
                        {r.doRef}
                      </span>
                    )}
                    {!inTransit && (r.photoSentUrl || r.photoReceivedUrl) && (
                      <div style={{ display: 'flex', gap: 3 }}>
                        {r.photoSentUrl && (
                          <div style={{ width: 20, height: 20, borderRadius: 4, overflow: 'hidden', background: '#f0f0f0' }}>
                            <img src={r.photoSentUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {r.photoReceivedUrl && (
                          <div style={{ width: 20, height: 20, borderRadius: 4, overflow: 'hidden', background: '#f0f0f0' }}>
                            <img src={r.photoReceivedUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: Step 1 — Laporan Keberangkatan
      ────────────────────────────────────────── */}
      {modal === 'new' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#f2f2f7', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', ...FF,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6',
              position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1,
            }}>
              <button onClick={() => { setModal(null); setSusulanInfo(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                <X size={22} />
              </button>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Laporan Pengiriman</p>
              <button
                onClick={() => saveStep1()}
                disabled={saving || !form.clientName.trim()}
                style={{
                  background: 'none', border: 'none', cursor: saving || !form.clientName.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 600, padding: 0, ...FF,
                  color: saved ? '#34c759' : !form.clientName.trim() ? '#c7c7cc' : '#007aff',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {saved ? <><Check size={15} /> Tersimpan</> : saving ? '...' : 'Berangkat'}
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Step bar */}
              <StepBar step={1} />

              {/* DO Reference Badge */}
              {form.doRef && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>Delivery Order</p>
                  <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff8e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={16} color="#ff9500" strokeWidth={1.9} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{form.doRef}</p>
                        <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{form.clientName}</p>
                      </div>
                    </div>
                    {form.doItems.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {form.doItems.map((it, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 13.5, color: '#3c3c43', margin: 0 }}>{it.name}</p>
                            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{it.qty} {it.unit}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Susulan Rekap */}
              {susulanInfo && form.doRef === susulanInfo.doRef && (
                <div style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.18)', borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#ff3b30', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Rekap Pengiriman Sebelumnya ({susulanInfo.deliveryCount}x)
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {susulanInfo.doOrderedKg != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13.5, color: '#3c3c43' }}>Target DO</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e' }}>{susulanInfo.doOrderedKg.toFixed(1)} kg</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, color: '#3c3c43' }}>Total sudah dikirim</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e' }}>{susulanInfo.totalSent.toFixed(1)} kg</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, color: '#3c3c43' }}>Total sudah diterima</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e' }}>{susulanInfo.totalReceived.toFixed(1)} kg</span>
                    </div>
                    <div style={{ height: '0.5px', background: 'rgba(255,59,48,0.2)', margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#ff3b30' }}>Sisa perlu dikirim</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#ff3b30', letterSpacing: '-0.02em' }}>{susulanInfo.deficit.toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Foto & Berat Kirim (Gudang) */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Timbang di Gudang
                </p>
                <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  <div
                    onClick={() => sentRef.current?.click()}
                    style={{
                      height: 180, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      background: form.photoSentPreview ? 'transparent' : '#f2f2f7',
                      border: form.photoSentPreview ? 'none' : '1.5px dashed #c7c7cc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {form.photoSentPreview
                      ? <img src={form.photoSentPreview} alt="kirim" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ textAlign: 'center' }}>
                          <Camera size={30} color="#c7c7cc" style={{ display: 'block', margin: '0 auto' }} />
                          <p style={{ fontSize: 13, color: '#c7c7cc', marginTop: 10, marginBottom: 0 }}>Foto timbangan saat kirim</p>
                        </div>
                    }
                    {form.photoSentPreview && (
                      <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 7, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Camera size={12} color="white" />
                        <span style={{ fontSize: 12, color: 'white' }}>Ganti</span>
                      </div>
                    )}
                  </div>
                  <input ref={sentRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSent} style={{ display: 'none' }} />

                  {form.doItems.length > 0 ? (
                    <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {form.doItems.map((it, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          paddingBottom: 11, marginBottom: 11,
                          borderBottom: i < form.doItems.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0, lineHeight: 1.3 }}>{it.name}</p>
                            <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>DO: {it.qty} {it.unit}</p>
                          </div>
                          <input
                            type="number" step="0.1" min="0"
                            value={form.itemWeights[i] ?? ''}
                            onChange={e => setForm(f => ({ ...f, itemWeights: { ...f.itemWeights, [i]: e.target.value } }))}
                            placeholder="0.0"
                            style={{ width: 72, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                          />
                          <span style={{ fontSize: 14, color: '#8e8e93', flexShrink: 0 }}>kg</span>
                        </div>
                      ))}
                      {Object.values(form.itemWeights).some(v => v !== '' && v !== undefined) && (() => {
                        const total = Object.values(form.itemWeights).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '0.5px solid #e5e5ea' }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Total Berat Kirim</p>
                            <p style={{ fontSize: 17, fontWeight: 700, color: '#007aff', margin: 0 }}>{total.toFixed(1)} kg</p>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid #f0f0f0', paddingTop: 14 }}>
                      <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, fontWeight: 400 }}>Berat Kirim</p>
                      <input
                        type="number" step="0.1" min="0"
                        value={form.weightSent}
                        onChange={e => setForm(f => ({ ...f, weightSent: e.target.value }))}
                        placeholder="0.0"
                        style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                      />
                      <span style={{ fontSize: 15, color: '#8e8e93' }}>kg</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timbang di Lokasi Sekarang (toggle) */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Timbang di Lokasi
                </p>
                <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  {/* Toggle row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderBottom: form.hasLocationWeigh ? '0.5px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flex: 1, fontWeight: 400 }}>Timbang di Resto Sekarang</p>
                    <div
                      onClick={() => setForm(f => ({ ...f, hasLocationWeigh: !f.hasLocationWeigh }))}
                      style={{
                        width: 51, height: 31, borderRadius: 16, cursor: 'pointer', flexShrink: 0,
                        background: form.hasLocationWeigh ? '#34c759' : '#e5e5ea',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2,
                        left: form.hasLocationWeigh ? 22 : 2,
                        width: 27, height: 27, borderRadius: '50%',
                        background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.22)',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </div>

                  {/* Location weigh inputs — shown when toggled on */}
                  {form.hasLocationWeigh && (
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Photo */}
                      <div
                        onClick={() => recvRef2.current?.click()}
                        style={{
                          height: 160, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                          background: form.photoReceivedPreview ? 'transparent' : '#f2f2f7',
                          border: form.photoReceivedPreview ? 'none' : '1.5px dashed #c7c7cc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {form.photoReceivedPreview
                          ? <img src={form.photoReceivedPreview} alt="terima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ textAlign: 'center' }}>
                              <Camera size={28} color="#c7c7cc" style={{ display: 'block', margin: '0 auto' }} />
                              <p style={{ fontSize: 13, color: '#c7c7cc', marginTop: 10, marginBottom: 0 }}>Foto timbangan diterima resto</p>
                            </div>
                        }
                        {form.photoReceivedPreview && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 7, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Camera size={12} color="white" />
                            <span style={{ fontSize: 12, color: 'white' }}>Ganti</span>
                          </div>
                        )}
                      </div>
                      <input ref={recvRef2} type="file" accept="image/*" capture="environment" onChange={handlePhotoRecv2} style={{ display: 'none' }} />

                      {/* Weight inputs */}
                      {form.doItems.length > 0 ? (
                        <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {form.doItems.map((it, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              paddingBottom: 11, marginBottom: 11,
                              borderBottom: i < form.doItems.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0, lineHeight: 1.3 }}>{it.name}</p>
                                <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>DO: {it.qty} {it.unit}</p>
                              </div>
                              <input
                                type="number" step="0.1" min="0"
                                value={form.itemWeightsReceived[i] ?? ''}
                                onChange={e => setForm(f => ({ ...f, itemWeightsReceived: { ...f.itemWeightsReceived, [i]: e.target.value } }))}
                                placeholder="0.0"
                                style={{ width: 72, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                              />
                              <span style={{ fontSize: 14, color: '#8e8e93', flexShrink: 0 }}>kg</span>
                            </div>
                          ))}
                          {Object.values(form.itemWeightsReceived).some(v => v !== '' && v !== undefined) && (() => {
                            const total = Object.values(form.itemWeightsReceived).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '0.5px solid #e5e5ea' }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Total Berat Terima</p>
                                <p style={{ fontSize: 17, fontWeight: 700, color: '#34c759', margin: 0 }}>{total.toFixed(1)} kg</p>
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid #f0f0f0', paddingTop: 14 }}>
                          <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, fontWeight: 400 }}>Berat Terima</p>
                          <input
                            type="number" step="0.1" min="0"
                            value={form.weightReceived}
                            onChange={e => setForm(f => ({ ...f, weightReceived: e.target.value }))}
                            placeholder="0.0"
                            style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                          />
                          <span style={{ fontSize: 15, color: '#8e8e93' }}>kg</span>
                        </div>
                      )}

                      {/* Live selisih preview */}
                      {(() => {
                        const sentTotal = form.doItems.length > 0
                          ? Object.values(form.itemWeights).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                          : (form.weightSent !== '' ? parseFloat(form.weightSent) : null)
                        const recvTotal = form.doItems.length > 0
                          ? Object.values(form.itemWeightsReceived).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                          : (form.weightReceived !== '' ? parseFloat(form.weightReceived) : null)
                        const hasSent = form.doItems.length > 0
                          ? Object.values(form.itemWeights).some(v => v !== '' && v !== undefined)
                          : form.weightSent !== ''
                        const hasRecv = form.doItems.length > 0
                          ? Object.values(form.itemWeightsReceived).some(v => v !== '' && v !== undefined)
                          : form.weightReceived !== ''
                        if (!hasSent || !hasRecv || sentTotal === null || recvTotal === null) return null
                        const diff = recvTotal - sentTotal
                        if (isNaN(diff)) return null
                        return (
                          <div style={{
                            background: diff < 0 ? '#fff0f0' : '#f0fff4',
                            borderRadius: 10, padding: '12px 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            border: `0.5px solid ${diff < 0 ? 'rgba(255,59,48,0.15)' : 'rgba(52,199,89,0.2)'}`,
                          }}>
                            <p style={{ fontSize: 14, color: '#8e8e93', margin: 0 }}>Selisih Berat</p>
                            <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: diff < 0 ? '#ff3b30' : '#34c759' }}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Pengiriman */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Info Pengiriman
                </p>
                <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, minWidth: 80, fontWeight: 400 }}>Klien/Resto</p>
                    <input
                      value={form.clientName}
                      onChange={e => !form.doRef && setForm(f => ({ ...f, clientName: e.target.value }))}
                      readOnly={!!form.doRef}
                      placeholder="Nama restoran / klien"
                      style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: form.doRef ? '#8e8e93' : '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#5856d6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, minWidth: 80, fontWeight: 400 }}>Tanggal</p>
                    <input
                      type="date" value={form.deliveryDate}
                      onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                      style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <FileText size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, minWidth: 80, fontWeight: 400, paddingTop: 2 }}>Catatan</p>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Kondisi barang, kendala, dll."
                      rows={2}
                      style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }}
                    />
                  </div>

                  {/* Partial toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderBottom: form.isPartial ? '0.5px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Truck size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flex: 1, fontWeight: 400 }}>Pengiriman Partial</p>
                    <div
                      onClick={() => setForm(f => ({ ...f, isPartial: !f.isPartial }))}
                      style={{
                        width: 51, height: 31, borderRadius: 16, cursor: 'pointer', flexShrink: 0,
                        background: form.isPartial ? '#ff3b30' : '#e5e5ea',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2,
                        left: form.isPartial ? 22 : 2,
                        width: 27, height: 27, borderRadius: '50%',
                        background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.22)',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </div>

                  {/* Partial notes (conditional) */}
                  {form.isPartial && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 16px' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Package size={15} color="white" strokeWidth={1.9} />
                      </div>
                      <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, minWidth: 80, fontWeight: 400, paddingTop: 2 }}>Sisa/Susulan</p>
                      <textarea
                        value={form.partialNotes}
                        onChange={e => setForm(f => ({ ...f, partialNotes: e.target.value }))}
                        placeholder="Item / qty yang belum dikirim..."
                        rows={2}
                        style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }}
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Simpan & Lanjut button */}
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={() => saveStep1(true)}
                disabled={saving || !form.clientName.trim()}
                style={{
                  width: '100%', padding: '15px',
                  background: !form.clientName.trim() ? '#e5e5ea' : saved ? '#28cd41' : '#34c759',
                  border: 'none', borderRadius: 13,
                  color: !form.clientName.trim() ? '#c7c7cc' : 'white',
                  fontSize: 15, fontWeight: 600,
                  cursor: !form.clientName.trim() ? 'not-allowed' : 'pointer',
                  ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                {saved ? <><Check size={16} /> Tersimpan — isi resto berikutnya</> : <><Truck size={16} /> Simpan & Resto Berikutnya</>}
              </button>
            </div>

            <div style={{ height: 24 }} />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: Step 2 — Selesaikan di Lokasi
      ────────────────────────────────────────── */}
      {completing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#f2f2f7', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', ...FF,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6',
              position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1,
            }}>
              <button
                onClick={() => { setCompleting(null); setStep2({ weightReceived: '', itemWeights: {}, photoFile: null, photoPreview: null }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}
              >
                <X size={22} />
              </button>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Selesaikan Pengiriman</p>
              <button
                onClick={saveStep2}
                disabled={saving}
                style={{
                  background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 600, padding: 0, ...FF,
                  color: saved ? '#34c759' : '#007aff',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {saved ? <><Check size={15} /> Selesai</> : saving ? '...' : 'Simpan'}
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Step bar */}
              <StepBar step={2} />

              {/* Info laporan keberangkatan */}
              <div style={{
                background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #34c759, #30d158)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={18} color="white" strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{completing.clientName}</p>
                    {completing.isPartial && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#fff0f0', color: '#ff3b30' }}>⚠ Partial</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#8e8e93', margin: '2px 0 0' }}>
                    Kirim {completing.weightSent != null ? `${completing.weightSent} kg` : '–'} · {formatDate(completing.deliveryDate)}
                  </p>
                </div>
              </div>

              {/* Edit berat kirim (gudang) — all roles */}
              <button
                onClick={() => openEdit(completing)}
                style={{
                  alignSelf: 'flex-start', padding: '7px 14px',
                  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                  border: '0.5px solid #e5e5ea', borderRadius: 10, color: '#007aff',
                  fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, ...FF,
                }}
              >
                <Edit2 size={13} /> Edit Berat Kirim
              </button>

              {/* Partial info in Step 2 */}
              {completing.isPartial && (
                <div style={{
                  background: '#fff0f0', borderRadius: 13, padding: '14px 16px',
                  boxShadow: '0 0 0 0.5px rgba(255,59,48,0.2)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{ fontSize: 15 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#ff3b30', margin: 0 }}>Pengiriman Partial — ada susulan</p>
                    {completing.partialNotes && (
                      <p style={{ fontSize: 13, color: '#3c3c43', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {completing.partialNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Foto timbang di gudang (readonly preview) */}
              {completing.photoSentUrl && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                    Foto Gudang (Step 1)
                  </p>
                  <div style={{ height: 130, borderRadius: 13, overflow: 'hidden' }}>
                    <img src={completing.photoSentUrl} alt="gudang" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              )}

              {/* Foto & Berat Terima (Lokasi) */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Timbang di Lokasi
                </p>
                <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                  <div
                    onClick={() => recvRef.current?.click()}
                    style={{
                      height: 180, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      background: step2.photoPreview ? 'transparent' : '#f2f2f7',
                      border: step2.photoPreview ? 'none' : '1.5px dashed #c7c7cc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {step2.photoPreview
                      ? <img src={step2.photoPreview} alt="terima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ textAlign: 'center' }}>
                          <Camera size={30} color="#c7c7cc" style={{ display: 'block', margin: '0 auto' }} />
                          <p style={{ fontSize: 13, color: '#c7c7cc', marginTop: 10, marginBottom: 0 }}>Foto timbangan diterima resto</p>
                        </div>
                    }
                    {step2.photoPreview && (
                      <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 7, padding: '5px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Camera size={12} color="white" />
                        <span style={{ fontSize: 12, color: 'white' }}>Ganti</span>
                      </div>
                    )}
                  </div>
                  <input ref={recvRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoRecv} style={{ display: 'none' }} />

                  {completingDoItems.length > 0 ? (
                    <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {completingDoItems.map((it, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          paddingBottom: 11, marginBottom: 11,
                          borderBottom: i < completingDoItems.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0, lineHeight: 1.3 }}>{it.name}</p>
                            <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>DO: {it.qty} {it.unit}</p>
                          </div>
                          <input
                            type="number" step="0.1" min="0"
                            value={step2.itemWeights[i] ?? ''}
                            onChange={e => setStep2(s => ({ ...s, itemWeights: { ...s.itemWeights, [i]: e.target.value } }))}
                            placeholder="0.0"
                            style={{ width: 72, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                          />
                          <span style={{ fontSize: 14, color: '#8e8e93', flexShrink: 0 }}>kg</span>
                        </div>
                      ))}
                      {Object.values(step2.itemWeights).some(v => v !== '' && v !== undefined) && (() => {
                        const total = Object.values(step2.itemWeights).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '0.5px solid #e5e5ea' }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>Total Berat Terima</p>
                            <p style={{ fontSize: 17, fontWeight: 700, color: '#34c759', margin: 0 }}>{total.toFixed(1)} kg</p>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid #f0f0f0', paddingTop: 14 }}>
                      <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, fontWeight: 400 }}>Berat Terima</p>
                      <input
                        type="number" step="0.1" min="0"
                        value={step2.weightReceived}
                        onChange={e => setStep2(s => ({ ...s, weightReceived: e.target.value }))}
                        placeholder="0.0"
                        autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                      />
                      <span style={{ fontSize: 15, color: '#8e8e93' }}>kg</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live selisih preview */}
              {completing.weightSent != null && (() => {
                const recvTotal = completingDoItems.length > 0
                  ? Object.values(step2.itemWeights).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                  : (step2.weightReceived !== '' ? parseFloat(step2.weightReceived) : null)
                const hasInput = completingDoItems.length > 0
                  ? Object.values(step2.itemWeights).some(v => v !== '' && v !== undefined)
                  : step2.weightReceived !== ''
                if (!hasInput || recvTotal === null) return null
                const diff = recvTotal - completing.weightSent
                if (isNaN(diff)) return null
                return (
                  <div style={{
                    background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontSize: 15, color: '#8e8e93', margin: 0 }}>Selisih Berat</p>
                    <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: diff < 0 ? '#ff3b30' : '#34c759' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}

            </div>

            {/* Tombol Selesai */}
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={saveStep2}
                disabled={saving}
                style={{
                  width: '100%', padding: '15px',
                  background: saved ? '#28cd41' : '#007aff',
                  border: 'none', borderRadius: 13,
                  color: 'white', fontSize: 15, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                {saved ? <><Check size={16} /> Pengiriman Selesai!</> : <><Check size={16} /> Selesaikan Pengiriman</>}
              </button>
            </div>

            <div style={{ height: 24 }} />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: Detail View (laporan selesai)
      ────────────────────────────────────────── */}
      {isDetail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#f2f2f7', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', ...FF,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6',
              position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1,
            }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{modal.clientName}</p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Photos side by side */}
              <div className="rg-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Foto Kirim</p>
                  <div style={{ height: 150, borderRadius: 10, background: '#e5e5ea', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {modal.photoSentUrl
                      ? <img src={modal.photoSentUrl} alt="kirim" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Camera size={24} color="#c7c7cc" />
                    }
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', marginTop: 8, marginBottom: 0, textAlign: 'center' }}>
                    {modal.weightSent != null ? `${modal.weightSent} kg` : '–'}
                  </p>
                  <p style={{ fontSize: 11, color: '#8e8e93', textAlign: 'center', margin: '2px 0 0' }}>dikirim</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Foto Terima</p>
                  <div style={{ height: 150, borderRadius: 10, background: '#e5e5ea', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {modal.photoReceivedUrl
                      ? <img src={modal.photoReceivedUrl} alt="terima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Camera size={24} color="#c7c7cc" />
                    }
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', marginTop: 8, marginBottom: 0, textAlign: 'center' }}>
                    {modal.weightReceived != null ? `${modal.weightReceived} kg` : '–'}
                  </p>
                  <p style={{ fontSize: 11, color: '#8e8e93', textAlign: 'center', margin: '2px 0 0' }}>diterima</p>
                </div>
              </div>

              {/* Selisih berat */}
              {modal.weightSent != null && modal.weightReceived != null && (() => {
                const diff = modal.weightReceived - modal.weightSent
                return (
                  <div style={{
                    background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontSize: 15, color: '#8e8e93', margin: 0 }}>Selisih Berat</p>
                    <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: diff < 0 ? '#ff3b30' : '#34c759' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}

              {/* Partial banner */}
              {modal.isPartial && (
                <div style={{
                  background: '#fff0f0', borderRadius: 13, padding: '14px 16px',
                  boxShadow: '0 0 0 0.5px rgba(255,59,48,0.25)',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#ff3b30', margin: 0 }}>Pengiriman Partial</p>
                    {modal.partialNotes && (
                      <p style={{ fontSize: 13.5, color: '#3c3c43', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {modal.partialNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Info rows */}
              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                <InfoRow label="Tanggal" value={formatDate(modal.deliveryDate)} />
                {modal.doRef && <InfoRow label="DO" value={modal.doRef} />}
                <InfoRow label="Dibuat oleh" value={modal.createdByName} last={!modal.notes} />
                {modal.notes && <InfoRow label="Catatan" value={modal.notes} last />}
              </div>

              {/* Edit Berat — all roles */}
              {!confirmDelete && (
                <button
                  onClick={() => openEdit(modal)}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    border: '0.5px solid #e5e5ea', borderRadius: 13,
                    color: '#007aff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Edit2 size={15} /> Edit Berat
                </button>
              )}

              {/* Kirim Susulan — semua role bisa, tampil hanya jika partial */}
              {!confirmDelete && modal.isPartial && (
                <button
                  onClick={() => handleSusulan(modal)}
                  style={{
                    width: '100%', padding: '14px',
                    background: '#ff9500', border: 'none', borderRadius: 13,
                    color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Truck size={16} /> Kirim Susulan
                </button>
              )}

              {/* Admin/Owner actions */}
              {canEdit && !confirmDelete && (() => {
                const doDeliveries = modal.doId ? reports.filter(r => r.doId === modal.doId) : []
                // GR hanya terkunci jika pengiriman INI partial (masih ada susulan yang pending)
                const pendingCount = modal.isPartial
                  ? doDeliveries.filter(r => r.id !== modal.id && (r.weightReceived == null || r.photoReceivedUrl == null)).length
                  : 0
                const allDOComplete = !modal.isPartial || pendingCount === 0
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modal.doRef && (
                      <>
                        <button
                          onClick={allDOComplete ? () => handleBuatGR(modal) : undefined}
                          disabled={!allDOComplete}
                          style={{
                            width: '100%', padding: '14px',
                            background: allDOComplete ? '#34c759' : '#e5e5ea',
                            border: 'none', borderRadius: 13,
                            color: allDOComplete ? 'white' : '#c7c7cc',
                            fontSize: 15, fontWeight: 600,
                            cursor: allDOComplete ? 'pointer' : 'not-allowed',
                            ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          <PackageCheck size={16} /> Buat GR
                        </button>
                        {!allDOComplete && (
                          <p style={{ fontSize: 12.5, color: '#ff9500', textAlign: 'center', margin: 0, fontWeight: 500 }}>
                            ⚠ Masih ada {pendingCount} pengiriman belum selesai untuk {modal.doRef}
                          </p>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{ padding: '14px 18px', background: '#fff0f0', border: '0.5px solid rgba(255,59,48,0.2)', borderRadius: 13, color: '#ff3b30', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Trash2 size={15} /> Hapus
                    </button>
                  </div>
                )
              })()}

              {canEdit && confirmDelete && (
                <div style={{ background: '#fff0f0', borderRadius: 13, padding: '16px', border: '0.5px solid rgba(255,59,48,0.2)' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#ff3b30', margin: '0 0 12px' }}>
                    Yakin hapus laporan ini?
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => deleteReport(modal)}
                      style={{ flex: 1, padding: '12px', background: '#ff3b30', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...FF }}
                    >
                      Ya, Hapus
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{ flex: 1, padding: '12px', background: '#e5e5ea', border: 'none', borderRadius: 10, color: '#3c3c43', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          MODAL: Edit Berat
      ────────────────────────────────────────── */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#f2f2f7', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 560, ...FF,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6',
            }}>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                <X size={22} />
              </button>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Edit Berat</p>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                style={{ background: 'none', border: 'none', cursor: editSaving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 600, color: '#007aff', padding: 0, ...FF }}
              >
                {editSaving ? '...' : 'Simpan'}
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13.5, color: '#8e8e93', margin: 0 }}>
                {editing.clientName} · {formatDate(editing.deliveryDate)}
              </p>

              <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: editing.weightReceived != null ? '0.5px solid #f0f0f0' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ff9500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={15} color="white" strokeWidth={1.9} />
                  </div>
                  <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flex: 1, fontWeight: 400 }}>Berat Kirim</p>
                  <input
                    type="number" step="0.1" min="0"
                    value={editForm.weightSent}
                    onChange={e => setEditForm(f => ({ ...f, weightSent: e.target.value }))}
                    placeholder="0.0"
                    autoFocus
                    style={{ width: 80, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                  />
                  <span style={{ fontSize: 15, color: '#8e8e93', flexShrink: 0 }}>kg</span>
                </div>
                {editing.weightReceived != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={15} color="white" strokeWidth={1.9} />
                    </div>
                    <p style={{ fontSize: 15, color: '#1c1c1e', margin: 0, flex: 1, fontWeight: 400 }}>Berat Terima</p>
                    <input
                      type="number" step="0.1" min="0"
                      value={editForm.weightReceived}
                      onChange={e => setEditForm(f => ({ ...f, weightReceived: e.target.value }))}
                      placeholder="0.0"
                      style={{ width: 80, border: 'none', outline: 'none', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#3c3c43', background: 'transparent', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: 15, color: '#8e8e93', flexShrink: 0 }}>kg</span>
                  </div>
                )}
              </div>

              {/* Live selisih in edit modal */}
              {editing.weightReceived != null && editForm.weightSent !== '' && editForm.weightReceived !== '' && (() => {
                const ws = parseFloat(editForm.weightSent)
                const wr = parseFloat(editForm.weightReceived)
                if (isNaN(ws) || isNaN(wr)) return null
                const diff = wr - ws
                return (
                  <div style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)', WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.88)', boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 15, color: '#8e8e93', margin: 0 }}>Selisih Berat</p>
                    <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: diff < 0 ? '#ff3b30' : '#34c759' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}

              <button
                onClick={saveEdit}
                disabled={editSaving}
                style={{
                  width: '100%', padding: '15px',
                  background: '#007aff', border: 'none', borderRadius: 13,
                  color: 'white', fontSize: 15, fontWeight: 600,
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {editSaving ? '...' : <><Check size={16} /> Simpan Perubahan</>}
              </button>
            </div>
            <div style={{ height: 32 }} />
          </div>
        </div>
      )}

    </div>
  )
}
