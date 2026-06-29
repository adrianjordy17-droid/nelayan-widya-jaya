import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  TrendingUp, ShoppingCart, UserCheck, AlertTriangle, ArrowRight,
  Truck, CheckCircle2, ClipboardList, Package, Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const INIT_ORDERS  = []
const INIT_STOCK   = []
const INIT_ATTEND  = []

// Status badge config for documents table
const DOC_STATUS_CFG = {
  draft:      { label: 'Draft',       color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  confirmed:  { label: 'Dikonfirmasi',color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  dispatched: { label: 'Dikirim',     color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  delivered:  { label: 'Terkirim',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  received:   { label: 'Diterima',    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  sent:       { label: 'Terkirim',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  paid:       { label: 'Lunas',       color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
}

function rpFmt(n) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.0', '')} jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)} rb`
  return `Rp ${n.toLocaleString('id-ID')}`
}
function totalOf(items) { return (items || []).reduce((a, i) => a + i.qty * i.price, 0) }

// ── Staff Dashboard ──────────────────────────────────────────────────────────
function StaffDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })

  const [pendingDOs, setPendingDOs]     = useState([])
  const [deliveredCount, setDelivered]  = useState(0)
  const [tasks, setTasks]               = useState([])

  useEffect(() => {
    supabase.from('documents')
      .select('id,number,client_name,items,status,driver_name')
      .eq('type', 'DO')
      .ilike('driver_name', profile?.name || 'NOMATCH')
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
      .ilike('assigned_to_name', profile?.name || 'NOMATCH')
      .then(({ data }) => { if (data) setTasks(data) })
  }, [profile?.name])

  const totalDOs = pendingDOs.length + deliveredCount
  const allDone  = totalDOs > 0 && deliveredCount === totalDOs

  const SectionHeader = ({ title, icon, iconColor, iconBg }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '15px 18px 13px',
      borderBottom: '1px solid #f8fafc',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Greeting */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
          Selamat datang, {profile?.name}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' }}>
          {todayLabel}
        </p>
      </div>

      {/* Pengiriman Selesai stat bar */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '18px 22px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: allDone ? '#f0fdf4' : '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={22} color={allDone ? '#16a34a' : '#2563eb'} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 3px' }}>Pengiriman Selesai</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {deliveredCount}
            <span style={{ fontSize: 15, fontWeight: 500, color: '#94a3b8' }}>/{totalDOs}</span>
          </p>
          <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', maxWidth: 220 }}>
            <div style={{
              width: totalDOs > 0 ? `${Math.round(deliveredCount / totalDOs * 100)}%` : '0%',
              height: '100%', borderRadius: 99,
              background: allDone ? '#16a34a' : '#2563eb',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
          {totalDOs === 0 ? 'Tidak ada tugas' : allDone ? 'Semua selesai!' : `${totalDOs - deliveredCount} tersisa`}
        </p>
      </div>

      {/* Two-column: Tugas + Order */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Tugas Hari Ini */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <SectionHeader
            title="Tugas Hari Ini"
            icon={<ClipboardList size={15} color="#7c3aed" />}
            iconBg="#f5f3ff"
          />
          {tasks.length === 0 ? (
            <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Tidak ada tugas hari ini.
            </p>
          ) : tasks.map((task, idx) => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '12px 18px',
              borderBottom: idx < tasks.length - 1 ? '1px solid #f8fafc' : 'none',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: '2px solid ' + (task.done ? '#16a34a' : '#cbd5e1'),
                background: task.done ? '#16a34a' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {task.done && <Check size={10} color="white" strokeWidth={3} />}
              </div>
              <p style={{
                fontSize: 13, color: task.done ? '#94a3b8' : '#1e293b',
                margin: 0, textDecoration: task.done ? 'line-through' : 'none',
              }}>
                {task.title}
              </p>
            </div>
          ))}
        </div>

        {/* Order Hari Ini */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <SectionHeader
            title={`Order Dikirim (${pendingDOs.length})`}
            icon={<Truck size={15} color="#d97706" />}
            iconBg="#fffbeb"
          />
          {pendingDOs.length === 0 ? (
            <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Tidak ada order yang harus dikirim.
            </p>
          ) : pendingDOs.map((d, idx) => (
            <div
              key={d.id}
              onClick={() => navigate('/dashboard/documents')}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '12px 18px',
                borderBottom: idx < pendingDOs.length - 1 ? '1px solid #f8fafc' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: '#fff8e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Package size={15} color="#d97706" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {d.clientName}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.number} · {d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                </p>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 600,
                padding: '3px 10px', borderRadius: 99,
                color: '#d97706', background: '#fffbeb',
                border: '1px solid #fde68a',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Dikirim
              </span>
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
  const today     = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const todayKey  = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const [stock]      = useLocalStorage('nwj_stock',      INIT_STOCK)
  const [attendance] = useLocalStorage('nwj_attendance', INIT_ATTEND)

  const [recentDocs, setRecentDocs]         = useState([])
  const [penjualanBulanIni, setPenjualan]   = useState(0)
  const [orderPending, setOrderPending]     = useState(0)

  useEffect(() => {
    supabase.from('documents')
      .select('id, number, type, status, client_name, created_at, total, date')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return
        setRecentDocs(data.slice(0, 5))
        setOrderPending(data.filter(d => d.type === 'SO' && d.status === 'draft').length)
        const invoiceTotal = data
          .filter(d => d.type === 'Invoice' && (d.created_at || '').startsWith(thisMonth))
          .reduce((sum, d) => sum + (d.total || 0), 0)
        setPenjualan(invoiceTotal)
      })
  }, [])

  const hadirCount    = attendance.filter(a => a.date === todayKey && a.status === 'hadir').length
  const totalExpected = [...new Set(attendance.filter(a => a.date === todayKey).map(a => a.name))].length || 0
  const stokTipis     = stock.filter(s => s.qty <= s.minQty).length

  const STATS = [
    {
      label: 'Penjualan Bulan Ini',
      value: rpFmt(penjualanBulanIni),
      sub:   'dari invoice bulan ini',
      Icon:  TrendingUp,
      iconColor: '#2563eb',
      iconBg:    '#eff6ff',
      bar:       '#2563eb',
    },
    {
      label: 'SO Pending',
      value: String(orderPending),
      sub:   'sales order draft',
      Icon:  ShoppingCart,
      iconColor: '#d97706',
      iconBg:    '#fffbeb',
      bar:       '#d97706',
    },
    {
      label: 'Hadir Hari Ini',
      value: `${hadirCount}/${totalExpected}`,
      sub:   'karyawan hadir',
      Icon:  UserCheck,
      iconColor: '#16a34a',
      iconBg:    '#f0fdf4',
      bar:       '#16a34a',
    },
    {
      label: 'Stok Tipis',
      value: String(stokTipis),
      sub:   stokTipis > 0 ? 'perlu restok segera' : 'semua stok aman',
      Icon:  AlertTriangle,
      iconColor: stokTipis > 0 ? '#dc2626' : '#64748b',
      iconBg:    stokTipis > 0 ? '#fef2f2' : '#f8fafc',
      bar:       stokTipis > 0 ? '#dc2626' : '#94a3b8',
    },
  ]

  const udangItems = stock.filter(s => s.category === 'Udang')
  const stokDisplay = (udangItems.length > 0 ? udangItems : stock)
    .slice(0, 4)
    .map(s => ({ name: s.name, qty: s.qty, max: Math.max(s.qty, s.minQty * 3, 50) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Greeting */}
      <div>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: '#0f172a',
          margin: 0, letterSpacing: '-0.015em',
        }}>
          Selamat datang, {profile?.name}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 12.5, marginTop: 4, textTransform: 'capitalize' }}>
          {today}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
      }}>
        {STATS.map(({ label, value, sub, Icon, iconColor, iconBg, bar }) => (
          <div key={label} style={{
            background: 'white',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: '#64748b', margin: 0, lineHeight: 1.3, maxWidth: 100 }}>
                {label}
              </p>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color={iconColor} strokeWidth={2} />
              </div>
            </div>

            <p style={{
              fontSize: value.length > 10 ? 18 : 26,
              fontWeight: 800, color: '#0f172a',
              margin: '0 0 4px', lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px' }}>
              {sub}
            </p>

            <div style={{ height: 3, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
              <div style={{ width: '45%', height: '100%', borderRadius: 99, background: bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Order Terbaru */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 13px',
            borderBottom: '1px solid #f8fafc',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Dokumen Terbaru
            </p>
            <Link to="/dashboard/documents" style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, color: '#2563eb', fontWeight: 500,
              textDecoration: 'none',
            }}>
              Lihat semua <ArrowRight size={11} />
            </Link>
          </div>

          <div>
            {recentDocs.length === 0 ? (
              <p style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Belum ada dokumen.
              </p>
            ) : recentDocs.map((doc, idx) => {
              const s = DOC_STATUS_CFG[doc.status] || DOC_STATUS_CFG.draft
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '11px 20px',
                  borderBottom: idx < recentDocs.length - 1 ? '1px solid #f8fafc' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                        padding: '1px 6px', borderRadius: 4,
                        background: doc.type === 'SO' ? '#eff6ff' : doc.type === 'DO' ? '#fff8e1' : doc.type === 'GR' ? '#ecfeff' : '#f5f3ff',
                        color:      doc.type === 'SO' ? '#2563eb' : doc.type === 'DO' ? '#d97706' : doc.type === 'GR' ? '#0891b2' : '#7c3aed',
                      }}>{doc.type}</span>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.number}
                      </p>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                      {doc.client_name}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 99,
                    color: s.color, background: s.bg,
                    border: `1px solid ${s.border}`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stok Udang */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid #f1f5f9',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 13px',
            borderBottom: '1px solid #f8fafc',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Stok Udang
            </p>
            <Link to="/dashboard/stock" style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, color: '#2563eb', fontWeight: 500,
              textDecoration: 'none',
            }}>
              Lihat stok <ArrowRight size={11} />
            </Link>
          </div>

          <div style={{ padding: '16px 20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stokDisplay.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: '12px 0' }}>
                Belum ada data stok.
              </p>
            ) : stokDisplay.map(item => {
              const pct = Math.min(Math.round((item.qty / item.max) * 100), 100)
              const barColor = pct < 30 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#2563eb'
              return (
                <div key={item.name}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: barColor, flexShrink: 0,
                      }} />
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#334155', margin: 0 }}>
                        {item.name}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {item.qty} <span style={{ fontWeight: 400, color: '#94a3b8' }}>kg</span>
                    </p>
                  </div>
                  <div style={{
                    height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 99,
                      background: barColor,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Root export ──────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const { isRole } = useAuth()
  return isRole('staff') ? <StaffDashboard /> : <OwnerAdminDashboard />
}
