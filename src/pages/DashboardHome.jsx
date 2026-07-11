import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  TrendingUp, ShoppingCart, UserCheck, AlertTriangle, ArrowRight,
  Truck, CheckCircle2, ClipboardList, Package, Check, PackageCheck, ChevronRight,
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
      const now = localToday()
      if (now !== todayKey) {
        setTodayKey(now)
        setTodayLabel(format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
      }
    }, 10_000)
    return () => clearInterval(t)
  }, [todayKey])

  const [pendingDOs, setPendingDOs]    = useState([])
  const [deliveredCount, setDelivered] = useState(0)
  const [partialDOs, setPartialDOs]    = useState([])
  const [doKgMap, setDoKgMap]          = useState({})
  const [tasks, setTasks]              = useState([])

  useEffect(() => {
    if (!profile?.name) return

    ;(async () => {
      const { data: doData } = await supabase.from('documents')
        .select('id,number,client_name,items,status,driver_name')
        .eq('type', 'DO')
        .ilike('driver_name', profile.name)
      if (!doData) return

      setPendingDOs(
        doData.filter(d => d.status === 'dispatched')
              .map(d => ({ id: d.id, number: d.number, clientName: d.client_name, items: d.items || [] }))
      )
      setDelivered(doData.filter(d => d.status === 'delivered').length)

      const doIds = doData.map(d => d.id).filter(Boolean)
      if (doIds.length > 0) {
        const [{ data: partialReports }, { data: grDocs }, { data: allReports }] = await Promise.all([
          supabase.from('delivery_reports').select('do_id').eq('is_partial', true).in('do_id', doIds),
          supabase.from('documents').select('ref_number').eq('type', 'GR'),
          supabase.from('delivery_reports').select('do_id,weight_sent,weight_received').in('do_id', doIds),
        ])
        const partialDoIds = new Set((partialReports || []).map(r => r.do_id).filter(Boolean))
        const grRefs       = new Set((grDocs || []).map(d => d.ref_number).filter(Boolean))
        setPartialDOs(
          doData
            .filter(d => partialDoIds.has(d.id) && !grRefs.has(d.number))
            .map(d => ({ id: d.id, number: d.number, clientName: d.client_name, items: d.items || [] }))
        )
        const kgMap = {}
        ;(allReports || []).forEach(r => {
          if (!r.do_id) return
          if (!kgMap[r.do_id]) kgMap[r.do_id] = { totalSent: 0, totalReceived: 0 }
          kgMap[r.do_id].totalSent += r.weight_sent || 0
          if (r.weight_received != null) kgMap[r.do_id].totalReceived += r.weight_received
        })
        setDoKgMap(kgMap)
      }
    })()

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
          ) : pendingDOs.map((d, idx) => {
            const kg = doKgMap[d.id]
            return (
              <div key={d.id} onClick={() => navigate('/dashboard/documents')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px', borderBottom: idx < pendingDOs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={15} color="#d97706" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{d.clientName}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.number} · {d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                  </p>
                  {kg && kg.totalSent > 0 && (
                    <p style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 3 }}>
                      Terkirim {kg.totalSent.toFixed(1)} kg{kg.totalReceived > 0 ? ` · Diterima ${kg.totalReceived.toFixed(1)} kg` : ''}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: '#d97706', background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.22)', whiteSpace: 'nowrap', flexShrink: 0 }}>Dikirim</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Partial DOs */}
      {partialDOs.length > 0 && (
        <div style={{ ...GLASS, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,59,48,0.18)' }}>
          <SectionHeader title={`Order Partial (${partialDOs.length})`} icon={<AlertTriangle size={15} color="#ff3b30" />} iconBg="rgba(255,59,48,0.12)" />
          {partialDOs.map((d, idx) => {
            const kg = doKgMap[d.id]
            const deficit = kg ? Math.max(0, kg.totalSent - kg.totalReceived) : null
            return (
              <div key={d.id} onClick={() => navigate('/dashboard/deliveries')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px', borderBottom: idx < partialDOs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'rgba(255,59,48,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={15} color="#ff3b30" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{d.clientName}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.number} · {d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                  </p>
                  {kg && kg.totalSent > 0 && (
                    <p style={{ fontSize: 11, fontWeight: 600, marginTop: 3, color: deficit > 0 ? '#ff3b30' : '#34c759' }}>
                      Kirim {kg.totalSent.toFixed(1)} kg · Terima {kg.totalReceived.toFixed(1)} kg{deficit > 0 ? ` · Sisa ${deficit.toFixed(1)} kg` : ''}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 99, color: '#ff3b30', background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.22)', whiteSpace: 'nowrap', flexShrink: 0 }}>⚠ Partial</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Owner / Admin Dashboard ──────────────────────────────────────────────────
function OwnerAdminDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

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
  const [dispatchedCount, setDispatched]= useState(0)
  const [delayedCount, setDelayedCount] = useState(0)
  const [partialCount, setPartialCount] = useState(0)
  const [noGrCount, setNoGrCount]       = useState(0)
  const [invoiceUnpaid, setInvoiceUnpaid] = useState(0)
  // Actual documents behind each Status Operasional row, so tapping a row
  // reveals which SO/DO/Invoice make up the count.
  const [opsLists, setOpsLists] = useState({ soDraft: [], dispatched: [], partial: [], noGr: [], invoiceUnpaid: [] })
  const [openOps, setOpenOps]   = useState(null)

  useEffect(() => {
    const t = setInterval(() => {
      const nowDate  = localToday()
      if (nowDate !== todayKey) {
        setTodayKey(nowDate)
        setThisMonth(nowDate.slice(0, 7))
        setTodayLabel(format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale }))
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

    // Load all docs + partial delivery reports in parallel
    Promise.all([
      supabase.from('documents')
        .select('id,number,type,status,total,date,ref_number,client_name,created_at')
        .order('created_at', { ascending: false }),
      supabase.from('delivery_reports')
        .select('do_id')
        .eq('is_partial', true)
        .not('do_id', 'is', null),
    ]).then(([{ data: docs }, { data: partialReports }]) => {
      if (!docs) return

      // Recent docs (last 5)
      setRecentDocs(docs.slice(0, 5))

      // SO metrics
      const soDocs = docs.filter(d => d.type === 'SO')
      setOrderPending(soDocs.filter(d => d.status === 'draft').length)

      const soDraftList = soDocs.filter(d => d.status === 'draft')

      // DO metrics
      const doDocs = docs.filter(d => d.type === 'DO')
      const dispatchedList = doDocs.filter(d => d.status === 'dispatched')
      setDispatched(dispatchedList.length)
      setDelayedCount(doDocs.filter(d => d.status === 'delayed').length)

      // GR set (ref_number = DO number it covers)
      const grRefs = new Set(docs.filter(d => d.type === 'GR').map(d => d.ref_number).filter(Boolean))

      // Omset Beranda = total jual per GR bulan ini. Pakai total jual GR (diisi
      // di Pembukuan) kalau ada, kalau tidak jatuh ke nilai DO -> SO sumbernya.
      const soTotalMap = {}
      soDocs.forEach(d => { if (d.number) soTotalMap[d.number] = d.total || 0 })
      const doJualMap = {}
      doDocs.forEach(d => { if (d.number) doJualMap[d.number] = d.total || soTotalMap[d.ref_number] || 0 })
      setPenjualan(
        docs.filter(d => d.type === 'GR' && (d.date || '').startsWith(thisMonth))
          .reduce((s, gr) => s + ((gr.total || 0) || doJualMap[gr.ref_number] || 0), 0)
      )

      // DO delivered but no GR yet
      const noGrList = doDocs.filter(d => d.status === 'delivered' && !grRefs.has(d.number))
      setNoGrCount(noGrList.length)

      // Partial: partial DOs that have no GR yet
      const partialDoIds = new Set((partialReports || []).map(r => r.do_id).filter(Boolean))
      const partialList = doDocs.filter(d => partialDoIds.has(d.id) && !grRefs.has(d.number))
      setPartialCount(partialList.length)

      // Invoice unpaid
      const invoiceUnpaidList = docs.filter(d => d.type === 'Invoice' && d.status === 'sent')
      setInvoiceUnpaid(invoiceUnpaidList.length)

      setOpsLists({
        soDraft: soDraftList,
        dispatched: dispatchedList,
        partial: partialList,
        noGr: noGrList,
        invoiceUnpaid: invoiceUnpaidList,
      })
    })
  }, [todayKey, thisMonth])

  const stokTipis = products.filter(p => (p.qty || 0) <= (p.min_qty > 0 ? p.min_qty : 10)).length

  const STATS = [
    { label: 'Penjualan Bulan Ini', value: rpFmt(penjualanBulanIni), sub: 'total jual DO (GR) bulan ini', Icon: TrendingUp,    iconColor: '#2563eb', iconBg: 'rgba(37,99,235,0.12)',  bar: '#2563eb' },
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
            { label: 'SO Draft',             desc: 'Sales order belum dikonfirmasi',      count: orderPending,   Icon: ClipboardList, color: '#5856d6', bg: 'rgba(88,86,214,0.10)',  listKey: 'soDraft' },
            { label: 'DO Dalam Pengiriman',  desc: 'Sedang dalam perjalanan ke klien',     count: dispatchedCount, Icon: Truck,        color: '#0891b2', bg: 'rgba(8,145,178,0.10)', listKey: 'dispatched' },
            { label: 'Pengiriman Partial',   desc: 'DO belum selesai diterima, belum di-GR', count: partialCount, Icon: Package,       color: '#d97706', bg: 'rgba(217,119,6,0.10)', listKey: 'partial' },
            { label: 'DO Belum Di-GR',       desc: 'Terkirim tapi belum ada Goods Receipt', count: noGrCount,     Icon: PackageCheck,  color: '#16a34a', bg: 'rgba(22,163,74,0.10)', listKey: 'noGr' },
            { label: 'Invoice Belum Dibayar', desc: 'Invoice terkirim, menunggu pembayaran', count: invoiceUnpaid, Icon: ArrowRight,   color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', listKey: 'invoiceUnpaid' },
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
                {items.map(({ label, desc, count, Icon, color, bg, listKey }, idx) => {
                  const list = opsLists[listKey] || []
                  const isOpen = openOps === label
                  const clickable = count > 0
                  return (
                    <div key={label} style={{ borderBottom: idx < items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div
                        onClick={() => clickable && setOpenOps(isOpen ? null : label)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: clickable ? 'pointer' : 'default' }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={color} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{desc}</p>
                        </div>
                        {clickable && (
                          <ChevronRight size={15} color="#cbd5e1"
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: 18, fontWeight: 800, color: count > 0 ? color : '#cbd5e1',
                          minWidth: 28, textAlign: 'right', flexShrink: 0,
                        }}>{count}</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 20px 12px 72px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {list.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Tidak ada data.</p>
                          ) : list.map(d => (
                            <div key={d.id}
                              onClick={() => navigate('/dashboard/documents', { state: { openId: d.id } })}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 8, cursor: 'pointer' }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: color, flexShrink: 0 }}>{d.number}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                <span style={{ fontSize: 11.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.client_name || '—'}</span>
                                <ChevronRight size={13} color="#cbd5e1" style={{ flexShrink: 0 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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
