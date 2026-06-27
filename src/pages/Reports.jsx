import { useState } from 'react'
import { TrendingUp, Download, Calendar, BarChart3 } from 'lucide-react'

const MONTHLY_DATA = [
  { month: 'Jan', revenue: 32000000, orders: 89 },
  { month: 'Feb', revenue: 28500000, orders: 76 },
  { month: 'Mar', revenue: 41000000, orders: 112 },
  { month: 'Apr', revenue: 38200000, orders: 103 },
  { month: 'Mei', revenue: 44500000, orders: 120 },
  { month: 'Jun', revenue: 45200000, orders: 128 },
]

const TOP_PRODUCTS = [
  { name: 'Tongkol', sold: 1200, revenue: 54000000 },
  { name: 'Kakap Merah', sold: 480, revenue: 43200000 },
  { name: 'Udang Vaname', sold: 320, revenue: 38400000 },
  { name: 'Lele', sold: 2100, revenue: 52500000 },
  { name: 'Cumi-cumi', sold: 250, revenue: 30000000 },
]

function formatRupiah(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function BarChart({ data }) {
  const maxRev = Math.max(...data.map(d => d.revenue))
  return (
    <div className="flex items-end gap-3 h-48 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <p className="text-xs text-slate-500">{formatRupiah(d.revenue)}</p>
          <div
            className="w-full bg-gradient-to-t from-cyan-600 to-sky-400 rounded-t-lg transition-all hover:from-cyan-500 hover:to-sky-300 cursor-pointer"
            style={{ height: `${(d.revenue / maxRev) * 160}px` }}
            title={`${d.month}: ${formatRupiah(d.revenue)}`}
          />
          <p className="text-xs font-medium text-slate-600">{d.month}</p>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [period, setPeriod] = useState('6bulan')
  const totalRevenue = MONTHLY_DATA.reduce((a, d) => a + d.revenue, 0)
  const totalOrders = MONTHLY_DATA.reduce((a, d) => a + d.orders, 0)
  const avgOrder = Math.round(totalRevenue / totalOrders)
  const maxRevMonth = MONTHLY_DATA.reduce((a, b) => a.revenue > b.revenue ? a : b)

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['bulan ini', '3bulan', '6bulan', 'tahun ini'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition border
                ${period === p ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}
            >
              {p === 'bulan ini' ? 'Bulan Ini' : p === '3bulan' ? '3 Bulan' : p === '6bulan' ? '6 Bulan' : 'Tahun Ini'}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Omzet', value: formatRupiah(totalRevenue), icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Total Order', value: totalOrders, icon: BarChart3, color: 'bg-blue-500' },
          { label: 'Rata-rata/Order', value: formatRupiah(avgOrder), icon: TrendingUp, color: 'bg-cyan-500' },
          { label: 'Bulan Terbaik', value: maxRevMonth.month, icon: Calendar, color: 'bg-violet-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className={`${color} p-3 rounded-xl shrink-0`}><Icon size={20} className="text-white" /></div>
            <div><p className="text-slate-500 text-xs">{label}</p><p className="font-bold text-slate-800 text-lg">{value}</p></div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-6">Grafik Omzet Bulanan</h3>
        <BarChart data={MONTHLY_DATA} />
      </div>

      {/* Top products */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Produk Terlaris</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="px-6 py-3 text-left font-medium">#</th>
                <th className="px-6 py-3 text-left font-medium">Produk</th>
                <th className="px-6 py-3 text-right font-medium">Terjual (kg)</th>
                <th className="px-6 py-3 text-right font-medium">Omzet</th>
                <th className="px-6 py-3 text-left font-medium">Proporsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TOP_PRODUCTS.sort((a, b) => b.revenue - a.revenue).map((p, i) => {
                const pct = Math.round((p.revenue / totalRevenue) * 100)
                return (
                  <tr key={p.name} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3.5 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">{p.name}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{p.sold.toLocaleString('id')} kg</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-800">{formatRupiah(p.revenue)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
