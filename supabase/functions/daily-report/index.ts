// Supabase Edge Function — daily WhatsApp report
// Dipanggil otomatis oleh pg_cron setiap hari pukul 18:00 WIB (11:00 UTC)
//
// Setup:
// 1. supabase functions deploy daily-report
// 2. Set secrets: supabase secrets set FONNTE_TOKEN=xxx WA_TARGET=628xxx
// 3. Jalankan SQL di bawah di Supabase SQL Editor

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const fonnteToken  = Deno.env.get('FONNTE_TOKEN')!
    const waTarget     = Deno.env.get('WA_TARGET')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    const today    = new Date().toISOString().slice(0, 10)

    // Fetch data from Supabase tables
    const [ordersRes, productsRes, attendanceRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)'),
      supabase.from('products').select('*'),
      supabase.from('attendance').select('*').eq('date', today),
    ])

    const orders     = ordersRes.data || []
    const products   = productsRes.data || []
    const attendance = attendanceRes.data || []

    const selesaiToday = orders.filter(o => o.status === 'selesai' && o.date === today)
    const pending      = orders.filter(o => o.status === 'pending')
    const lowStock     = products.filter(p => p.stock <= p.min_stock)
    const hadir        = attendance.filter(a => a.status === 'hadir')
    const absen        = attendance.filter(a => a.status === 'absen')

    const totalRevenue = selesaiToday.reduce((acc, o) => {
      const items = o.order_items || []
      return acc + items.reduce((a, i) => a + (i.qty * i.price), 0)
    }, 0)

    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const message = `*📊 Laporan Harian UD. Nelayan Widya Jaya*
📅 ${dateStr}

*💰 Penjualan Hari Ini*
• Order selesai : ${selesaiToday.length}
• Total omzet   : ${rp(totalRevenue)}

*📋 Status Order*
• Pending : ${pending.length}
• Selesai : ${selesaiToday.length}

${lowStock.length > 0
  ? `*⚠️ Stok Rendah — Perlu Restok*\n${lowStock.map(p => `• ${p.name}: ${p.stock} ${p.unit}`).join('\n')}`
  : `*✅ Stok Produk*\nSemua stok dalam kondisi aman`
}

*👥 Absensi Hari Ini*
• Hadir : ${hadir.length} orang
• Absen : ${absen.length} orang

_Laporan otomatis pukul 18.00 WIB_
_Shrimp Supplier Management System_`

    // Send via Fonnte
    const waRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: waTarget, message }),
    })

    const waData = await waRes.json()
    return new Response(JSON.stringify({ success: true, wa: waData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/*
── SQL untuk pg_cron (jalankan di Supabase SQL Editor) ──

-- Aktifkan extension pg_cron
create extension if not exists pg_cron;

-- Jadwal: setiap hari pukul 11:00 UTC = 18:00 WIB
select cron.schedule(
  'daily-wa-report',
  '0 11 * * *',
  $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Cek jadwal aktif
select * from cron.job;

-- Hapus jadwal (jika perlu)
select cron.unschedule('daily-wa-report');
*/
