import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, ChevronLeft, ChevronRight, Check, FileText, Calendar, Receipt } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }

function todayStr() { return new Date().toISOString().slice(0, 10) }
function currentYM() { return new Date().toISOString().slice(0, 7) }

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return d.toISOString().slice(0, 7)
}
function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}
function fmtDate(str) {
  if (!str) return '–'
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtRp(n) {
  if (n == null || n === '') return '–'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}
function isOverdue(inv) {
  if (!inv.dueDate || inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') return false
  return inv.dueDate < todayStr()
}
function dbToInv(r) {
  return {
    id: r.id, number: r.number, date: r.date, status: r.status,
    clientName: r.client_name || '', refNumber: r.ref_number || '',
    items: r.items || [],
    subtotal: r.subtotal || 0, taxPct: r.tax_pct || 0,
    discount: r.discount || 0, total: r.total || 0,
    dueDate: r.due_date || '', paymentTerms: r.payment_terms || '',
    bankName: r.bank_name || '', accountNumber: r.account_number || '',
    accountName: r.account_name || '',
    notes: r.notes || '', createdByName: r.created_by_name || '',
  }
}

const STATUS_CFG = {
  draft:     { label: 'Draft',    color: '#8e8e93', bg: '#f2f2f7',  border: 'rgba(142,142,147,0.2)' },
  sent:      { label: 'Terkirim', color: '#007aff', bg: '#e8f4ff',  border: 'rgba(0,122,255,0.2)' },
  paid:      { label: 'Lunas',   color: '#34c759', bg: '#f0fdf4',  border: 'rgba(52,199,89,0.2)' },
  cancelled: { label: 'Batal',   color: '#ff3b30', bg: '#fff0f0',  border: 'rgba(255,59,48,0.2)' },
}

const GLASS = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

export default function Invoices() {
  const { isRole } = useAuth()
  const navigate = useNavigate()
  const canEdit = isRole('admin') || isRole('owner')
  const [invoices, setInvoices] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(currentYM())
  const [statusFilter, setStatusFilter] = useState('all')
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('documents')
      .select('*')
      .eq('type', 'Invoice')
      .order('date', { ascending: false })
      .then(({ data }) => { if (data) setInvoices(data.map(dbToInv)) })
  }, [])

  async function markStatus(inv, status) {
    setSaving(true)
    try {
      await supabase.from('documents').update({ status }).eq('id', inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status } : i))
      setDetail(prev => prev?.id === inv.id ? { ...prev, status } : prev)
    } finally { setSaving(false) }
  }

  const thisYM = currentYM()
  const monthInvoices = invoices.filter(i => (i.date || '').startsWith(selectedMonth))
  const filtered = statusFilter === 'all'    ? monthInvoices
    : statusFilter === 'unpaid' ? monthInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    : monthInvoices.filter(i => i.status === statusFilter)

  const totalBilled   = monthInvoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid     = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const outstanding   = totalBilled - totalPaid
  const overdueCount  = monthInvoices.filter(isOverdue).length

  return (
    <div style={{ maxWidth: 680, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Invoice</h2>
        {canEdit && (
          <button
            onClick={() => navigate('/dashboard/documents', { state: { createType: 'Invoice' } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#af52de', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF }}
          >
            <Plus size={15} /> Buat Invoice
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...GLASS, borderRadius: 14, padding: '11px 16px' }}>
        <button onClick={() => setSelectedMonth(m => shiftMonth(m, -1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 4, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} color="#af52de" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{fmtMonth(selectedMonth)}</span>
          {selectedMonth === thisYM && <span style={{ fontSize: 10, background: '#af52de', color: 'white', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>Bulan Ini</span>}
        </div>
        <button
          onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}
          disabled={selectedMonth >= thisYM}
          style={{ background: 'none', border: 'none', cursor: selectedMonth >= thisYM ? 'default' : 'pointer', color: selectedMonth >= thisYM ? '#c7c7cc' : '#8e8e93', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Total Tagihan', value: fmtRp(totalBilled), color: '#af52de', extra: null },
          { label: 'Terbayar',      value: fmtRp(totalPaid),   color: '#34c759', extra: null },
          { label: 'Belum Dibayar', value: fmtRp(outstanding), color: outstanding > 0 ? '#ff9500' : '#8e8e93',
            extra: overdueCount > 0 ? `${overdueCount} jatuh tempo` : null },
        ].map(({ label, value, color, extra }) => (
          <div key={label} style={{ ...GLASS, borderRadius: 14, padding: '13px 12px' }}>
            <p style={{ fontSize: 10.5, color: '#8e8e93', margin: '0 0 5px', fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0, lineHeight: 1.25 }}>{value}</p>
            {extra && <p style={{ fontSize: 10, color: '#ff3b30', margin: '4px 0 0', fontWeight: 600 }}>⚠ {extra}</p>}
          </div>
        ))}
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { val: 'all',    label: 'Semua' },
          { val: 'unpaid', label: 'Belum Lunas' },
          { val: 'paid',   label: 'Lunas' },
          { val: 'sent',   label: 'Terkirim' },
          { val: 'draft',  label: 'Draft' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, ...FF,
              background: statusFilter === val ? '#1c1c1e' : 'rgba(255,255,255,0.72)',
              color: statusFilter === val ? 'white' : '#6e6e73',
              boxShadow: statusFilter === val ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div style={{ ...GLASS, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <Receipt size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Tidak ada invoice</p>
          <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>untuk {fmtMonth(selectedMonth)}</p>
        </div>
      ) : (
        <div style={{ ...GLASS, borderRadius: 14, overflow: 'hidden' }}>
          {filtered.map((inv, idx) => {
            const st = STATUS_CFG[inv.status] || STATUS_CFG.draft
            const overdue = isOverdue(inv)
            return (
              <div
                key={inv.id}
                onClick={() => setDetail(inv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', cursor: 'pointer',
                  borderBottom: idx === filtered.length - 1 ? 'none' : '0.5px solid #f0f0f0',
                  background: overdue ? 'rgba(255,59,48,0.03)' : 'transparent',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: overdue ? '#ff3b30' : st.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1c1e' }}>{inv.number}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>{st.label}</span>
                    {overdue && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fff0f0', color: '#ff3b30' }}>⚠ Jatuh Tempo</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>{inv.clientName}</p>
                  <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '2px 0 0' }}>
                    {fmtDate(inv.date)}
                    {inv.dueDate && <> · Tempo {fmtDate(inv.dueDate)}</>}
                  </p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0, flexShrink: 0 }}>{fmtRp(inv.total)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', ...FF }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{detail.number}</p>
                <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{detail.clientName}</p>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Status badge + overdue */}
              {(() => {
                const st = STATUS_CFG[detail.status] || STATUS_CFG.draft
                const overdue = isOverdue(detail)
                return (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 99, background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>{st.label}</span>
                    {overdue && <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99, background: '#fff0f0', color: '#ff3b30', border: '0.5px solid rgba(255,59,48,0.2)' }}>⚠ Sudah Jatuh Tempo</span>}
                  </div>
                )
              })()}

              {/* Key dates */}
              <div style={{ ...GLASS, borderRadius: 14, overflow: 'hidden' }}>
                {[
                  ['Tanggal Invoice', fmtDate(detail.date)],
                  detail.dueDate     ? ['Jatuh Tempo',  fmtDate(detail.dueDate)]  : null,
                  detail.paymentTerms ? ['Termin',       detail.paymentTerms]      : null,
                  detail.refNumber   ? ['Referensi',    detail.refNumber]          : null,
                  detail.createdByName ? ['Dibuat oleh', detail.createdByName]     : null,
                ].filter(Boolean).map(([label, val], i, arr) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                    <p style={{ fontSize: 14, color: '#8e8e93', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              {detail.items.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4, marginBottom: 8 }}>Item</p>
                  <div style={{ ...GLASS, borderRadius: 14, overflow: 'hidden' }}>
                    {detail.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 16px', borderBottom: i < detail.items.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{it.name}</p>
                          <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{it.qty} {it.unit} × {fmtRp(it.price)}</p>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0, marginLeft: 12, flexShrink: 0 }}>{fmtRp(it.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div style={{ ...GLASS, borderRadius: 14, overflow: 'hidden' }}>
                {[
                  ['Subtotal', fmtRp(detail.subtotal)],
                  detail.taxPct > 0  ? [`PPN (${detail.taxPct}%)`, fmtRp(Math.round((detail.subtotal || 0) * (detail.taxPct || 0) / 100))] : null,
                  detail.discount > 0 ? ['Diskon', `− ${fmtRp(detail.discount)}`] : null,
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '0.5px solid #f0f0f0' }}>
                    <p style={{ fontSize: 14, color: '#8e8e93', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 14, color: '#3c3c43', margin: 0 }}>{val}</p>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Total</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#af52de', margin: 0 }}>{fmtRp(detail.total)}</p>
                </div>
              </div>

              {/* Bank info */}
              {detail.bankName && (
                <div style={{ ...GLASS, borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Info Pembayaran</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{detail.bankName}</p>
                  <p style={{ fontSize: 14, color: '#3c3c43', margin: '3px 0 0' }}>{detail.accountNumber}</p>
                  <p style={{ fontSize: 13, color: '#8e8e93', margin: '2px 0 0' }}>{detail.accountName}</p>
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div style={{ ...GLASS, borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Catatan</p>
                  <p style={{ fontSize: 14, color: '#3c3c43', margin: 0, lineHeight: 1.5 }}>{detail.notes}</p>
                </div>
              )}

              {/* Actions */}
              {canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {detail.status === 'draft' && (
                    <button
                      onClick={() => markStatus(detail, 'sent')}
                      disabled={saving}
                      style={{ width: '100%', padding: '14px', background: '#007aff', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <FileText size={16} /> Tandai Terkirim ke Klien
                    </button>
                  )}
                  {detail.status !== 'paid' && detail.status !== 'cancelled' && (
                    <button
                      onClick={() => markStatus(detail, 'paid')}
                      disabled={saving}
                      style={{ width: '100%', padding: '14px', background: '#34c759', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Check size={16} /> Tandai Lunas
                    </button>
                  )}
                  {detail.status === 'paid' && (
                    <button
                      onClick={() => markStatus(detail, 'sent')}
                      disabled={saving}
                      style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '0.5px solid #e5e5ea', borderRadius: 13, color: '#8e8e93', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', ...FF }}
                    >
                      Batalkan Lunas
                    </button>
                  )}
                  <button
                    onClick={() => { setDetail(null); navigate('/dashboard/documents') }}
                    style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '0.5px solid #e5e5ea', borderRadius: 13, color: '#007aff', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF }}
                  >
                    Edit di Dokumen
                  </button>
                </div>
              )}
            </div>
            <div style={{ height: 32 }} />
          </div>
        </div>
      )}
    </div>
  )
}
