import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, X, ShoppingBag, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DEMO_SO = [
  {
    id: 'demo-so-1', number: 'SO-202606-001', date: '2026-06-28', status: 'confirmed',
    clientName: 'Resto Laut Biru', clientAddress: 'Jl. Pantai No.1, Jakarta Utara', clientPhone: '0812-3456-7890',
    items: [
      { id: '1', name: 'Udang Vaname', qty: 20, unit: 'kg', price: 85000, total: 1700000 },
      { id: '2', name: 'Udang Windu',  qty: 10, unit: 'kg', price: 120000, total: 1200000 },
    ],
    subtotal: 2900000, taxPct: 11, total: 3219000,
    notes: 'Tolong kirim sebelum pukul 10 pagi.', createdByName: 'April', createdAt: '2026-06-28T08:00:00Z',
  },
]

const STATUS_CFG = {
  draft:      { label: 'Draft',         bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  confirmed:  { label: 'Dikonfirmasi',  bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  dispatched: { label: 'Dikirim',       bg: '#fff8e1', text: '#d97706', border: '#fde68a' },
  delivered:  { label: 'Terkirim',      bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  cancelled:  { label: 'Batal',         bg: '#fff1f2', text: '#dc2626', border: '#fecaca' },
}
const STATUS_OPTS = ['semua', 'draft', 'confirmed', 'dispatched', 'delivered', 'cancelled']

function fmt(n) {
  if (n == null) return '–'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}
function fmtDate(s) {
  if (!s) return '–'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dbToSo(r) {
  return {
    id: r.id, number: r.number, date: r.date, status: r.status,
    clientName: r.client_name, clientAddress: r.client_address, clientPhone: r.client_phone,
    items: r.items || [],
    subtotal: r.subtotal, taxPct: r.tax_pct, discount: r.discount, total: r.total,
    notes: r.notes || '', createdByName: r.created_by_name || '', createdAt: r.created_at,
  }
}

export default function Orders() {
  const navigate = useNavigate()
  const { isRole, demoMode } = useAuth()
  const canEdit = isRole('admin') || isRole('owner')

  const [orders, setOrders]         = useState([])
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [view, setView]             = useState(null)

  useEffect(() => {
    if (demoMode) { setOrders(DEMO_SO); return }
    supabase.from('documents').select('*').eq('type', 'SO').order('created_at', { ascending: false })
      .then(({ data }) => data && setOrders(data.map(dbToSo)))
  }, [demoMode])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return (
      ((o.clientName || '').toLowerCase().includes(q) || (o.number || '').toLowerCase().includes(q)) &&
      (statusFilter === 'semua' || o.status === statusFilter)
    )
  })

  const thisMonth    = new Date().toISOString().slice(0, 7)
  const draftCount   = orders.filter(o => o.status === 'draft').length
  const confCount    = orders.filter(o => o.status === 'confirmed').length
  const omzetBulanIni = orders
    .filter(o => o.status === 'delivered' && (o.date || '').startsWith(thisMonth))
    .reduce((a, o) => a + (+o.total || 0), 0)

  const STATS = [
    { label: 'Total SO',     value: String(orders.length), sub: 'semua status',           Icon: ShoppingBag,  iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'Draft',        value: String(draftCount),    sub: 'belum dikonfirmasi',      Icon: Clock,        iconColor: '#d97706', iconBg: '#fffbeb' },
    { label: 'Dikonfirmasi', value: String(confCount),     sub: 'menunggu pengiriman',     Icon: CheckCircle2, iconColor: '#16a34a', iconBg: '#f0fdf4' },
    {
      label: 'Total Omzet',
      value: omzetBulanIni >= 1_000_000
        ? `Rp ${(omzetBulanIni / 1_000_000).toFixed(1).replace('.0', '')} jt`
        : `Rp ${omzetBulanIni.toLocaleString('id-ID')}`,
      sub: 'terkirim bulan ini', Icon: TrendingUp, iconColor: '#7c3aed', iconBg: '#f5f3ff',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>

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

      {/* Filter + Search + Button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', outline: 'none', border: 'none', transition: 'all 0.15s',
              background: statusFilter === s ? '#2563eb' : 'white',
              color: statusFilter === s ? 'white' : '#64748b',
              boxShadow: statusFilter === s ? 'none' : '0 0 0 1px #e2e8f0',
            }}>
              {s === 'semua' ? 'Semua' : (STATUS_CFG[s]?.label || s)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor SO atau klien..."
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['No. SO', 'Klien', 'Tanggal', 'Total', 'Status', 'Aksi'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : i >= 4 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Belum ada Sales Order.
                    {canEdit && (
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
                    <td style={{ padding: '13px 16px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 700, fontSize: 12 }}>{order.number}</td>
                    <td style={{ padding: '13px 16px', color: '#0f172a', fontWeight: 500 }}>{order.clientName}</td>
                    <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: 12 }}>{fmtDate(order.date)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmt(order.total)}</td>
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, margin: 0 }}>{view.number}</h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{view.clientName}</p>
              </div>
              <button onClick={() => setView(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Tanggal', val: fmtDate(view.date) },
                  { label: 'Status', val: STATUS_CFG[view.status]?.label || view.status },
                  { label: 'Dibuat oleh', val: view.createdByName || '–' },
                  ...(canEdit && view.total != null ? [{ label: 'Total', val: fmt(view.total) }] : []),
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                    <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Item Pesanan</p>
                <div style={{ border: '1px solid #f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Produk', 'Qty', ...(canEdit ? ['Harga', 'Subtotal'] : [])].map((h, i) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(view.items || []).map((item, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 12px', color: '#0f172a' }}>{item.name}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{item.qty} {item.unit}</td>
                          {canEdit && <>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8' }}>{fmt(item.price)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmt(item.total)}</td>
                          </>}
                        </tr>
                      ))}
                      {canEdit && view.total != null && (
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

            {/* Footer */}
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
