import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Plus, X, Check, Receipt, BarChart2, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }
const GLASS = {
  background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.8)', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.88)',
  boxShadow: '0 2px 20px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,1)',
}

const EXPENSE_CATS = ['Operasional', 'Operasional Kirim', 'Transport', 'Utilitas', 'Gaji', 'Lainnya']
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

function SLabel({ text }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 2, margin: '0 0 8px', ...FF }}>
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

const TODAY_DATE = new Date()
function agingDays(inv) {
  const s = inv.dueDate || inv.date
  if (!s) return 0
  return Math.floor((TODAY_DATE - new Date(s + 'T00:00:00')) / 86400000)
}
const AGING_BUCKETS = [
  { label: 'Belum Jatuh Tempo', minDay: -Infinity, maxDay: 0,  color: '#34c759', bg: '#f0fdf4' },
  { label: '1–30 Hari',          minDay: 1,         maxDay: 30, color: '#ff9500', bg: '#fff8e1' },
  { label: '31–60 Hari',         minDay: 31,        maxDay: 60, color: '#ff6b00', bg: '#fff3e0' },
  { label: '>60 Hari',           minDay: 61,        maxDay: Infinity, color: '#ff3b30', bg: '#fff0f0' },
]

const inputStyle = {
  width: '100%', border: '1px solid #d1d1d6', borderRadius: 10, padding: '9px 12px',
  fontSize: 14, outline: 'none', background: 'white', color: '#1c1c1e',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function Bookkeeping() {
  const { isRole, profile } = useAuth()
  const isOwner = isRole('owner')
  const isAdmin = isRole('admin')
  const canLabaGR = isOwner || isAdmin   // admin boleh lihat Laba per GR (tanpa profit)

  const [tab, setTab]               = useState('piutang')
  const [invoices, setInvoices]     = useState([])
  const [grpDocs, setGrpDocs]       = useState([])
  const [prodMap, setProdMap]       = useState({})
  const [expenses, setExpenses]     = useState([])
  const [grSales, setGrSales]       = useState([])   // GR penjualan (owner)
  const [doDocs, setDoDocs]         = useState([])   // DO lengkap (buat edit harga jual)
  const [priceMaps, setPriceMaps]   = useState({ soItem: {}, prodJual: {} })
  const [loading, setLoading]       = useState(true)
  const [sortClient, setSortClient] = useState('total')
  const [showAllOutstanding, setShowAllOutstanding] = useState(false)
  const [expenseForm, setExpenseForm] = useState(null)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [deleteExpConfirm, setDeleteExpConfirm] = useState(null)

  const curYM = currentYM()
  const [labaMonth, setLabaMonth] = useState(curYM)  // filter bulan Laba per GR

  useEffect(() => {
    async function fetchAll() {
      const invRes = await supabase
        .from('documents')
        .select('id,number,date,status,client_name,total,due_date')
        .eq('type', 'Invoice')
        .order('date', { ascending: false })
      setInvoices((invRes.data || []).map(r => ({
        id: r.id, number: r.number, date: r.date, status: r.status,
        clientName: r.client_name, total: r.total || 0, dueDate: r.due_date || '',
      })))

      if (isOwner || isAdmin) {
        // Data untuk Laba per GR — dibuka utk owner & admin.
        // Harga modal/belanjaan per ITEM disimpan di dalam items GR (field `modal`).
        const [grRes, doRes, soRes, prodRes] = await Promise.all([
          supabase.from('documents').select('id,number,date,client_name,ref_number,items').eq('type', 'GR').order('date', { ascending: false }),
          supabase.from('documents').select('id,number,ref_number,items,total').eq('type', 'DO'),
          supabase.from('documents').select('number,items').eq('type', 'SO'),
          // Admin cukup harga jual (harga modal produk = rahasia owner, tidak diambil).
          supabase.from('products').select(isOwner ? 'nama,harga_modal,harga_jual' : 'nama,harga_jual'),
        ])
        const map = {}, prodJual = {}
        ;(prodRes.data || []).forEach(p => {
          if (!p.nama) return
          const k = p.nama.toLowerCase().trim()
          if (isOwner) map[k] = p.harga_modal || 0
          prodJual[k] = p.harga_jual || 0
        })
        setProdMap(map)

        // Peta harga jual item SO (buat fallback).
        const soItem = {}
        ;(soRes.data || []).forEach(d => {
          if (!d.number) return
          const m = {}
          ;(d.items || []).forEach(it => { if (it.name) m[it.name.toLowerCase().trim()] = parseFloat(it.price) || 0 })
          soItem[d.number] = m
        })
        setPriceMaps({ soItem, prodJual })
        setDoDocs(doRes.data || [])
        setGrSales(grRes.data || [])

        // GRP (HPP) & pengeluaran — khusus owner (Laba Rugi).
        if (isOwner) {
          const [grpRes, expRes] = await Promise.all([
            supabase.from('purchases').select('id,number,date,items').eq('type', 'GRP').eq('status', 'received'),
            supabase.from('expenses').select('*').order('date', { ascending: false }),
          ])
          setGrpDocs(grpRes.data || [])
          setExpenses(expRes.data || [])
        }
      }
      setLoading(false)
    }
    fetchAll()
  }, [isOwner, isAdmin])

  // ── Piutang derived ──
  const active = invoices.filter(d => d.status !== 'cancelled' && d.status !== 'draft')
  const piutangAktif     = active.filter(d => d.status === 'sent').reduce((s, d) => s + d.total, 0)
  const piutangOverdue   = active.filter(d => d.status === 'overdue').reduce((s, d) => s + d.total, 0)
  const terbayarBulanIni = active.filter(d => d.status === 'paid' && (d.date || '').startsWith(curYM)).reduce((s, d) => s + d.total, 0)
  const overdueCount     = active.filter(d => d.status === 'overdue').length
  const sentCount        = active.filter(d => d.status === 'sent').length

  const months6 = last6Months()
  const paidByMonth = {}
  active.filter(d => d.status === 'paid').forEach(d => {
    const ym = (d.date || '').slice(0, 7)
    paidByMonth[ym] = (paidByMonth[ym] || 0) + d.total
  })
  const chartData = months6.map(ym => ({ ym, value: paidByMonth[ym] || 0 }))
  const chartMax = Math.max(...chartData.map(d => d.value), 1)

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

  const outstanding = active
    .filter(d => d.status === 'sent' || d.status === 'overdue')
    .sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (b.status === 'overdue' && a.status !== 'overdue') return 1
      return (a.dueDate || a.date || '').localeCompare(b.dueDate || b.date || '')
    })
  const shownOutstanding = showAllOutstanding ? outstanding : outstanding.slice(0, 5)

  // ── Aging buckets ──
  const agingData = AGING_BUCKETS.map(b => {
    const items = outstanding.filter(inv => { const d = agingDays(inv); return d >= b.minDay && d <= b.maxDay })
    return { ...b, count: items.length, total: items.reduce((s, i) => s + i.total, 0) }
  })

  // ── P&L derived ──
  function grpHpp(doc) {
    return (doc.items || []).reduce((s, item) => {
      if (item.condition === 'return') return s
      const qty = parseFloat(item.receivedQty) || 0
      const modal = prodMap[item.name?.toLowerCase().trim()] || 0
      return s + qty * modal
    }, 0)
  }
  const plData = months6.map(ym => {
    const revenue = active.filter(d => d.status === 'paid' && (d.date || '').startsWith(ym)).reduce((s, d) => s + d.total, 0)
    const hpp = grpDocs.filter(d => (d.date || '').startsWith(ym)).reduce((s, d) => s + grpHpp(d), 0)
    const opex = expenses.filter(e => (e.date || '').startsWith(ym)).reduce((s, e) => s + (e.amount || 0), 0)
    return { ym, revenue, hpp, opex, grossProfit: revenue - hpp, netProfit: revenue - hpp - opex }
  })

  // ── Laba per GR (owner) — profit per item produk ──
  const doByNumber = {}
  doDocs.forEach(d => { if (d.number) doByNumber[d.number] = d })
  // Harga jual per item. Prioritas: yang diisi di GR (item.jual) -> harga item
  // DO -> item SO sumbernya -> master produk.
  const jualUnitFor = (gr, item) => {
    if (item.jual !== undefined && item.jual !== null && item.jual !== '') return parseFloat(item.jual) || 0
    const nameLower = (item.name || '').toLowerCase().trim()
    const dobj = doByNumber[gr.ref_number]
    const doPrice = parseFloat(dobj?.items?.find(it => (it.name || '').toLowerCase().trim() === nameLower)?.price) || 0
    if (doPrice) return doPrice
    const soNo = dobj?.ref_number
    const fromSo = soNo ? (priceMaps.soItem[soNo]?.[nameLower] || 0) : 0
    if (fromSo) return fromSo
    return priceMaps.prodJual[nameLower] || 0
  }
  const grTotalJual = (g) => (g.items || []).reduce((s, it) => {
    if (!it.name?.trim()) return s
    const qty = parseFloat(it.receivedQty) || parseFloat(it.qty) || 0
    return s + jualUnitFor(g, it) * qty
  }, 0)
  const labaGR = grSales.map(g => {
    const items = (g.items || [])
      .map((it, origIdx) => ({ it, origIdx }))
      .filter(x => x.it.name?.trim())
      .map(({ it, origIdx }) => {
        const qty        = parseFloat(it.receivedQty) || parseFloat(it.qty) || 0
        const jualUnit   = jualUnitFor(g, it)
        const modalUnit  = parseFloat(it.modal) || 0
        const jual  = jualUnit * qty
        const modal = modalUnit * qty
        return { idx: origIdx, name: it.name, unit: it.unit || 'kg', qty, jualUnit, modalUnit, jual, modal, profit: jual - modal }
      })
    const jual  = items.reduce((s, i) => s + i.jual, 0)
    const modal = items.reduce((s, i) => s + i.modal, 0)
    return { id: g.id, number: g.number, date: g.date, clientName: g.client_name, refNumber: g.ref_number, items, jual, modal, profit: jual - modal }
  })
  // Bulan yang tersedia (dari tanggal GR), terbaru dulu.
  const labaMonths = [...new Set(labaGR.map(r => (r.date || '').slice(0, 7)).filter(Boolean))].sort().reverse()
  const labaGRView = labaMonth === 'all' ? labaGR : labaGR.filter(r => (r.date || '').startsWith(labaMonth))
  const totalOmsetGR  = labaGRView.reduce((s, r) => s + r.jual, 0)
  const totalModalGR  = labaGRView.reduce((s, r) => s + r.modal, 0)
  const totalProfitGR = totalOmsetGR - totalModalGR

  // ── Rekap terjual per produk (akumulasi kiloan) — owner & admin ──
  const produkRecapMap = {}
  labaGRView.forEach(g => (g.items || []).forEach(it => {
    const key = ((it.name || '').trim() || '(tanpa nama)').toLowerCase()
    if (!produkRecapMap[key]) produkRecapMap[key] = { name: (it.name || '').trim() || '(tanpa nama)', qty: 0, unit: it.unit || 'kg', jual: 0 }
    produkRecapMap[key].qty  += it.qty || 0
    produkRecapMap[key].jual += it.jual || 0
    if (!produkRecapMap[key].unit && it.unit) produkRecapMap[key].unit = it.unit
  }))
  const produkRecap = Object.values(produkRecapMap).sort((a, b) => b.qty - a.qty)
  const totalKgGR   = produkRecap.reduce((s, p) => s + p.qty, 0)
  const fmtKg = n => (Math.round((n || 0) * 100) / 100).toLocaleString('id-ID')

  // ── Invoice jatuh tempo & telat ──
  const todayISO = new Date().toISOString().slice(0, 10)
  const invTelat = outstanding.filter(d => d.status === 'overdue' || (d.dueDate && d.dueDate < todayISO))
  const invJatuhTempo = outstanding.filter(d =>
    !invTelat.includes(d) && d.dueDate && d.dueDate >= todayISO &&
    (new Date(d.dueDate) - new Date(todayISO)) / 86400000 <= 7
  )

  // Simpan harga modal per item (per unit) ke dalam items GR.
  async function saveItemModal(grId, origIdx, value) {
    const modalUnit = parseFloat(value) || 0
    const g = grSales.find(x => x.id === grId)
    if (!g) return
    const newItems = (g.items || []).map((it, i) => i === origIdx ? { ...it, modal: modalUnit } : it)
    setGrSales(prev => prev.map(x => x.id === grId ? { ...x, items: newItems } : x))
    const { error } = await supabase.from('documents').update({ items: newItems }).eq('id', grId)
    if (error) alert('Gagal menyimpan modal: ' + error.message)
  }

  // Simpan harga jual per item ke dalam GR-nya (field `jual` per item). Selalu
  // bisa disimpan, tak tergantung DO. GR.total = total jual (dipakai omset Beranda).
  async function saveItemJual(grId, origIdx, value) {
    const jualUnit = parseFloat(value) || 0
    const g = grSales.find(x => x.id === grId)
    if (!g) return
    const newItems = (g.items || []).map((it, i) => i === origIdx ? { ...it, jual: jualUnit } : it)
    const newG = { ...g, items: newItems }
    setGrSales(prev => prev.map(x => x.id === grId ? newG : x))
    const { error } = await supabase.from('documents').update({ items: newItems, total: grTotalJual(newG) }).eq('id', grId)
    if (error) alert('Gagal menyimpan harga jual: ' + error.message)
  }

  // Update LIVE saat ngetik — biar profit & total langsung keakumulasi.
  function setJualLocal(grId, origIdx, value) {
    const jualUnit = value === '' ? 0 : (parseFloat(value) || 0)
    setGrSales(prev => prev.map(x => x.id === grId
      ? { ...x, items: (x.items || []).map((it, i) => i === origIdx ? { ...it, jual: jualUnit } : it) }
      : x))
  }
  function setModalLocal(grId, origIdx, value) {
    const modalUnit = value === '' ? 0 : (parseFloat(value) || 0)
    setGrSales(prev => prev.map(x => {
      if (x.id !== grId) return x
      return { ...x, items: (x.items || []).map((it, i) => i === origIdx ? { ...it, modal: modalUnit } : it) }
    }))
  }

  // ── Expenses derived ──
  const expByMonth = {}
  expenses.forEach(e => {
    const ym = (e.date || '').slice(0, 7)
    if (!ym) return
    if (!expByMonth[ym]) expByMonth[ym] = { ym, total: 0, items: [] }
    expByMonth[ym].total += e.amount || 0
    expByMonth[ym].items.push(e)
  })
  const expMonths = Object.values(expByMonth).sort((a, b) => b.ym.localeCompare(a.ym))
  const expThisMonth = (expByMonth[curYM]?.total) || 0

  async function saveExpense() {
    const isKirim = expenseForm?.category === 'Operasional Kirim'
    const uangJalan = parseFloat(expenseForm?.uang_jalan) || 0
    const tip = parseFloat(expenseForm?.tip) || 0
    const amount = isKirim ? uangJalan + tip : parseFloat(expenseForm?.amount)
    if (!expenseForm?.date) return
    if (isKirim ? amount <= 0 : !expenseForm?.amount) return
    setExpenseSaving(true)
    try {
      const payload = {
        date: expenseForm.date,
        category: expenseForm.category || 'Operasional',
        description: isKirim
          ? [expenseForm.restoran?.trim(), expenseForm.karyawan?.trim() && `karyawan: ${expenseForm.karyawan.trim()}`].filter(Boolean).join(' · ') || null
          : (expenseForm.description?.trim() || null),
        amount,
        restoran: isKirim ? (expenseForm.restoran?.trim() || null) : null,
        karyawan: isKirim ? (expenseForm.karyawan?.trim() || null) : null,
        uang_jalan: isKirim ? uangJalan : 0,
        tip: isKirim ? tip : 0,
        created_by: profile?.name || null,
      }
      if (expenseForm.id) {
        await supabase.from('expenses').update(payload).eq('id', expenseForm.id)
        setExpenses(prev => prev.map(e => e.id === expenseForm.id ? { ...e, ...payload } : e))
      } else {
        const { data } = await supabase.from('expenses').insert(payload).select().single()
        if (data) setExpenses(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      }
      setExpenseForm(null)
    } catch {}
    setExpenseSaving(false)
  }

  async function doDeleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    setDeleteExpConfirm(null)
  }

  const thStyle = { fontSize: 11, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.04em' }

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#8e8e93', fontSize: 15, ...FF }}>Memuat data...</div>
  }

  return (
    <div style={{ maxWidth: 720, ...FF, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Banner reminder invoice jatuh tempo / telat */}
      {(invTelat.length > 0 || invJatuhTempo.length > 0) && (
        <div onClick={() => setTab('piutang')} style={{ cursor: 'pointer', background: invTelat.length > 0 ? '#fff0f0' : '#fff8e1', border: `1px solid ${invTelat.length > 0 ? '#fecaca' : '#fde68a'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} color={invTelat.length > 0 ? '#dc2626' : '#d97706'} />
          <p style={{ fontSize: 13, fontWeight: 600, color: invTelat.length > 0 ? '#dc2626' : '#92400e', margin: 0 }}>
            {invTelat.length > 0 && `${invTelat.length} invoice telat bayar`}
            {invTelat.length > 0 && invJatuhTempo.length > 0 && ' · '}
            {invJatuhTempo.length > 0 && `${invJatuhTempo.length} invoice jatuh tempo ≤7 hari`}
          </p>
        </div>
      )}

      {/* Header + Tabs */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: '0 0 16px' }}>
          {isOwner ? 'Pembukuan' : 'Rekap Keuangan'}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'piutang',    label: 'Piutang' },
            { key: 'pengeluaran', label: 'Pengeluaran', ownerOnly: false },
            ...(isOwner ? [{ key: 'labarugi', label: 'Laba Rugi' }, { key: 'labagr', label: 'Laba per GR' }] : (isAdmin ? [{ key: 'labagr', label: 'Laba per GR' }] : [])),
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', ...FF,
              fontSize: 13, fontWeight: tab === key ? 700 : 500,
              background: tab === key ? '#1c1c1e' : 'rgba(0,0,0,0.06)',
              color: tab === key ? 'white' : '#6e6e73',
              transition: 'all 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ══════════ TAB: PIUTANG ══════════ */}
      {tab === 'piutang' && (
        <>
          {/* Summary cards */}
          <div>
            <SLabel text="Ringkasan" />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SummaryCard label="Piutang Aktif" value={fmtRp(piutangAktif)} color="#007aff" bg="#eff6ff" icon={TrendingUp}
                sub={sentCount > 0 ? `${sentCount} invoice menunggu` : 'Tidak ada'} />
              <SummaryCard label="Terbayar Bulan Ini" value={fmtRp(terbayarBulanIni)} color="#34c759" bg="#f0fdf4" icon={CheckCircle}
                sub={fmtMonth(curYM)} />
              <SummaryCard label="Jatuh Tempo" value={fmtRp(piutangOverdue)}
                color={piutangOverdue > 0 ? '#ff3b30' : '#8e8e93'} bg={piutangOverdue > 0 ? '#fff0f0' : '#f2f2f7'}
                icon={AlertCircle} sub={overdueCount > 0 ? `${overdueCount} invoice overdue` : 'Tidak ada'} />
            </div>
          </div>

          {/* Invoice Jatuh Tempo & Telat */}
          {(invTelat.length > 0 || invJatuhTempo.length > 0) && (
            <div>
              <SLabel text="Perlu Ditagih — Jatuh Tempo & Telat" />
              <div style={{ ...GLASS, overflow: 'hidden' }}>
                {[...invTelat.map(d => ({ ...d, _late: true })), ...invJatuhTempo.map(d => ({ ...d, _late: false }))].map((d, i, arr) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.number} · {d.clientName || '–'}</p>
                      <p style={{ fontSize: 11.5, margin: '2px 0 0', color: d._late ? '#dc2626' : '#d97706', fontWeight: 500 }}>
                        {d._late ? `⚠ Telat — jatuh tempo ${d.dueDate || '-'}` : `Jatuh tempo ${d.dueDate || '-'}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: d._late ? '#dc2626' : '#1c1c1e', flexShrink: 0 }}>{fmtRp(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Piutang Aging Analysis */}
          {outstanding.length > 0 && (
            <div>
              <SLabel text="Analisis Aging Piutang" />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {agingData.map(b => (
                  <div key={b.label} style={{
                    flex: 1, minWidth: 120, ...GLASS, padding: '14px 16px',
                    borderLeft: `3px solid ${b.color}`,
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: b.color, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: '0 0 2px' }}>{b.count} inv</p>
                    <p style={{ fontSize: 12, color: b.count > 0 ? b.color : '#c7c7cc', margin: 0, fontWeight: b.count > 0 ? 600 : 400 }}>
                      {b.count > 0 ? fmtRp(b.total) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                            <p style={{ fontSize: 9.5, color: '#8e8e93', margin: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}jt` : `${Math.round(value / 1000)}rb`}
                            </p>
                          )}
                          <div style={{ width: '100%', height: `${Math.max((value / chartMax) * 80, value > 0 ? 5 : 0)}px`, borderRadius: '5px 5px 0 0', background: ym === curYM ? '#007aff' : 'rgba(0,122,255,0.22)', minHeight: 0 }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, borderTop: '0.5px solid rgba(0,0,0,0.07)', paddingTop: 8 }}>
                      {chartData.map(({ ym }) => (
                        <div key={ym} style={{ flex: 1, textAlign: 'center' }}>
                          <p style={{ fontSize: 11, color: ym === curYM ? '#007aff' : '#8e8e93', fontWeight: ym === curYM ? 700 : 400, margin: 0 }}>{shortMonth(ym)}</p>
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
                <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)', minWidth: 480 }}>
                  <span style={{ flex: 1, ...thStyle }}>Bulan</span>
                  <span style={{ width: 36, ...thStyle, textAlign: 'center' }}>Inv</span>
                  {isOwner && <span style={{ width: 130, ...thStyle, textAlign: 'right' }}>Total Tagihan</span>}
                  <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#34c759' }}>Terbayar</span>
                  <span style={{ width: 120, ...thStyle, textAlign: 'right', color: '#ff9500' }}>Piutang</span>
                </div>
                {monthRecap.map((m, idx) => (
                  <div key={m.ym} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: idx < monthRecap.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', minWidth: 480 }}>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1c1c1e' }}>{fmtMonth(m.ym)}</span>
                    <span style={{ width: 36, fontSize: 13, color: '#8e8e93', textAlign: 'center' }}>{m.count}</span>
                    {isOwner && <span style={{ width: 130, fontSize: 13, color: '#1c1c1e', textAlign: 'right' }}>{fmtRp(m.total)}</span>}
                    <span style={{ width: 120, fontSize: 13, fontWeight: m.paid > 0 ? 600 : 400, color: m.paid > 0 ? '#34c759' : '#c7c7cc', textAlign: 'right' }}>{m.paid > 0 ? fmtRp(m.paid) : '–'}</span>
                    <span style={{ width: 120, fontSize: 13, fontWeight: m.outstanding > 0 ? 600 : 400, color: m.outstanding > 0 ? '#ff9500' : '#c7c7cc', textAlign: 'right' }}>{m.outstanding > 0 ? fmtRp(m.outstanding) : '–'}</span>
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
                    fontSize: 11, padding: '3px 9px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    background: sortClient === v ? '#1c1c1e' : 'rgba(0,0,0,0.07)',
                    color: sortClient === v ? 'white' : '#3c3c43',
                    fontWeight: sortClient === v ? 600 : 400, ...FF,
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
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '1px 0 0' }}>{c.count} invoice</p>
                    </div>
                    {isOwner && <span style={{ width: 130, fontSize: 13, color: '#1c1c1e', textAlign: 'right', flexShrink: 0 }}>{fmtRp(c.total)}</span>}
                    <span style={{ width: 120, fontSize: 13, fontWeight: c.paid > 0 ? 600 : 400, color: c.paid > 0 ? '#34c759' : '#c7c7cc', textAlign: 'right', flexShrink: 0 }}>{c.paid > 0 ? fmtRp(c.paid) : '–'}</span>
                    <span style={{ width: 120, fontSize: 13, fontWeight: c.outstanding > 0 ? 600 : 400, color: c.outstanding > 0 ? '#ff9500' : '#c7c7cc', textAlign: 'right', flexShrink: 0 }}>{c.outstanding > 0 ? fmtRp(c.outstanding) : '–'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoice outstanding */}
          {isOwner && outstanding.length > 0 && (
            <div>
              <SLabel text={`Invoice Belum Lunas (${outstanding.length})`} />
              <div style={{ ...GLASS, overflow: 'hidden' }}>
                {shownOutstanding.map((inv, idx) => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: idx < shownOutstanding.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1c1e' }}>{inv.number}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: inv.status === 'overdue' ? '#fff0f0' : '#fff8e1', color: inv.status === 'overdue' ? '#ff3b30' : '#ff9500' }}>
                          {inv.status === 'overdue' ? 'Jatuh Tempo' : 'Menunggu'}
                        </span>
                        {inv.dueDate && (
                          <span style={{ fontSize: 11, color: '#8e8e93' }}>+{agingDays(inv)} hari</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>{inv.clientName}</p>
                      {inv.dueDate && <p style={{ fontSize: 11.5, color: inv.status === 'overdue' ? '#ff3b30' : '#8e8e93', margin: '2px 0 0' }}>Jatuh tempo: {fmtDate(inv.dueDate)}</p>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', margin: 0, flexShrink: 0 }}>{fmtRp(inv.total)}</p>
                  </div>
                ))}
                {outstanding.length > 5 && (
                  <button onClick={() => setShowAllOutstanding(v => !v)} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 13, color: '#007aff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...FF }}>
                    {showAllOutstanding ? <><ChevronUp size={14} /> Sembunyikan</> : <><ChevronDown size={14} /> Lihat semua {outstanding.length} invoice</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════ TAB: PENGELUARAN ══════════ */}
      {tab === 'pengeluaran' && (
        <>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <SLabel text="Pengeluaran Harian" />
                <p style={{ fontSize: 13, color: '#8e8e93', margin: 0 }}>Bulan ini: <strong style={{ color: '#ff3b30' }}>{fmtRp(expThisMonth)}</strong></p>
              </div>
              {isOwner && (
                <button onClick={() => setExpenseForm({ date: new Date().toISOString().slice(0, 10), category: 'Operasional', description: '', amount: '', restoran: '', karyawan: '', uang_jalan: '', tip: '' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#ff3b30', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', ...FF }}>
                  <Plus size={14} /> Catat Pengeluaran
                </button>
              )}
            </div>

            {expMonths.length === 0 ? (
              <div style={{ ...GLASS, padding: 40, textAlign: 'center', color: '#8e8e93', fontSize: 14 }}>
                <Receipt size={36} color="#c7c7cc" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                Belum ada pengeluaran tercatat.{isOwner && ' Klik "+ Catat Pengeluaran" untuk mulai.'}
              </div>
            ) : (
              expMonths.map(({ ym, total, items }) => (
                <div key={ym} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{fmtMonth(ym)}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#ff3b30', margin: 0 }}>{fmtRp(total)}</p>
                  </div>
                  <div style={{ ...GLASS, overflow: 'hidden' }}>
                    {items.map((e, idx) => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: idx < items.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: e.category === 'Operasional Kirim' ? 'rgba(0,122,255,0.1)' : '#f2f2f7', color: e.category === 'Operasional Kirim' ? '#007aff' : '#6e6e73' }}>{e.category}</span>
                            <span style={{ fontSize: 12, color: '#8e8e93' }}>{fmtDate(e.date)}</span>
                          </div>
                          {e.restoran && <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1c1c1e', margin: '0 0 1px' }}>🍽️ {e.restoran}{e.karyawan ? ` · ${e.karyawan}` : ''}</p>}
                          {(e.uang_jalan > 0 || e.tip > 0) && (
                            <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>
                              {e.uang_jalan > 0 && <>Uang jalan {fmtRp(e.uang_jalan)}</>}
                              {e.uang_jalan > 0 && e.tip > 0 && ' · '}
                              {e.tip > 0 && <>Tip chef/SK {fmtRp(e.tip)}</>}
                            </p>
                          )}
                          {!e.restoran && e.description && <p style={{ fontSize: 13, color: '#3c3c43', margin: 0 }}>{e.description}</p>}
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#ff3b30', margin: 0, flexShrink: 0 }}>{fmtRp(e.amount)}</p>
                        {isOwner && (
                          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            <button onClick={() => setExpenseForm({ id: e.id, date: e.date, category: e.category, description: e.description || '', amount: String(e.amount), restoran: e.restoran || '', karyawan: e.karyawan || '', uang_jalan: e.uang_jalan ? String(e.uang_jalan) : '', tip: e.tip ? String(e.tip) : '' })}
                              style={{ padding: 6, border: 'none', borderRadius: 7, background: 'transparent', cursor: 'pointer', color: '#c7c7cc' }}
                              onMouseEnter={ev => ev.currentTarget.style.color = '#007aff'}
                              onMouseLeave={ev => ev.currentTarget.style.color = '#c7c7cc'}>
                              ✏️
                            </button>
                            <button onClick={() => setDeleteExpConfirm(e.id)}
                              style={{ padding: 6, border: 'none', borderRadius: 7, background: 'transparent', cursor: 'pointer', color: '#c7c7cc' }}
                              onMouseEnter={ev => ev.currentTarget.style.color = '#ff3b30'}
                              onMouseLeave={ev => ev.currentTarget.style.color = '#c7c7cc'}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════════ TAB: LABA RUGI ══════════ */}
      {tab === 'labarugi' && isOwner && (
        <>
          <div style={{ background: '#fff8e1', border: '1px solid #fde68a', borderRadius: 12, padding: '11px 16px' }}>
            <p style={{ fontSize: 12.5, color: '#92400e', margin: 0 }}>
              <strong>Estimasi HPP</strong> dihitung dari GRP diterima × harga modal produk. Pastikan harga modal sudah diisi di halaman Produk &amp; Harga.
            </p>
          </div>

          {/* P&L by month table */}
          <div>
            <SLabel text="Laba Rugi — 6 Bulan Terakhir" />
            <div style={{ ...GLASS, overflow: 'hidden', overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr 1fr', minWidth: 620, padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)', gap: 4 }}>
                <span style={{ ...thStyle }}>Bulan</span>
                <span style={{ ...thStyle, textAlign: 'right', color: '#34c759' }}>Pendapatan</span>
                <span style={{ ...thStyle, textAlign: 'right', color: '#ff9500' }}>Est. HPP</span>
                <span style={{ ...thStyle, textAlign: 'right', color: '#ff3b30' }}>Pengeluaran</span>
                <span style={{ ...thStyle, textAlign: 'right', color: '#007aff' }}>Laba Kotor</span>
                <span style={{ ...thStyle, textAlign: 'right' }}>Laba Bersih</span>
              </div>
              {[...plData].reverse().map((row, idx) => (
                <div key={row.ym} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr 1fr', minWidth: 620, padding: '12px 16px', borderBottom: idx < plData.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', gap: 4, alignItems: 'center', background: row.ym === curYM ? 'rgba(0,122,255,0.03)' : 'transparent' }}>
                  <span style={{ fontSize: 12.5, fontWeight: row.ym === curYM ? 700 : 500, color: row.ym === curYM ? '#007aff' : '#1c1c1e' }}>{shortMonth(row.ym)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#34c759', textAlign: 'right' }}>{row.revenue > 0 ? fmtRp(row.revenue) : '–'}</span>
                  <span style={{ fontSize: 12.5, color: '#ff9500', textAlign: 'right' }}>{row.hpp > 0 ? fmtRp(row.hpp) : '–'}</span>
                  <span style={{ fontSize: 12.5, color: '#ff3b30', textAlign: 'right' }}>{row.opex > 0 ? fmtRp(row.opex) : '–'}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: row.grossProfit >= 0 ? '#007aff' : '#ff3b30', textAlign: 'right' }}>{row.revenue > 0 || row.hpp > 0 ? fmtRp(row.grossProfit) : '–'}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.netProfit >= 0 ? '#1c1c1e' : '#ff3b30', textAlign: 'right' }}>
                    {row.revenue > 0 || row.hpp > 0 || row.opex > 0 ? fmtRp(row.netProfit) : '–'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary for current month */}
          {(() => {
            const cur = plData[plData.length - 1]
            if (!cur) return null
            const margin = cur.revenue > 0 ? Math.round((cur.netProfit / cur.revenue) * 100) : null
            return (
              <div>
                <SLabel text={`Rincian ${fmtMonth(curYM)}`} />
                <div style={{ ...GLASS, padding: '18px 20px' }}>
                  {[
                    { label: 'Pendapatan (Invoice Lunas)',  value: cur.revenue,     color: '#34c759' },
                    { label: 'Harga Pokok Penjualan (HPP)', value: -cur.hpp,         color: '#ff9500', prefix: '–' },
                    null,
                    { label: 'Laba Kotor',                  value: cur.grossProfit, color: '#007aff', bold: true },
                    { label: 'Pengeluaran Operasional',      value: -cur.opex,       color: '#ff3b30', prefix: '–' },
                    null,
                    { label: 'Laba Bersih',                 value: cur.netProfit,   color: cur.netProfit >= 0 ? '#1c1c1e' : '#ff3b30', bold: true, large: true },
                  ].map((row, i) => {
                    if (row === null) return <div key={i} style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', margin: '10px 0' }} />
                    return (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                        <span style={{ fontSize: row.large ? 15 : 13.5, fontWeight: row.bold ? 700 : 400, color: '#3c3c43' }}>{row.label}</span>
                        <span style={{ fontSize: row.large ? 16 : 13.5, fontWeight: row.bold ? 700 : 500, color: row.color }}>
                          {row.prefix}{fmtRp(Math.abs(row.value))}
                        </span>
                      </div>
                    )
                  })}
                  {margin !== null && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: cur.netProfit >= 0 ? '#f0fdf4' : '#fff0f0', borderRadius: 9 }}>
                      <p style={{ fontSize: 12.5, color: cur.netProfit >= 0 ? '#15803d' : '#dc2626', margin: 0, fontWeight: 600 }}>
                        Margin bersih: {margin}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ══════════ TAB: LABA PER GR ══════════ */}
      {tab === 'labagr' && canLabaGR && (
        <>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '11px 16px' }}>
            <p style={{ fontSize: 12.5, color: '#1e40af', margin: 0 }}>
              {isOwner
                ? <>Harga <strong>Jual</strong> otomatis dari nilai DO. Isi <strong>Modal</strong> tiap GR — <strong>Profit</strong> dihitung otomatis. Hanya owner yang bisa lihat.</>
                : <>Harga <strong>Jual</strong> otomatis dari nilai DO. Isi <strong>Belanjaan</strong> tiap GR sesuai pengeluaran barang.</>}
            </p>
          </div>

          {/* Filter bulan */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ k: 'all', l: 'Semua' }, ...labaMonths.map(m => ({ k: m, l: fmtMonth(m) }))].map(({ k, l }) => (
              <button key={k} onClick={() => setLabaMonth(k)} style={{
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', ...FF,
                fontSize: 12.5, fontWeight: labaMonth === k ? 700 : 500, whiteSpace: 'nowrap',
                background: labaMonth === k ? '#007aff' : 'rgba(0,0,0,0.06)',
                color: labaMonth === k ? 'white' : '#6e6e73', transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <SummaryCard label="Total Omset" value={fmtRp(totalOmsetGR)} color="#007aff" bg="#eff6ff" icon={TrendingUp} sub={`${labaGRView.length} GR${labaMonth !== 'all' ? ' · ' + fmtMonth(labaMonth) : ''}`} />
            <SummaryCard label={isOwner ? 'Total Modal' : 'Total Belanjaan'} value={fmtRp(totalModalGR)} color="#ff9500" bg="#fff8e1" icon={AlertCircle} sub={isOwner ? 'harga modal' : 'belanjaan'} />
            {isOwner && <SummaryCard label="Total Profit" value={fmtRp(totalProfitGR)} color={totalProfitGR >= 0 ? '#34c759' : '#ff3b30'} bg={totalProfitGR >= 0 ? '#f0fdf4' : '#fff0f0'} icon={CheckCircle} sub="jual − modal" />}
          </div>

          {/* Rekap terjual per produk (akumulasi kiloan) */}
          {produkRecap.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SLabel text="Terjual per Produk (akumulasi kg)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#007aff' }}>Total {fmtKg(totalKgGR)} kg</span>
              </div>
              <div style={{ ...GLASS, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.1fr', gap: 6, padding: '8px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)' }}>
                  <span style={thStyle}>Produk</span>
                  <span style={{ ...thStyle, textAlign: 'right', color: '#007aff' }}>Terjual</span>
                  <span style={{ ...thStyle, textAlign: 'right', color: '#34c759' }}>Omset</span>
                </div>
                {produkRecap.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.1fr', gap: 6, padding: '10px 16px', borderBottom: i < produkRecap.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1c1c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#007aff', textAlign: 'right' }}>{fmtKg(p.qty)} <span style={{ fontSize: 10.5, fontWeight: 500, color: '#8e8e93' }}>{p.unit}</span></span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1c1c1e', textAlign: 'right' }}>{fmtRp(p.jual)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SLabel text={isOwner ? 'Rincian per GR — modal diisi per item' : 'Rincian per GR — belanjaan diisi per item'} />
            {labaGRView.length === 0 ? (
              <div style={{ ...GLASS, padding: '24px', textAlign: 'center', color: '#8e8e93', fontSize: 13.5 }}>{labaGR.length === 0 ? 'Belum ada GR.' : 'Belum ada GR di bulan ini.'}</div>
            ) : labaGRView.map(g => (
              <div key={g.id} style={{ ...GLASS, overflow: 'hidden' }}>
                {/* Header GR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.number}{g.refNumber ? ` · ${g.refNumber}` : ''}</p>
                    <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '2px 0 0' }}>{g.clientName || '–'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 10.5, color: '#8e8e93', margin: 0 }}>{isOwner ? 'Profit GR' : 'Omset GR'}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isOwner ? (g.profit >= 0 ? '#34c759' : '#ff3b30') : '#007aff', margin: '1px 0 0' }}>{isOwner ? (g.jual > 0 || g.modal > 0 ? fmtRp(g.profit) : '–') : fmtRp(g.jual)}</p>
                  </div>
                </div>
                {/* Header kolom item */}
                <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '1.4fr 1fr 1fr 0.9fr' : '1.4fr 1fr 1fr', gap: 6, padding: '7px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <span style={thStyle}>Produk</span>
                  <span style={{ ...thStyle, textAlign: 'right', color: '#007aff' }}>Jual/unit</span>
                  <span style={{ ...thStyle, textAlign: 'right', color: '#ff9500' }}>{isOwner ? 'Modal/unit' : 'Belanjaan/unit'}</span>
                  {isOwner && <span style={{ ...thStyle, textAlign: 'right', color: '#34c759' }}>Profit</span>}
                </div>
                {g.items.length === 0 ? (
                  <div style={{ padding: '12px 16px', color: '#8e8e93', fontSize: 12 }}>Tidak ada item.</div>
                ) : g.items.map((it, i) => (
                  <div key={it.idx} style={{ display: 'grid', gridTemplateColumns: isOwner ? '1.4fr 1fr 1fr 0.9fr' : '1.4fr 1fr 1fr', gap: 6, padding: '9px 16px', borderBottom: i < g.items.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</p>
                      <p style={{ fontSize: 10.5, color: '#8e8e93', margin: '1px 0 0' }}>{it.qty} {it.unit}</p>
                    </div>
                    <input type="number" min="0" value={it.jualUnit || ''} placeholder="isi jual"
                      onChange={e => setJualLocal(g.id, it.idx, e.target.value)}
                      onBlur={e => saveItemJual(g.id, it.idx, e.target.value)}
                      style={{ width: '100%', border: '1px solid #d6e4ff', background: it.jualUnit > 0 ? 'white' : '#eff6ff', borderRadius: 8, padding: '5px 7px', fontSize: 11.5, textAlign: 'right', ...FF }} />
                    <input type="number" min="0" value={it.modalUnit || ''} placeholder="0"
                      onChange={e => setModalLocal(g.id, it.idx, e.target.value)}
                      onBlur={e => saveItemModal(g.id, it.idx, e.target.value)}
                      style={{ width: '100%', border: '1px solid #e5e5ea', borderRadius: 8, padding: '5px 7px', fontSize: 11.5, textAlign: 'right', ...FF }} />
                    {isOwner && <span style={{ fontSize: 12, fontWeight: 700, color: it.profit >= 0 ? '#34c759' : '#ff3b30', textAlign: 'right' }}>{it.jual > 0 || it.modal > 0 ? fmtRp(it.profit) : '–'}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Modal: Catat Pengeluaran ── */}
      {expenseForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#f2f2f7', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden', ...FF }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid #d1d1d6' }}>
              <button onClick={() => setExpenseForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#007aff', padding: 0, fontFamily: 'inherit' }}>Batal</button>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{expenseForm.id ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}</p>
              <button onClick={saveExpense} disabled={expenseSaving} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: expenseSaving ? '#c7c7cc' : '#007aff', padding: 0, fontFamily: 'inherit' }}>
                {expenseSaving ? '...' : 'Simpan'}
              </button>
            </div>
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>TANGGAL</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>KATEGORI</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {expenseForm.category === 'Operasional Kirim' ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>RESTORAN *</label>
                    <input value={expenseForm.restoran} onChange={e => setExpenseForm(f => ({ ...f, restoran: e.target.value }))} placeholder="cth: Akasta" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>KARYAWAN (yg antar)</label>
                    <input value={expenseForm.karyawan} onChange={e => setExpenseForm(f => ({ ...f, karyawan: e.target.value }))} placeholder="opsional — nama karyawan" style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>ADM / UANG JALAN (Rp)</label>
                      <input type="number" min="0" value={expenseForm.uang_jalan} onChange={e => setExpenseForm(f => ({ ...f, uang_jalan: e.target.value }))} placeholder="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>TIP CHEF/SK (Rp)</label>
                      <input type="number" min="0" value={expenseForm.tip} onChange={e => setExpenseForm(f => ({ ...f, tip: e.target.value }))} placeholder="0" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,59,48,0.08)', borderRadius: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73' }}>Total Pengeluaran</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#ff3b30' }}>{fmtRp((parseFloat(expenseForm.uang_jalan) || 0) + (parseFloat(expenseForm.tip) || 0))}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>NOMINAL (Rp) *</label>
                    <input type="number" min="0" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', display: 'block', marginBottom: 5 }}>KETERANGAN</label>
                    <input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="opsional — cth: bensin, bayar listrik" style={inputStyle} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Hapus Pengeluaran ── */}
      {deleteExpConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 280, textAlign: 'center', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', ...FF }}>
            <div style={{ padding: '24px 20px 16px' }}>
              <p style={{ fontSize: 17, fontWeight: 600, color: '#1c1c1e', margin: '0 0 6px' }}>Hapus Pengeluaran?</p>
              <p style={{ fontSize: 13.5, color: '#8e8e93', margin: 0 }}>Data ini akan dihapus permanen.</p>
            </div>
            <div style={{ borderTop: '0.5px solid #f0f0f0' }}>
              <button onClick={() => doDeleteExpense(deleteExpConfirm)} style={{ display: 'block', width: '100%', padding: '13px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#ff3b30', borderBottom: '0.5px solid #f0f0f0', fontFamily: 'inherit' }}>Hapus</button>
              <button onClick={() => setDeleteExpConfirm(null)} style={{ display: 'block', width: '100%', padding: '13px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#007aff', fontFamily: 'inherit' }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
