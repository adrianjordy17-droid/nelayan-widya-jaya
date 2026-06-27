import { useEffect, useState } from 'react'
import { ShoppingCart, Package, TrendingUp, Users, Fish, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const DEMO_STATS = {
  totalOrders: 128,
  pendingOrders: 7,
  totalStock: 2340,
  lowStock: 3,
  monthRevenue: 45200000,
  totalClients: 34,
  recentOrders: [
    { id: 'ORD-001', client: 'Pasar Ikan Muara Baru', items: 'Tongkol 50kg', total: 2500000, status: 'selesai', date: '2026-06-26' },
    { id: 'ORD-002', client: 'Resto Bahari', items: 'Kakap 20kg', total: 1800000, status: 'proses', date: '2026-06-27' },
    { id: 'ORD-003', client: 'Swalayan Maju', items: 'Udang 10kg', total: 1200000, status: 'pending', date: '2026-06-27' },
    { id: 'ORD-004', client: 'Bu Sari', items: 'Cumi 5kg', total: 600000, status: 'selesai', date: '2026-06-25' },
  ]
}

const STATUS_STYLE = {
  selesai: 'bg-green-100 text-green-700',
  proses: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  batal: 'bg-red-100 text-red-700',
}

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`${color} rounded-xl p-3 shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function DashboardHome() {
  const { profile, demoMode } = useAuth()
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-sky-700 to-cyan-600 rounded-2xl p-6 text-white shadow">
        <p className="text-cyan-200 text-sm mb-1">{today}</p>
        <h2 className="text-2xl font-bold">Selamat datang, {profile?.name}! 👋</h2>
        <p className="text-cyan-100 text-sm mt-1">Berikut ringkasan operasional hari ini.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Order" value={DEMO_STATS.totalOrders} sub={`${DEMO_STATS.pendingOrders} pending`} color="bg-blue-500" trend={12} />
        <StatCard icon={Package} label="Stok Ikan (kg)" value={DEMO_STATS.totalStock.toLocaleString('id')} sub={`${DEMO_STATS.lowStock} item stok rendah`} color="bg-cyan-500" trend={-3} />
        <StatCard icon={TrendingUp} label="Omzet Bulan Ini" value={formatRupiah(DEMO_STATS.monthRevenue)} sub="Juni 2026" color="bg-emerald-500" trend={8} />
        <StatCard icon={Users} label="Total Klien" value={DEMO_STATS.totalClients} sub="Aktif bulan ini" color="bg-violet-500" trend={5} />
      </div>

      {/* Low stock warning */}
      {DEMO_STATS.lowStock > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-amber-800">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm"><strong>Peringatan:</strong> {DEMO_STATS.lowStock} item stok hampir habis. <span className="underline cursor-pointer">Cek stok sekarang.</span></p>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Order Terbaru</h3>
          <a href="/dashboard/orders" className="text-cyan-600 text-sm hover:underline">Lihat semua</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-6 py-3 text-left font-medium">ID Order</th>
                <th className="px-6 py-3 text-left font-medium">Klien</th>
                <th className="px-6 py-3 text-left font-medium">Item</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_STATS.recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3.5 font-mono text-slate-700">{order.id}</td>
                  <td className="px-6 py-3.5 text-slate-700">{order.client}</td>
                  <td className="px-6 py-3.5 text-slate-500">{order.items}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-800">{formatRupiah(order.total)}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
