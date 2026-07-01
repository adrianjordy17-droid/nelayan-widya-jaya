import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, X, ShoppingBag, Clock, CheckCircle2, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Calendar, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STATUS_CFG = {
  draft:      { label: 'Draft',         bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  pending:    { label: 'Menunggu',      bg: '#f0f0ff', text: '#5856d6', border: '#c7c7f0' },
  confirmed:  { label: 'Dikonfirmasi',  bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  dispatched: { label: 'Dikirim',       bg: '#fff8e1', text: '#d97706', border: '#fde68a' },
  delivered:  { label: 'Terkirim',      bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  cancelled:  { label: 'Batal',         bg: '#fff1f2', text: '#dc2626', border: '#fecaca' },
}
// SO tabs
const SO_OPTS = ['semua', 'draft', 'confirmed', 'cancelled']
// DO tabs
const DO_OPTS = ['dispatched', 'delivered']
const ALL_OPTS = ['semua', 'draft', 'confirmed', 'dispatched', 'delivered', 'cancelled']

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function fmt(n) {
  if (n == null) return '–'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}
function fmtDate(s) {
  if (!s) return '–'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
function currentYM() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function dbToSo(r) {
  return {
    id: r.id, type: 'SO', number: r.number, date: r.date, status: r.status,
    clientName: r.client_name, clientAddress: r.client_address, clientPhone: r.client_phone,
    items: r.items || [],
    subtotal: r.subtotal, taxPct: r.tax_pct, discount: r.discount, total: r.total,
    notes: r.notes || '', createdByName: r.created_by_name || '', createdAt: r.created_at,
  }
}
function dbToDo(r) {
  return {
    id: r.id, type: 'DO', number: r.number, date: r.date, status: r.status,
    clientName: r.client_name, clientAddress: r.client_address,
    driverName: r.driver_name || '', vehicle: r.vehicle || '',
    refNumber: r.ref_number || '',
    items: r.items || [],
    total: null,
    notes: r.notes || '', createdByName: r.created_by_name || '', createdAt: r.created_at,
  }
}

export default function Orders() {
  const navigate = useNavigate()
  const { isRole } = useAuth()
  const canEdit = isRole('admin') || isRole('owner')

  const [soList, setSoList]               = useState([])
  const [doList, setDoList]               = useState([])
  const [selectedMonth, setSelectedMonth]   = useState(currentYM)
  const [liveMonth, setLiveMonth]           = useState(currentYM)
  const [search, setSearch]                 = useState('')
  const [statusFilter, setStatusFilter]     = useState('semua')
  const [view, setView]                     = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  useEffect(() => {
    supabase.from('documents').select('*').in('type', ['SO', 'DO']).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setSoList(data.filter(r => r.type === 'SO').map(dbToSo))
        setDoList(data.filter(r => r.type === 'DO').map(dbToDo))
      })
  }, [])

  // Auto-advance to new month at midnight
  useEffect(() => {
    const t = setInterval(() => {
      const now = currentYM()
      if (now !== liveMonth) {
        setSelectedMonth(prev => prev === liveMonth ? now : prev)
        setLiveMonth(now)
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [liveMonth])

  async function updateSoStatus(newStatus) {
    if (!view || view.type !== 'SO') return
    setUpdatingStatus(true)
    const { error } = await supabase.from('documents').update({ status: newStatus }).eq('id', view.id)
    if (!error) {
      const updated = { ...view, status: newStatus }
      setView(updated)
      setSoList(prev => prev.map(o => o.id === view.id ? updated : o))
    }
    setUpdatingStatus(false)
  }

  const isDoTab = DO_OPTS.includes(statusFilter)

  // Month-scoped lists
  const monthSoList = soList.filter(o => (o.date || '').startsWith(selectedMonth))
  const monthDoList = doList.filter(o => (o.date || '').startsWith(selectedMonth))

  // Active list based on tab
  const activeList = statusFilter === 'semua'
    ? [...monthSoList, ...monthDoList]
    : isDoTab ? monthDoList : monthSoList

  const filtered = activeList.filter(o => {
    const q = search.toLowerCase()
    return (
      ((o.clientName || '').toLowerCase().includes(q) || (o.number || '').toLowerCase().includes(q)) &&
      (statusFilter === 'semua' || o.status === statusFilter)
    )
  })

  // Stats (SO-based)
  const draftCount = monthSoList.filter(o => o.status === 'draft').length
  const confCount  = monthSoList.filter(o => o.status === 'confirmed').length
  const omzetBulan = monthSoList
    .filter(o => o.status === 'delivered')
    .reduce((a, o) => a + (+o.total || 0), 0)

  const monthsWithData = [...new Set(
    [...soList, ...doList].map(o => (o.date || '').slice(0, 7)).filter(Boolean)
  )].sort()

  const STATS = [
    { label: 'Total SO',     value: String(monthSoList.length), sub: 'bulan ini',          Icon: ShoppingBag,  iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'Draft',        value: String(draftCount),         sub: 'belum dikonfirmasi',  Icon: Clock,        iconColor: '#d97706', iconBg: '#fffbeb' },
    { label: 'Dikonfirmasi', value: String(confCount),          sub: 'menunggu pengiriman', Icon: CheckCircle2, iconColor: '#16a34a', iconBg: '#f0fdf4' },
    {
      label: 'Total Omzet',
      value: omzetBulan >= 1_000_000
        ? `Rp ${(omzetBulan / 1_000_000).toFixed(1).replace('.0', '')} jt`
        : `Rp ${omzetBulan.toLocaleString('id-ID')}`,
      sub: 'terkirim bulan ini', Icon: TrendingUp, iconColor: '#7c3aed', iconBg: '#f5f3ff',
    },
  ]

  const isCurrentMonth = selectedMonth === liveMonth

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>

      {/* Month Navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 14, padding: '14px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <button
          onClick={() => { setSelectedMonth(m => shiftMonth(m, -1)); setSearch(''); setStatusFilter('semua') }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: 'white', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600 }}
        >
          <ChevronLeft size={15} /> Sebelumnya
        </button>

        <div style={{ position: 'relative', textAlign: 'center' }}>
          <button
            onClick={() => setShowMonthPicker(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', border: 'none', borderRadius: 10, background: '#eff6ff', cursor: 'pointer', color: '#2563eb', fontSize: 15, fontWeight: 700 }}
          >
            <Calendar size={16} />
            {fmtMonth(selectedMonth)}
            {isCurrentMonth && <span style={{ fontSize: 10, background: '#2563eb', color: 'white', borderRadius: 20, padding: '2px 7px', fontWeight: 700 }}>Sekarang</span>}
            <ChevronDown size={13} />
          </button>

          {showMonthPicker && (
            <>
              <div onClick={() => setShowMonthPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(15,23,42,0.12)', zIndex: 50, padding: 12, minWidth: 220, maxHeight: 280, overflowY: 'auto' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 4px' }}>Pilih Bulan</p>
                {monthsWithData.length === 0 && (
                  <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', margin: 0 }}>Belum ada data</p>
                )}
                {[...monthsWithData].reverse().map(ym => (
                  <button key={ym} onClick={() => { setSelectedMonth(ym); setShowMonthPicker(false); setSearch(''); setStatusFilter('semua') }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 2, textAlign: 'left',
                      background: ym === selectedMonth ? '#eff6ff' : 'transparent',
                      color: ym === selectedMonth ? '#2563eb' : '#0f172a',
                    }}>
                    {fmtMonth(ym)}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                      {soList.filter(o => (o.date || '').startsWith(ym)).length} SO
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => { setSelectedMonth(m => shiftMonth(m, 1)); setSearch(''); setStatusFilter('semua') }}
          disabled={isCurrentMonth}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: isCurrentMonth ? '#f8fafc' : 'white', cursor: isCurrentMonth ? 'default' : 'pointer', color: isCurrentMonth ? '#cbd5e1' : '#64748b', fontSize: 13, fontWeight: 600 }}
        >
          Berikutnya <ChevronRight size={15} />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: value.length > 10 ? 18 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search + Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ALL_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', outline: 'none', border: 'none', transition: 'all 0.15s',
              background: statusFilter === s ? '#2563eb' : 'white',
              color: statusFilter === s ? 'white' : '#64748b',
              boxShadow: statusFilter === s ? 'none' : '0 0 0 1px #e2e8f0',
            }}>
              {s === 'semua' ? 'Semua' : (STATUS_CFG[s]?.label || s)}
              {/* badge for DO tabs */}
              {s === 'dispatched' && <span style={{ marginLeft: 5, fontSize: 10, background: statusFilter === s ? 'rgba(255,255,255,0.25)' : '#fff8e1', color: statusFilter === s ? 'white' : '#d97706', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>DO</span>}
              {s === 'delivered' && <span style={{ marginLeft: 5, fontSize: 10, background: statusFilter === s ? 'rgba(255,255,255,0.25)' : '#f0fdf4', color: statusFilter === s ? 'white' : '#16a34a', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>DO</span>}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isDoTab ? 'Cari nomor DO atau klien...' : 'Cari nomor SO atau klien...'}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px 8px 36px', fontSize: 13, outline: 'none', background: 'white', width: 220, color: '#0f172a', fontFamily: 'inherit' }} />
          </div>
          {canEdit && (
            <button
              onClick={() => navigate('/dashboard/documents', { state: { createType: 'SO' } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Plus size={15} /> Buat SO
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {[
                  isDoTab ? 'No. DO' : 'No. SO',
                  'Klien',
                  'Tanggal',
                  isDoTab ? 'Driver' : 'Total',
                  'Status',
                  'Aksi',
                ].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : i >= 4 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    {isDoTab
                      ? `Belum ada DO ${STATUS_CFG[statusFilter]?.label || ''} di ${fmtMonth(selectedMonth)}.`
                      : monthSoList.length === 0
                        ? `Belum ada SO di ${fmtMonth(selectedMonth)}.`
                        : 'Tidak ada SO yang cocok dengan filter.'}
                    {canEdit && !isDoTab && monthSoList.length === 0 && (
                      <span onClick={() => navigate('/dashboard/documents', { state: { createType: 'SO' } })}
                        style={{ color: '#2563eb', cursor: 'pointer', marginLeft: 6, fontWeight: 600 }}>
                        Buat SO pertama →
                      </span>
                    )}
                  </td>
                </tr>
              )}
              {filtered.map((order, idx) => {
                const sc = STATUS_CFG[order.status] || STATUS_CFG.draft
                return (
                  <tr key={order.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', fontFamily: 'monospace', color: order.type === 'DO' ? '#d97706' : '#2563eb', fontWeight: 700, fontSize: 12 }}>{order.number}</td>
                    <td style={{ padding: '13px 16px', color: '#0f172a', fontWeight: 500 }}>{order.clientName}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 12 }}>{fmtDate(order.date)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 600, color: order.type === 'DO' ? '#0f172a' : '#0f172a' }}>
                      {order.type === 'DO'
                        ? (order.driverName || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Belum ditugaskan</span>)
                        : fmt(order.total)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <button onClick={() => setView(order)}
                        title="Detail"
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: 8, display: 'inline-flex', alignItems: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = '#eff6ff' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {view && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ background: 'white', borderRadius: 18, boxShadow: '0 20px 60px rgba(15,23,42,0.15)', width: '100%', maxWidth: 640, margin: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>{view.number}</h3>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: view.type === 'DO' ? '#fff8e1' : '#eff6ff', color: view.type === 'DO' ? '#d97706' : '#2563eb' }}>
                    {view.type}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{view.clientName}</p>
              </div>
              <button onClick={() => setView(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Tanggal', val: fmtDate(view.date) },
                  { label: 'Dibuat oleh', val: view.createdByName || '–' },
                  ...(view.type === 'DO' ? [
                    { label: 'Driver', val: view.driverName || 'Belum ditugaskan' },
                    { label: 'Kendaraan', val: view.vehicle || '–' },
                    ...(view.refNumber ? [{ label: 'Ref. SO', val: view.refNumber }] : []),
                  ] : [
                    ...(canEdit && view.total != null ? [{ label: 'Total', val: fmt(view.total) }] : []),
                  ]),
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                    <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{val}</p>
                  </div>
                ))}

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</p>
                  {canEdit && view.type === 'SO' ? (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={view.status}
                        disabled={updatingStatus}
                        onChange={e => updateSoStatus(e.target.value)}
                        style={{
                          appearance: 'none', width: '100%', padding: '6px 28px 6px 10px',
                          border: `1px solid ${STATUS_CFG[view.status]?.border || '#e2e8f0'}`,
                          borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                          background: STATUS_CFG[view.status]?.bg || 'white',
                          color: STATUS_CFG[view.status]?.text || '#0f172a',
                          cursor: updatingStatus ? 'wait' : 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {Object.entries(STATUS_CFG).filter(([k]) => SO_OPTS.includes(k) || k === 'confirmed').map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    </div>
                  ) : (
                    <p style={{ fontWeight: 600, color: STATUS_CFG[view.status]?.text || '#0f172a', margin: 0, fontSize: 13 }}>
                      {STATUS_CFG[view.status]?.label || view.status}
                    </p>
                  )}
                </div>
              </div>

              {canEdit && view.type === 'SO' && (
                <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                  * Stok otomatis dikurangi saat status diubah ke <strong>Terkirim</strong>
                </p>
              )}
              {view.type === 'DO' && view.status === 'dispatched' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff8e1', borderRadius: 10, border: '1px solid #fde68a' }}>
                  <Truck size={14} color="#d97706" />
                  <p style={{ fontSize: 12.5, color: '#92400e', margin: 0 }}>Menunggu laporan pengiriman dari driver</p>
                </div>
              )}
              {view.type === 'DO' && view.status === 'delivered' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                  <CheckCircle2 size={14} color="#16a34a" />
                  <p style={{ fontSize: 12.5, color: '#14532d', margin: 0 }}>Pengiriman selesai — laporan sudah masuk</p>
                </div>
              )}

              <div>
                <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item {view.type === 'DO' ? 'Pengiriman' : 'Pesanan'}</p>
                <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Produk', 'Qty', ...(canEdit && view.type === 'SO' ? ['Harga', 'Subtotal'] : [])].map((h, i) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(view.items || []).map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 12px', color: '#0f172a' }}>{item.name}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{item.qty} {item.unit}</td>
                          {canEdit && view.type === 'SO' && <>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{fmt(item.price)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmt(item.total)}</td>
                          </>}
                        </tr>
                      ))}
                      {canEdit && view.type === 'SO' && view.total != null && (
                        <tr style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Total</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmt(view.total)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {view.notes && (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Catatan</p>
                  <p style={{ fontSize: 13, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', color: '#78350f', margin: 0 }}>{view.notes}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '0 0 18px 18px' }}>
              {canEdit && (
                <button onClick={() => { setView(null); navigate('/dashboard/documents') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Lihat di Dokumen
                </button>
              )}
              <button onClick={() => setView(null)} style={{ padding: '9px 16px', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: 10, fontSize: 13, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

