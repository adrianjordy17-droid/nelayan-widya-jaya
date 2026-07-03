import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, Printer, X, Check, Trash2, FileText,
  ClipboardList, Truck, PackageCheck, Receipt, ChevronDown,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }

const DOC_CFG = {
  SO:      { label: 'Sales Order',    prefix: 'SO',  color: '#007aff', bg: '#eff6ff', Icon: ClipboardList },
  DO:      { label: 'Delivery Order', prefix: 'DO',  color: '#ff9500', bg: '#fff8e1', Icon: Truck },
  GR:      { label: 'Goods Receipt',  prefix: 'GR',  color: '#34c759', bg: '#f0fdf4', Icon: PackageCheck },
  Invoice: { label: 'Invoice',        prefix: 'INV', color: '#af52de', bg: '#faf5ff', Icon: Receipt },
}

const STATUS_CFG = {
  draft:      { label: 'Draft',         color: '#8e8e93', bg: '#f2f2f7' },
  pending:    { label: 'Menunggu',      color: '#5856d6', bg: '#f0f0ff' },
  confirmed:  { label: 'Dikonfirmasi',  color: '#007aff', bg: '#eff6ff' },
  dispatched: { label: 'Dikirim',       color: '#ff9500', bg: '#fff8e1' },
  delivered:  { label: 'Terkirim',      color: '#34c759', bg: '#f0fdf4' },
  received:   { label: 'Diterima',      color: '#34c759', bg: '#f0fdf4' },
  sent:       { label: 'Terkirim',      color: '#ff9500', bg: '#fff8e1' },
  paid:       { label: 'Dibayar',       color: '#34c759', bg: '#f0fdf4' },
  overdue:    { label: 'Jatuh Tempo',   color: '#ff3b30', bg: '#fff0f0' },
  cancelled:  { label: 'Batal',         color: '#ff3b30', bg: '#fff0f0' },
}

const UNITS = ['kg', 'ekor', 'ikat', 'box', 'pcs', 'liter', 'ton']
const CONDITIONS = ['Baik', 'Cukup', 'Kurang']

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function currentYM() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` }
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

// ── Helpers ──
function fmtRp(n) { return n != null ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '–' }
function fmtDate(s) {
  if (!s) return '–'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function todayStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` }
function newId()    { return crypto.randomUUID() }
function blankItem(withPrice) {
  return { id: newId(), name: '', qty: '', unit: 'kg', price: withPrice ? '' : null, receivedQty: '', condition: 'Baik', total: 0 }
}
function recalcItem(it) {
  if (it.price != null && it.qty !== '') return { ...it, total: Math.round((+it.qty || 0) * (+it.price || 0)) }
  return it
}
function recalcForm(f) {
  const sub = f.items.reduce((s, it) => s + (+it.total || 0), 0)
  const tax = Math.round(sub * (+f.taxPct || 0) / 100)
  return { ...f, subtotal: sub, total: sub + tax - (+f.discount || 0) }
}
function emptyForm(type) {
  const withPrice = type === 'SO' || type === 'Invoice'
  return {
    type, date: todayStr(), status: 'draft',
    clientName: '', clientAddress: '', clientPhone: '', clientPoNumber: '',
    refNumber: '', driverName: '', vehicle: '',
    items: [blankItem(withPrice)],
    subtotal: 0, taxPct: 0, discount: 0, total: 0,
    dueDate: '', paymentTerms: 'Net 14 hari',
    bankName: '', accountNumber: '', accountName: '',
    notes: '',
  }
}
function getCompany() {
  const defaults = { name: 'UD. Nelayan Widya Jaya', phone: '+62 812-3456-7890', address: 'Pelabuhan Muara Baru, Jakarta Utara', email: 'info@nelayan-widyajaya.id', npwp: '12.345.678.9-012.000' }
  try { return JSON.parse(localStorage.getItem('nwj_company') || 'null') || defaults } catch { return defaults }
}

// ── Print ──
function printDocument(doc) {
  const co = getCompany()
  const cfg = DOC_CFG[doc.type]
  const ac = cfg.color

  const sig = (l, r) => `
    <div style="display:flex;justify-content:space-between;margin-top:52px;padding-top:0">
      <div style="text-align:center;width:195px">
        <div style="font-size:10pt;color:#6b7280;margin-bottom:64px">${l.title}</div>
        <div style="border-top:1px solid #374151;padding-top:6px;font-size:10pt;font-weight:700">${l.name}</div>
        <div style="font-size:9pt;color:#6b7280">${l.role}</div>
      </div>
      <div style="text-align:center;width:195px">
        <div style="font-size:10pt;color:#6b7280;margin-bottom:64px">${r.title}</div>
        <div style="border-top:1px solid #374151;padding-top:6px;font-size:10pt;font-weight:700">${r.name}</div>
        <div style="font-size:9pt;color:#6b7280">${r.role}</div>
      </div>
    </div>`

  const th = (cols) => `<thead><tr>${cols.map(c =>
    `<th style="background:#f3f4f6;padding:8px 10px;text-align:${c.a||'left'};font-size:10pt;font-weight:600;color:#374151;border-bottom:1.5px solid #d1d5db">${c.l}</th>`
  ).join('')}</tr></thead>`

  const meta = (rows) => rows.filter(Boolean).map(([l,v]) =>
    `<tr><td style="color:#6b7280;font-size:10pt;padding:3px 0;width:130px;vertical-align:top">${l}</td><td style="font-size:10pt;color:#111827;font-weight:500;padding:3px 0">: ${v||'–'}</td></tr>`
  ).join('')

  const clientBox = (label, n, addr, phone) => `
    <div style="margin-bottom:20px;padding:14px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid ${ac}">
      <div style="font-size:9.5pt;font-weight:600;color:#6b7280;margin-bottom:5px;text-transform:uppercase;letter-spacing:.04em">${label}</div>
      <div style="font-size:12pt;font-weight:700;color:#111827">${n}</div>
      ${addr ? `<div style="font-size:10pt;color:#6b7280;margin-top:3px">${addr}</div>` : ''}
      ${phone ? `<div style="font-size:10pt;color:#6b7280">Telp: ${phone}</div>` : ''}
    </div>`

  const notes = doc.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px">
      <div style="font-size:9pt;font-weight:700;color:#92400e;margin-bottom:4px;text-transform:uppercase">Catatan</div>
      <div style="font-size:10pt;color:#374151">${doc.notes}</div>
    </div>` : ''

  let body = ''

  if (doc.type === 'SO') {
    const tax = Math.round((doc.subtotal || 0) * (doc.taxPct || 0) / 100)
    const rows = doc.items.map((it, i) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.unit}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right">Rp ${(+it.price||0).toLocaleString('id-ID')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">Rp ${(+it.total||0).toLocaleString('id-ID')}</td>
    </tr>`).join('')
    body = `
      <table style="margin-bottom:20px"><tbody>${meta([
        ['Tanggal', fmtDate(doc.date)],
        doc.paymentTerms ? ['Termin Pembayaran', doc.paymentTerms] : null,
        ['Status', (STATUS_CFG[doc.status]||{}).label || doc.status],
      ])}</tbody></table>
      ${clientBox('Kepada Yth.', doc.clientName, doc.clientAddress, doc.clientPhone)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${th([{l:'No',a:'center'},{l:'Produk/Jasa'},{l:'Qty',a:'right'},{l:'Satuan'},{l:'Harga Satuan',a:'right'},{l:'Subtotal',a:'right'}])}
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
        <table style="min-width:260px">
          <tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">Subtotal</td><td style="padding:4px 12px;text-align:right;font-size:10pt">Rp ${(+doc.subtotal||0).toLocaleString('id-ID')}</td></tr>
          ${doc.taxPct ? `<tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">PPN ${doc.taxPct}%</td><td style="padding:4px 12px;text-align:right;font-size:10pt">Rp ${tax.toLocaleString('id-ID')}</td></tr>` : ''}
          ${doc.discount ? `<tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">Diskon</td><td style="padding:4px 12px;text-align:right;font-size:10pt;color:#ef4444">− Rp ${(+doc.discount).toLocaleString('id-ID')}</td></tr>` : ''}
          <tr style="background:${ac}18"><td style="padding:9px 12px;font-weight:700;font-size:11pt;color:${ac};border-top:1.5px solid ${ac}40">TOTAL</td><td style="padding:9px 12px;text-align:right;font-weight:800;font-size:12pt;color:${ac};border-top:1.5px solid ${ac}40">Rp ${(+doc.total||0).toLocaleString('id-ID')}</td></tr>
        </table>
      </div>
      ${notes}
      ${sig({title:'Hormat kami,',name:doc.createdByName||'',role:'UD. Nelayan Widya Jaya'},{title:'Menyetujui,',name:'(________________________)',role:doc.clientName})}`
  }

  if (doc.type === 'DO') {
    const rows = doc.items.map((it, i) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.unit}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:14pt">☐</td>
    </tr>`).join('')
    body = `
      <table style="margin-bottom:20px"><tbody>${meta([
        ['Tanggal', fmtDate(doc.date)],
        doc.refNumber ? ['No. Sales Order', doc.refNumber] : null,
        doc.driverName ? ['Pengirim / Driver', doc.driverName] : null,
        doc.vehicle ? ['Kendaraan', doc.vehicle] : null,
        ['Status', (STATUS_CFG[doc.status]||{}).label || doc.status],
      ])}</tbody></table>
      ${clientBox('Tujuan Pengiriman', doc.clientName, doc.clientAddress, doc.clientPhone)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${th([{l:'No',a:'center'},{l:'Nama Barang'},{l:'Jumlah',a:'right'},{l:'Satuan'},{l:'✓ Cek',a:'center'}])}
        <tbody>${rows}</tbody>
      </table>
      ${notes}
      ${sig({title:'Pengirim,',name:doc.driverName||doc.createdByName||'',role:'(Nama Jelas & Tanda Tangan)'},{title:'Penerima,',name:'(________________________)',role:doc.clientName})}`
  }

  if (doc.type === 'GR') {
    const rows = doc.items.map((it, i) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:#059669">${it.receivedQty||'–'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.unit}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:${it.condition==='Baik'?'#059669':it.condition==='Cukup'?'#d97706':'#dc2626'};font-weight:600">${it.condition||'–'}</td>
    </tr>`).join('')
    body = `
      <table style="margin-bottom:20px"><tbody>${meta([
        ['Tanggal Terima', fmtDate(doc.date)],
        doc.refNumber ? ['No. Delivery Order', doc.refNumber] : null,
        ['Status', (STATUS_CFG[doc.status]||{}).label || doc.status],
      ])}</tbody></table>
      <div style="display:flex;gap:16px;margin-bottom:20px">
        <div style="flex:1;padding:14px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid ${ac}">
          <div style="font-size:9.5pt;font-weight:600;color:#6b7280;margin-bottom:5px;text-transform:uppercase">Dikirim Oleh</div>
          <div style="font-size:11pt;font-weight:700;color:#111827">${co.name}</div>
          <div style="font-size:10pt;color:#6b7280">${co.address}</div>
        </div>
        <div style="flex:1;padding:14px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid #6b7280">
          <div style="font-size:9.5pt;font-weight:600;color:#6b7280;margin-bottom:5px;text-transform:uppercase">Diterima Oleh</div>
          <div style="font-size:11pt;font-weight:700;color:#111827">${doc.clientName}</div>
          ${doc.clientAddress ? `<div style="font-size:10pt;color:#6b7280">${doc.clientAddress}</div>` : ''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${th([{l:'No',a:'center'},{l:'Nama Barang'},{l:'Jml Kirim',a:'right'},{l:'Jml Diterima',a:'right'},{l:'Satuan'},{l:'Kondisi'}])}
        <tbody>${rows}</tbody>
      </table>
      ${notes}
      ${sig({title:'Yang Menyerahkan,',name:doc.createdByName||'',role:'UD. Nelayan Widya Jaya'},{title:'Yang Menerima,',name:'(________________________)',role:doc.clientName})}`
  }

  if (doc.type === 'Invoice') {
    const tax = Math.round((doc.subtotal || 0) * (doc.taxPct || 0) / 100)
    const rows = doc.items.map((it, i) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right">${it.qty}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6">${it.unit}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right">Rp ${(+it.price||0).toLocaleString('id-ID')}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">Rp ${(+it.total||0).toLocaleString('id-ID')}</td>
    </tr>`).join('')
    const bankBlock = doc.bankName ? `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-size:9.5pt;font-weight:700;color:#1d4ed8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Informasi Pembayaran</div>
        <table><tbody>
          <tr><td style="color:#6b7280;font-size:10pt;padding:2px 24px 2px 0">Bank</td><td style="font-weight:600;font-size:10pt">${doc.bankName}</td></tr>
          <tr><td style="color:#6b7280;font-size:10pt;padding:2px 24px 2px 0">No. Rekening</td><td style="font-weight:800;font-size:12pt;color:#1d4ed8">${doc.accountNumber}</td></tr>
          <tr><td style="color:#6b7280;font-size:10pt;padding:2px 24px 2px 0">Atas Nama</td><td style="font-weight:600;font-size:10pt">${doc.accountName}</td></tr>
        </tbody></table>
      </div>` : ''
    body = `
      <table style="margin-bottom:20px"><tbody>${meta([
        ['Tgl. Invoice', fmtDate(doc.date)],
        doc.dueDate ? ['Jatuh Tempo', fmtDate(doc.dueDate)] : null,
        doc
