import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  TrendingUp, ShoppingCart, UserCheck, AlertTriangle, ArrowRight,
  Truck, CheckCircle2, ClipboardList, Package, Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const DOC_STATUS_CFG = {
  draft:      { label: 'Draft',        color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.2)' },
  confirmed:  { label: 'Dikonfirmasi', color: '#2563eb', bg: 'rgba(37,99,235,0.10)',   border: 'rgba(37,99,235,0.22)' },
  dispatched: { label: 'Dikirim',      color: '#d97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.22)' },
  delivered:  { label: 'Terkirim',     color: '#16a34a', bg: 'rgba(22,163,74,0.10)',   border: 'rgba(22,163,74,0.22)' },
  received:   { label: 'Diterima',     color: '#0891b2', bg: 'rgba(8,145,178,0.10)',   border: 'rgba(8,145,178,0.22)' },
  sent:       { label: 'Terkirim',     color: '#7c3aed', bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.22)' },
  paid:       { label: 'Lunas',        color: '#16a34a', bg: 'rgba(22,163,74,0.10)',   border: 'rgba(22,163,74,0.22)' },
}

/* ── shared glass recipe for light-bg cards ── */
const GLASS = {
  background:            'rgba(255,255,255,0.72)',
  backdropFilter:        'blur(24px) saturate(1.8)',
  WebkitBackdropFilter:  'blur(24px) saturate(1.8)',
  border:                '1px solid rgba(255,255,255,0.88)',
  boxShadow:             '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

function rpFmt(n) {
  if (!n) return 'Rp 0'
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')} jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)} rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

// ── Staff Dashboard ──────────────────────────────────────────────────────────
function StaffDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [todayLabel, setTodayLabel] = useState(() => format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
  const [todayKey, setTodayKey] = useState(localToday)

  useEffect(() => {
    const t = setInterval(() => {
      setTodayLabel(format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
      const now = localToday()
      if (now !== todayKey) setTodayKey(now)
    }, 10_000)
    return () => clearInterval(t)
  }, [todayKey])

  const [pendingDOs, setPendingDOs]    = useState([])
  const [deliveredCount, setDelivered] = useState(0)
  const [tasks, setTasks]              = useState([])

  useEffect(() => {
    if (!profile?.name) return
    supabase.from('documents')
      .select('id,number,client_name,items,status,driver_name')
      .eq('type', 'DO')
      .ilike('driver_name', profile.name)
      .then(({ data }) => {
        if (!data) return
        setPendingDOs(
          data.filter(d => d.status === 'dispatched')
              .map(d => ({ id: d.id, number: d.number, clientName: d.client_name, items: d.items || [] }))
        )
        setDelivered(data.filter(d => d.status === 'delivered').length)
      })

    supabase.from('tasks')
      .select('id,title,done')
      .ilike('assigned_to_name', profile.name)
      .then(({ data }) => { if (data) setTasks(data) })
  }, [profile?.name])

  const totalDOs = pendingDOs.length + deliveredCount
  const allDone  = totalDOs > 0 && deliveredCount === totalDOs

  const SectionHeader = ({ title, icon, iconBg }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px 13px', borderBottom: '1px solid rgba(0,0,0,0.055)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>Selamat datang, {profile?.name}</h2>
        <p style={{ color: '#94a3b8', fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' }}>{todayLabel}</p>
      </div>

      {/* Progress card */}
      <div style={{ ...GLASS, borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: allDone ? 'rgba(22,163,74,0.12)' : 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={22} color={allDone ? '#16a34a' : '#2563eb'} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 3px' }}>Pengiriman Selesai</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {deliveredCount}<span style={{ fontSize: 15, fontWeight: 500, color: '#94a3b8' }}>/{totalDOs}</span>
          </p>
          <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', maxWidth: 220 }}>
            <div style={{ width: totalDOs > 0 ? `${Math.round(deliveredCount / totalDOs * 100)}%` : '0%', height: '100%', borderRadius: 99, background: allDone ? '#16a34a' : '#2563eb', transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
          {totalDOs === 0 ? 'Tidak ada tugas' : allDone ? 'Semua selesai!' : `${totalDOs - deliveredCount} tersisa`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Tasks */}
        <div style={{ ...GLASS, borderRadius: 16, overflow: 'hidden' }}>
          <SectionHeader title="Tugas Hari Ini" icon={<ClipboardList size={15} color="#7c3aed" />} iconBg="rgba(124,58,237,0.12)" />
          {tasks.length === 0 ? (
            <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ada tugas hari ini.</p>
          ) : tasks.map((task, idx) => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px', borderBottom: idx < tasks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: '2px solid ' + (task.done ? '#16a34a' : '#cbd5e1'), background: task.done ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {task.done && <Check size={10} color="white" strokeWidth={3} />}
              </div>
              <p style={{ fontSize: 13, color: task.done ? '#94a3b8' : '#1e293b', margin: 0, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</p>
            </div>
          ))}
        </div>

        {/* Pending DOs */}
        <div style={{ ...GLASS, borderRadius: 16, overflow: 'hidden' }}>
          <SectionHeader title={`Order Dikirim (${pendingDOs.length})`} icon={<Truck size={15} color="#d97706" />} iconBg="rgba(217,119,6,0.12)" />
          {pendingDOs.length === 0 ? (
            <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ada order yang harus dikirim.</p>
          ) : pendingDOs.map((d, idx) => (
            <div key={d.id} onClick={() => navigate('/dashboard/documents')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px', borderBottom: idx < pendingDOs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={15} color="#d97706" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{d.clientName}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.number} · {d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                </p>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: '#d97706', background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.22)', whiteSpace: 'nowrap', flexShrink: 0 }}>Dikirim</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Owner / Admin Dashboard ──────────────────────────────────────────────────
function OwnerAdminDashboard() {
  const { profile } = useAuth()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [todayLabel, setTodayLabel] = useState(() => format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
  const [todayKey,  setTodayKey]  = useState(localToday)
  const [thisMonth, setThisMonth] = useState(() => localToday().slice(0, 7))

  const [products, setProducts]         = useState([])
  const [hadirCount, setHadirCount]     = useState(0)
  const [totalExpected, setExpected]    = useState(0)
  const [recentDocs, setRecentDocs]     = useState([])
  const [penjualanBulanIni, setPenjualan] = useState(0)
  const [orderPending, setOrderPending] = useState(0)
  const [delayedCount, setDelayedCount] = useState(0)
  const [partialCount, setPartialCount] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setTodayLabel(format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
      const nowDate  = localToday()
      const nowMonth = nowDate.slice(0, 7)
      if (nowDate !== todayKey) {
        setTodayKey(nowDate)
        setThisMonth(nowMonth)
      }
    }, 10_000)
    return () => clearInterval(t)
  }, [todayKey])

  useEffect(() => {
    const fetchProducts = () =>
      supabase.from('products').select('id, nama, kategori, qty, min_qty, satuan')
        .then(({ data }) => setProducts(data || []))

    fetchProducts()

    const sub = supabase
      .channel('dashboard-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  useEffect(() => {
    supabase.from('attendance').select('id, name, type').eq('date', todayKey)
      .then(({ data }) => {
        if (!data) return
        const masukNames = [...new Set(data.filter(a => a.type === 'masuk').map(a => a.name))]
        setHadirCount(masukNames.length)
      })

    supabase.from('employees').select('id', { count: 'exact' }).eq('active', true)
      .then(({ count }) => setExpected(count || 0))

    supabase.from('documents')
      .select('id, number, type, status, client_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentDocs(data) })

    supabase.from('documents')
      .select('id, type, status, total, date')
      .eq('type', 'SO')
      .then(({ data }) => {
        if (!data) return
        setOrderPending(data.filter(d => d.status === 'draft').length)
        const soTotal = data
          .filter(d => (d.status === 'confirmed' || d.status === 'delivered') && (d.date || '').startsWith(thisMonth))
          .reduce((sum, d) => sum + (d.total || 0), 0)
        setPenjualan(soTotal)
      })

    supabase.from('documents').select('id').eq('type', 'DO').eq('status', 'delayed')
      .then(({ data }) => setDelayedCount(data?.length || 0))

    supabase.from('delivery_reports').select('do_id')
      .eq('is_partial', true)
      .not('do_id', 'is', null)
      .then(({ data }) => {
        if (!data) return
        setPartialCount(new Set(data.map(r => r.do_id)).size)
      })
  }, [todayKey, thisMonth])

  const stokTipis = products.filter(p => (p.qty || 0) <= (p.min_qty > 0 ? p.min_qty : 10)).length

  const STATS = [
    { label: 'Penjualan Bulan Ini', value: rpFmt(penjualanBulanIni), sub: 'dari SO dikonfirmasi bulan ini', Icon: TrendingUp,    iconColor: '#2563eb', iconBg: 'rgba(37,99,235,0.12)',  bar: '#2563eb' },
    { label: 'SO Pending',          value: String(orderPending),     sub: 'sales order draft',              Icon: ShoppingCart,  iconColor: '#d97706', iconBg: 'rgba(217,119,6,0.12)', bar: '#d97706' },
    { label: 'Hadir Hari Ini',      value: `${hadirCount}/${totalExpected}`, sub: 'karyawan hadir',        Icon: UserCheck,     iconColor: '#16a34a', iconBg: 'rgba(22,163,74,0.12)', bar: '#16a34a' },
    {
      label: 'Stok Tipis',
      value: String(stokTipis),
      sub:   stokTipis > 0 ? 'perlu restok segera' : 'semua stok aman',
      Icon:  AlertTriangle,
      iconColor: stokTipis > 0 ? '#dc2626' : '#64748b',
      iconBg:    stokTipis > 0 ? 'rgba(220,38,38,0.12)' : 'rgba(100,116,139,0.10)',
      bar:       stokTipis > 0 ? '#dc2626' : '#94a3b8',
    },
  ]

  const udangItems = products.filter(p => (p.kategori || '').toUpperCase().startsWith('UDANG'))
  const stokDisplay = (udangItems.length > 0 ? udangItems : products)
    .slice(0, 4)
    .map(p => ({ name: p.nama, qty: p.qty || 0, max: Math.max(p.qty || 0, (p.min_qty || 0) * 3, 50) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>Selamat datang, {profile?.name}</h2>
        <p style={{ color: '#94a3b8', fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' }}>{todayLabel}</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14 }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg, bar }) => (
          <div key={label} style={{ ...GLASS, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3, maxWidth: 100 }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: value.length > 10 ? 18 : 26, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px' }}>{sub}</p>
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ width: '45%', height: '100%', borderRadius: 99, background: bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>

        {/* Dokumen Terbaru */}
        <div style={{ ...GLASS, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 13px', borderBottom: '1px solid rgba(0,0,0,0.055)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Dokumen Terbaru</p>
            <Link to="/dashboard/documents" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
              Lihat semua <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {recentDocs.length === 0 ? (
              <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada dokumen.</p>
            ) : recentDocs.map((doc, idx) => {
              const s = DOC_STATUS_CFG[doc.status] || DOC_STATUS_CFG.draft
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: idx < recentDocs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 6px', borderRadius: 4,
                        background: doc.type === 'SO' ? 'rgba(37,99,235,0.10)' : doc.type === 'DO' ? 'rgba(217,119,6,0.10)' : doc.type === 'GR' ? 'rgba(8,145,178,0.10)' : 'rgba(124,58,237,0.10)',
                        color:      doc.type === 'SO' ? '#2563eb'              : doc.type === 'DO' ? '#d97706'              : doc.type === 'GR' ? '#0891b2'              : '#7c3aed',
                      }}>{doc.type}</span>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.number}</p>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{doc.client_name}</p>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Operasional */}
        {(() => {
          const items = [
            {
              label: 'SO Draft',
              desc: 'Sales order belum dikonfirmasi',
              count: orderPending,
              Icon: ClipboardList,
              color: '#5856d6', bg: 'rgba(88,86,214,0.10)',
              tab: 'so-draft',
            },
            {
              label: 'Pengiriman Partial',
              desc: 'DO belum selesai diterima',
              count: partialCount,
              Icon: Package,
              color: '#d97706', bg: 'rgba(217,119,6,0.10)',
              tab: 'partial',
            },
            {
              label: 'Pengiriman Terlambat',
              desc: 'DO menunggu konfirmasi tiba',
              count: delayedCount,
              Icon: AlertTriangle,
              color: '#dc2626', bg: 'rgba(220,38,38,0.10)',
              tab: 'delayed',
            },
          ]
          return (
            <div style={{ ...GLASS, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 13px', borderBottom: '1px solid rgba(0,0,0,0.055)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Status Operasional</p>
                <Link to="/dashboard/documents" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: '#2563eb', fontWeight: 500, textDecoration: 'none' }}>
                  Lihat dokumen <ArrowRight size={11} />
                </Link>
              </div>
              <div>
                {items.map(({ label, desc, count, Icon, color, bg, tab }, idx) => (
                  <Link key={tab} to="/dashboard/documents" state={{ tab }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: idx < items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{desc}</p>
                    </div>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: count > 0 ? color : '#cbd5e1',
                      minWidth: 28, textAlign: 'right', flexShrink: 0,
                    }}>{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

// ── Root export ──────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { isRole } = useAuth()
  return isRole('staff') ? <StaffDashboard /> : <OwnerAdminDashboard />
}
