import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Camera, Check, Plus, X, Truck, Store, FileText, Calendar, Package } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }

function formatDate(str) {
  if (!str) return ''
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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

export default function Deliveries() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [reports, setReports] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const sentRef = useRef(null)
  const recvRef = useRef(null)

  function emptyForm() {
    return {
      clientName: '', deliveryDate: new Date().toISOString().slice(0, 10),
      weightSent: '', weightReceived: '',
      photoSentFile: null, photoSentPreview: null,
      photoReceivedFile: null, photoReceivedPreview: null,
      notes: '',
      doRef: '', doId: null, doItems: [],
    }
  }

  useEffect(() => {
    supabase.from('delivery_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setReports(data.map(r => ({
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
        })))
      })
  }, [])

  useEffect(() => {
    if (location.state?.doRef) {
      const { doRef, doId, clientName, items } = location.state
      setForm(f => ({ ...f, doRef: doRef || '', doId: doId || null, doItems: items || [], clientName: clientName || '' }))
      setSaved(false)
      setModal('new')
      window.history.replaceState({}, document.title)
    }
  }, [])

  function handlePhoto(type, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    if (type === 'sent') setForm(f => ({ ...f, photoSentFile: file, photoSentPreview: preview }))
    else setForm(f => ({ ...f, photoReceivedFile: file, photoReceivedPreview: preview }))
    e.target.value = ''
  }

  async function uploadPhoto(file, path) {
    try {
      await supabase.storage.from('delivery-photos').upload(path, file, { upsert: true })
      const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path)
      return data?.publicUrl || null
    } catch { return null }
  }

  async function save(andContinue = false) {
    if (!form.clientName.trim()) return
    setSaving(true)
    try {
      const id = crypto.randomUUID()
      let photoSentUrl = null
      let photoReceivedUrl = null
      if (form.photoSentFile) photoSentUrl = await uploadPhoto(form.photoSentFile, `${id}/sent.jpg`)
      if (form.photoReceivedFile) photoReceivedUrl = await uploadPhoto(form.photoReceivedFile, `${id}/received.jpg`)

      const report = {
        id,
        clientName: form.clientName.trim(),
        deliveryDate: form.deliveryDate,
        weightSent: form.weightSent !== '' ? parseFloat(form.weightSent) : null,
        weightReceived: form.weightReceived !== '' ? parseFloat(form.weightReceived) : null,
        photoSentUrl,
        photoReceivedUrl,
        notes: form.notes.trim(),
        createdByName: profile?.name || '',
        createdAt: new Date().toISOString(),
      }

      setReports(prev => [report, ...prev])

      await supabase.from('delivery_reports').insert({
        id,
        client_name: report.clientName,
        delivery_date: report.deliveryDate,
        weight_sent: report.weightSent,
        weight_received: report.weightReceived,
        photo_sent_url: photoSentUrl,
        photo_received_url: photoReceivedUrl,
        notes: report.notes,
        created_by: user?.id,
        created_by_name: report.createdByName,
      })
      if (form.doId) {
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

  const isDetail = modal && modal !== 'new'

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

      {/* List */}
      {reports.length === 0 ? (
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
          {reports.map((r, idx) => {
            const diff = r.weightSent != null && r.weightReceived != null
              ? r.weightReceived - r.weightSent : null
            return (
              <div key={r.id} onClick={() => setModal(r)} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', cursor: 'pointer',
                borderBottom: idx === reports.length - 1 ? 'none' : '0.5px solid #f0f0f0',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #007aff, #34aadc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Truck size={20} color="white" strokeWidth={1.8} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>oleh {r.createdByName}</p>
                    {(r.photoSentUrl || r.photoReceivedUrl) && (
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

      {/* ── MODAL: New Report ── */}
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
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                <X size={22} />
              </button>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Laporan Pengiriman</p>
              <button
                onClick={save}
                disabled={saving || !form.clientName.trim()}
                style={{
                  background: 'none', border: 'none', cursor: saving || !form.clientName.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 600, padding: 0, ...FF,
                  color: saved ? '#34c759' : !form.clientName.trim() ? '#c7c7cc' : '#007aff',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {saved ? <><Check size={15} /> Tersimpan</> : saving ? '...' : 'Simpan'}
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* DO Reference Badge */}
              {form.doRef && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>Delivery Order</p>
                  <div style={{ background: 'white', borderRadius: 13, padding: '14px 16px', boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
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
                        {form.doItems.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 13.5, color: '#3c3c43', margin: 0 }}>{it.name}</p>
                            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{it.qty} {it.unit}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Saat Kirim */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Saat Kirim
                </p>
                <div style={{ background: 'white', borderRadius: 13, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
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
                  <input ref={sentRef} type="file" accept="image/*" capture="environment" onChange={e => handlePhoto('sent', e)} style={{ display: 'none' }} />
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
                </div>
              </div>

              {/* Diterima di Resto */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Diterima di Resto
                </p>
                <div style={{ background: 'white', borderRadius: 13, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
                  <div
                    onClick={() => recvRef.current?.click()}
                    style={{
                      height: 180, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      background: form.photoReceivedPreview ? 'transparent' : '#f2f2f7',
                      border: form.photoReceivedPreview ? 'none' : '1.5px dashed #c7c7cc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {form.photoReceivedPreview
                      ? <img src={form.photoReceivedPreview} alt="terima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ textAlign: 'center' }}>
                          <Camera size={30} color="#c7c7cc" style={{ display: 'block', margin: '0 auto' }} />
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
                  <input ref={recvRef} type="file" accept="image/*" capture="environment" onChange={e => handlePhoto('received', e)} style={{ display: 'none' }} />
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
                </div>
              </div>

              {/* Info Pengiriman */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 8 }}>
                  Info Pengiriman
                </p>
                <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 16px' }}>
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
                </div>
              </div>
            </div>

              {/* Simpan & Lanjut button */}
              <button
                onClick={() => save(true)}
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

            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* ── MODAL: Detail View ── */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Foto Kirim
                  </p>
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
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Foto Terima
                  </p>
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
                    background: 'white', borderRadius: 13, padding: '14px 18px',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontSize: 15, color: '#8e8e93', margin: 0 }}>Selisih Berat</p>
                    <p style={{ fontSize: 17, fontWeight: 700, margin: 0, color: diff < 0 ? '#ff3b30' : '#34c759' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </p>
                  </div>
                )
              })()}

              {/* Info rows */}
              <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', boxShadow: '0 1px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.07)' }}>
                <InfoRow label="Tanggal" value={formatDate(modal.deliveryDate)} />
                <InfoRow label="Dibuat oleh" value={modal.createdByName} last={!modal.notes} />
                {modal.notes && <InfoRow label="Catatan" value={modal.notes} last />}
              </div>
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}
    </div>
  )
}
