export function generateDailyReport(orders, stock, attendance) {
  const today = new Date().toISOString().slice(0, 10)
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const totalOf = items => (items || []).reduce((a, i) => a + (i.qty * i.price), 0)

  const selesai  = orders.filter(o => o.status === 'selesai' && o.date === today)
  const pending  = orders.filter(o => o.status === 'pending')
  const proses   = orders.filter(o => o.status === 'proses')
  const lowStock = stock.filter(s => s.qty <= s.minQty)
  const hadir    = attendance.filter(a => a.date === today && a.status === 'hadir')
  const telat    = attendance.filter(a => a.date === today && a.status === 'telat')
  const absen    = attendance.filter(a => a.date === today && a.status === 'absen')

  const revenue = selesai.reduce((a, o) => a + totalOf(o.items), 0)
  const rp = n => `Rp ${n.toLocaleString('id')}`

  return `*📊 Laporan Harian UD. Nelayan Widya Jaya*
📅 ${dateStr}

*💰 Penjualan Hari Ini*
• Order selesai : ${selesai.length}
• Total omzet   : ${rp(revenue)}

*📋 Status Order*
• Pending : ${pending.length}
• Proses  : ${proses.length}
• Selesai : ${selesai.length}

${lowStock.length > 0
  ? `*⚠️ Stok Rendah — Perlu Restok*\n${lowStock.map(s => `• ${s.name}: ${s.qty} ${s.unit} (min. ${s.minQty})`).join('\n')}`
  : `*✅ Stok Produk*\nSemua stok dalam kondisi aman`
}

*👥 Absensi Hari Ini*
• Hadir : ${hadir.length} orang
• Telat : ${telat.length} orang
• Absen : ${absen.length} orang

_Laporan otomatis pukul 18.00 WIB_
_Shrimp Supplier Management System_`
}

export async function sendToWhatsApp({ token, target, message }) {
  if (!token || !target) throw new Error('Token dan nomor WA wajib diisi di Pengaturan')
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: target.replace(/\D/g, ''), message }),
  })
  if (!res.ok) throw new Error(`Gagal: HTTP ${res.status}`)
  return res.json()
}
