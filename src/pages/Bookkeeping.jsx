import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }
const GLASS = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTH_NAMES_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function fmtRp(n) { return n != null ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '–' }
function fmtDate(s) {
  if (!s) return '–'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function currentYM() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
function shiftYM(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES_FULL[m - 1]} ${y}`
}
function shortMonth(ym) {
  if (!ym) return ''
  const [, m] = ym.split('-').map(Number)
  return MONTH_NAMES[m - 1]
}
function last6Months() {
  const now = currentYM()
  return Array.from({ length: 6 }, (_, i) => shiftYM(now, -(5 - i)))
}

function SLabel({ text, style }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 2, marginBottom: 8, margin: 0, marginBottom: 8, ...FF, ...style }}>
      {text}
    </p>
  )
}

function SummaryCard({ label, value, color, bg, icon: Icon, sub }) {
  return (
    <div style={{ ...GLASS, padding: '16px 18px', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </div>
        <p style={{ fontSize: 12, color: '#6e6e73', margin: 0, lineHeight: 1.3, ...FF }}>{label}</p>
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: color || '#1c1c1e', margin: 0, ...FF }}>{value}</p>
      {sub && <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '3px 0 0', ...FF }}>{sub}</p>}
    </div>
  )
}

export default function Bookkeeping() {
  const { isRole } = useAuth()
  const isOwner = isRole('owner')

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [sortClient, setSortClient] = useState('total')
  const [showAllOutstanding, setShowAllOutstanding] = useState(false)

  const curYM = currentYM()

  useEffect(() => {
    supabase.from('documents')
      .select('id,number,date,status,client_name,total,due_date')
      .eq('type', 'Invoice')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setInvoices((data || []).map(r => ({
          id: r.id, number: r.number, date: r.date, status: r.status,
          clientName: r.client_name, total: r.total || 0, dueDate: r.due_date || '',
        })))
        setLoading(false)
      })
  }, [])

  // ── Derived ──
  const active = invoices.filter(d => d.status !== 'cancelled' && d.status !== 'draft')

  const piutangAktif     = active.filter(d => d.status === 'sent').reduce((s, d) => s + d.total, 0)
  const piutangOverdue   = active.filter(d => d.status === 'overdue').reduce((s, d) => s + d.total, 0)
  const terbayarBulanIni = active.filter(d => d.status === 'paid' && (d.date || '').startsWith(curYM)).reduce((s, d) => s + d.total, 0)
  const overdueCount     = active.filter(d => d.status === 'overdue').length
  const sentCount        = active.filter(d => d.status === 'sent').length

  // Arus kas chart — last 6 months of paid invoices
  const months6 = last6Months()
  const paidByMonth = {}
  active.filter(d => d.status === 'paid').forEach(d => {
    const ym = (d.date || '').slice(0, 7)
    paidByMonth[ym] = (paidByMonth[ym] || 0) + d.total
  })
  const chartData = months6.map(ym => ({ ym, value: paidByMonth[ym] || 0 }))
  const chartMax = Math.max(...chartData.map(d => d.value), 1)

  // Per month recap
  const monthMap = {}
  active.forEach(d => {
    const ym = (d.date || '').slice(0, 7)
    if (!ym) return
    if (!monthMap[ym]) monthMap[ym] = { ym, count: 0, total: 0, paid: 0, outstanding: 0 }
    monthMap[ym].count++
    monthMap[ym].total += d.total
    if (d.status === 'paid') monthMap[ym].paid += d.total
    if (d.status === 'sent' || d.status === 'overdue') monthMap[ym].outstanding += d.total
  })
  const monthRecap = Object.values(monthMap).sort((a, b) => b.ym.localeCompare(a.ym))

  // Per client recap
  const clientMap = {}
  active.forEach(d => {
    const c = d.clientName || '–'
    if (!clientMap[c]) clientMap[c] = { name: c, count: 0, total: 0, paid: 0, outstanding: 0 }
    clientMap[c].count++
    clientMap[c].total += d.total
    if (d.status === 'paid') clientMap[c].paid += d.total
    if (d.status === 'sent' || d.status === 'overdue') clientMap[c].outstanding += d.total
  })
  const clientRecap = Object.values(clientMap).sort((a, b) =>
    sortClient === 'piutang' ? b.outstanding - a.outstanding
    : sortClient === 'name'  ? a.name.localeCompare(b.name)
    : b.total - a.total
  )

  // Invoice outstanding — owner only
  const outstanding = active
    .filter(d => d.status === 'sent' || d.status === 'overdue')
    .sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (b.status === 'overdue' && a.status !== 'overdue') return 1
      return (a.dueDate || a.date || '').localeCompare(b.dueDate || b.date || '')
    })
  const shownOutstanding = showAllOutstanding ? outstanding : outstanding.slice(0, 5)

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#8e8e93', fontSize: 15, ...FF }}>Memuat data...</div>
  }

  const thStyle = { fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div style={{ maxWidth: 720, ...FF, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>
        {isOwner ? 'Pembukuan' : 'Rekap Keuangan'}
      </h2>

      {/* Summary cards */}
      <div>
        <SLabel text="Ringkasan" />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SummaryCard
            label="Piutang Aktif"
            value={fmtRp(piutangAktif)}
            color="#007aff" bg="#eff6ff"
            icon={TrendingUp}
            sub={sentCount > 0 ? `${sentCount} invoice menunggu` : 'Tidak ada'}
          />
          <SummaryCard
            label="Terbayar Bulan Ini"
            value={fmtRp(terbayarBulanIni)}
            color="#34c759" bg="#f0fdf4"
            icon={CheckCircle}
            sub={fmtMonth(curYM)}
          />
          <SummaryCard
            label="Jatuh Tempo"
            value={fmtRp(piutangOverdue)}
            color={piutangOverdue > 0 ? '#ff3b30' : '#8e8e93'}
            bg={piutangOverdue > 0 ? '#fff0f0' : '#f2f2f7'}
            icon={AlertCircle}
            sub={overdueCount > 0 ? `${overdueCount} invoice overdue` : 'Tidak ada'}
          />
        </div>
      </div>

      {/* Grafik Arus Kas — owner only */}
      {isOwner && (
        <div>
          <SLabel text="Arus Kas Masuk — 6 Bulan Terakhir" />
          <div style={{ ...GLASS, padding: '20px 20px 14px' }}>
            {chartData.every(d => d.value === 0) ? (
              <p style={{ textAlign: 'center', color: '#8e8e93', fontSize: 14, margin: '20px 0' }}>Belum ada invoice lunas</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, marginBottom: 10 }}>
                  {chartData.map(({ ym, value }) => (
                    <div key={ym} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      {value > 0 && (
                        <p style={{ fontSize: 9.5, color: '#8e8e93', margin: 0, textAlign: 'center', ...FF, whiteSpace: 'nowrap' }}>
                          {value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}jt` : `${Math.round(value / 1000)}rb`}
                        </p>
                      )}
                      <div style={{
                        width: '100%',
                        height: `${Math.max((value / chartMax) * 80, value > 0 ? 5 : 0)}px`,
                        borderRadius: '5px 5px 0 0',
                        background: ym === curYM ? '#007aff' : 'rgba(0,122,255,0.22)',
                        minHeight: 0,
                      }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: 8 }}>
                  {chartData.map(({ ym }) => (
                    <div key={ym} style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: ym === curYM ? '#007aff' : '#8e8e93', fontWeight: ym === curYM ? 700 : 400, margin: 0, ...FF }}>
                        {shortMonth(ym)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rekap per bulan */}
      <div>
        <SLabel text="Rekap per Bulan" />
        {monthRecap.length === 0 ? (
          <div style={{ ...GLASS, padding: 32, textAlign: 'center', color: '#8e8e93', fontSize: 14 }}>Belum ada data invoice</div>
        ) : (
          <div style={{ ...GLASS, overflow: 'hidden', overflowX: 'auto' }}>
            {/* header */}
            <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)', minWidth: 480 }}>
              <span style={{ flex: 1, ...thStyle }}>Bulan</span>
              <span style={{ width: 36, ...thStyle, textAlign: 'center' }}>Inv</span>
              {isOwner && <span style={{ width: 130, ...thStyle, textAlign: 'right' }}>Total Tagihan</span>}
              <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#34c759' }}>Terbayar</span>
              <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#ff9500' }}>Piutang</span>
            </div>
            {monthRecap.map((m, idx) => (
              <div key={m.ym} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: idx < monthRecap.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', minWidth: 480 }}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', ...FF }}>{fmtMonth(m.ym)}</span>
                <span style={{ width: 36, fontSize: 13, color: '#8e8e93', textAlign: 'center', ...FF }}>{m.count}</span>
                {isOwner && <span style={{ width: 130, fontSize: 13, color: '#1c1c1e', textAlign: 'right', ...FF }}>{fmtRp(m.total)}</span>}
                <span style={{ width: 120, fontSize: 13, fontWeight: m.paid > 0 ? 600 : 400, color: m.paid > 0 ? '#34c759' : '#c7c7cc', textAlign: 'right', ...FF }}>
                  {m.paid > 0 ? fmtRp(m.paid) : '–'}
                </span>
                <span style={{ width: 120, fontSize: 13, fontWeight: m.outstanding > 0 ? 600 : 400, color: m.outstanding > 0 ? '#ff9500' : '#c7c7cc', textAlign: 'right', ...FF }}>
                  {m.outstanding > 0 ? fmtRp(m.outstanding) : '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rekap per klien */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <SLabel text={`Rekap per Klien (${clientRecap.length})`} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[['total', 'Total'], ['piutang', 'Piutang'], ['name', 'Nama']].map(([v, l]) => (
              <button key={v} onClick={() => setSortClient(v)} style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', ...FF,
                background: sortClient === v ? '#1c1c1e' : 'rgba(0,0,0,0.07)',
                color: sortClient === v ? 'white' : '#3c3c43',
                fontWeight: sortClient === v ? 600 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
        {clientRecap.length === 0 ? (
          <div style={{ ...GLASS, padding: 32, textAlign: 'center', color: '#8e8e93', fontSize: 14 }}>Belum ada data</div>
        ) : (
          <div style={{ ...GLASS, overflow: 'hidden', overflowX: 'auto' }}>
            <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)', minWidth: 400 }}>
              <span style={{ flex: 1, ...thStyle }}>Klien</span>
              {isOwner && <span style={{ width: 130, ...thStyle, textAlign: 'right' }}>Total</span>}
              <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#34c759' }}>Terbayar</span>
              <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#ff9500' }}>Piutang</span>
            </div>
            {clientRecap.map((c, idx) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: idx < clientRecap.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', minWidth: 400 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', margin: 0, ...FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                  <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '1px 0 0', ...FF }}>{c.count} invoice</p>
                </div>
                {isOwner && <span style={{ width: 130, fontSize: 13, color: '#1c1c1e', textAlign: 'right', flexShrink: 0, ...FF }}>{fmtRp(c.total)}</span>}
                <span style={{ width: 120, fontSize: 13, fontWeight: c.paid > 0 ? 600 : 400, color: c.paid > 0 ? '#34c759' : '#c7c7cc', textAlign: 'right', flexShrink: 0, ...FF }}>
                  {c.paid > 0 ? fmtRp(c.paid) : '–'}
                </span>
                <span style={{ width: 120, fontSize: 13, fontWeight: c.outstanding > 0 ? 600 : 400, color: c.outstanding > 0 ? '#ff9500' : '#c7c7cc', textAlign: 'right', flexShrink: 0, ...FF }}>
                  {c.outstanding > 0 ? fmtRp(c.outstanding) : '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice outstanding — owner only */}
      {isOwner && outstanding.length > 0 && (
        <div>
          <SLabel text={`Invoice Belum Lunas (${outstanding.length})`} />
          <div style={{ ...GLASS, overflow: 'hidden' }}>
            {shownOutstanding.map((inv, idx) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: idx < shownOutstanding.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1c1e', ...FF }}>{inv.number}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                      background: inv.status === 'overdue' ? '#fff0f0' : '#fff8e1',
                      color: inv.status === 'overdue' ? '#ff3b30' : '#ff9500',
                    }}>
                      {inv.status === 'overdue' ? 'Jatuh Tempo' : 'Menunggu'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#3c3c43', margin: 0, ...FF }}>{inv.clientName}</p>
                  {inv.dueDate && (
                    <p style={{ fontSize: 11.5, color: inv.status === 'overdue' ? '#ff3b30' : '#8e8e93', margin: '2px 0 0', ...FF }}>
                      Jatuh tempo: {fmtDate(inv.dueDate)}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0, flexShrink: 0, ...FF }}>{fmtRp(inv.total)}</p>
              </div>
            ))}
            {outstanding.length > 5 && (
              <button
                onClick={() => setShowAllOutstanding(v => !v)}
                style={{
                  width: '100%', padding: '12px', background: 'none', border: 'none',
                  borderTop: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer',
                  fontSize: 13, color: '#007aff', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...FF,
                }}
              >
                {showAllOutstanding
                  ? <><ChevronUp size={14} /> Sembunyikan</>
                  : <><ChevronDown size={14} /> Lihat semua {outstanding.length} invoice</>}
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
