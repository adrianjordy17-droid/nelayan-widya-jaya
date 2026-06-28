import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, Printer, X, Check, Trash2, FileText,
  ClipboardList, Truck, PackageCheck, Receipt, ChevronDown,
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

const DEMO_DOCS = [
  {
    id: 'demo-so-1', type: 'SO', number: 'SO-202606-001', date: '2026-06-28', status: 'confirmed',
    clientName: 'Resto Laut Biru', clientAddress: 'Jl. Pantai No.1, Jakarta Utara', clientPhone: '0812-3456-7890',
    refNumber: '', driverName: '', vehicle: '',
    items: [
      { id: '1', name: 'Udang Vaname', qty: 20, unit: 'kg', price: 85000, receivedQty: '', condition: 'Baik', total: 1700000 },
      { id: '2', name: 'Udang Windu',  qty: 10, unit: 'kg', price: 120000, receivedQty: '', condition: 'Baik', total: 1200000 },
    ],
    subtotal: 2900000, taxPct: 11, discount: 0, total: 3219000,
    dueDate: '', paymentTerms: 'Net 14 hari', bankName: '', accountNumber: '', accountName: '',
    notes: 'Tolong kirim sebelum pukul 10 pagi.', createdByName: 'April', createdAt: '2026-06-28T08:00:00Z',
  },
  {
    id: 'demo-do-1', type: 'DO', number: 'DO-202606-001', date: '2026-06-28', status: 'dispatched',
    clientName: 'Resto Laut Biru', clientAddress: 'Jl. Pantai No.1, Jakarta Utara', clientPhone: '0812-3456-7890',
    refNumber: 'SO-202606-001', driverName: 'Bimbim', vehicle: 'B 1234 ABC',
    items: [
      { id: '1', name: 'Udang Vaname', qty: 20, unit: 'kg', price: null, receivedQty: '', condition: 'Baik', total: null },
      { id: '2', name: 'Udang Windu',  qty: 10, unit: 'kg', price: null, receivedQty: '', condition: 'Baik', total: null },
    ],
    subtotal: null, taxPct: null, discount: null, total: null,
    dueDate: '', paymentTerms: '', bankName: '', accountNumber: '', accountName: '',
    notes: '', createdByName: 'April', createdAt: '2026-06-28T08:30:00Z',
  },
]

// ── Helpers ──
function fmtRp(n) { return n != null ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '–' }
function fmtDate(s) {
  if (!s) return '–'
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function todayStr() { return new Date().toISOString().slice(0, 10) }
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
        doc.refNumber ? ['Ref. Sales Order', doc.refNumber] : null,
        doc.paymentTerms ? ['Termin Pembayaran', doc.paymentTerms] : null,
        ['Status', (STATUS_CFG[doc.status]||{}).label || doc.status],
      ])}</tbody></table>
      ${clientBox('Ditagihkan Kepada', doc.clientName, doc.clientAddress, doc.clientPhone)}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        ${th([{l:'No',a:'center'},{l:'Deskripsi'},{l:'Qty',a:'right'},{l:'Satuan'},{l:'Harga Satuan',a:'right'},{l:'Total',a:'right'}])}
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
        <table style="min-width:270px">
          <tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">Subtotal</td><td style="padding:4px 12px;text-align:right;font-size:10pt">Rp ${(+doc.subtotal||0).toLocaleString('id-ID')}</td></tr>
          ${doc.taxPct ? `<tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">PPN ${doc.taxPct}%</td><td style="padding:4px 12px;text-align:right;font-size:10pt">Rp ${tax.toLocaleString('id-ID')}</td></tr>` : ''}
          ${doc.discount ? `<tr><td style="padding:4px 12px;color:#6b7280;font-size:10pt">Diskon</td><td style="padding:4px 12px;text-align:right;font-size:10pt;color:#ef4444">− Rp ${(+doc.discount).toLocaleString('id-ID')}</td></tr>` : ''}
          <tr style="background:${ac}18"><td style="padding:10px 12px;font-weight:700;font-size:12pt;color:${ac};border-top:2px solid ${ac}">TOTAL TAGIHAN</td><td style="padding:10px 12px;text-align:right;font-weight:800;font-size:13pt;color:${ac};border-top:2px solid ${ac}">Rp ${(+doc.total||0).toLocaleString('id-ID')}</td></tr>
        </table>
      </div>
      ${bankBlock}
      ${notes}
      <div style="margin-top:8px;padding:12px 16px;background:#f9fafb;border-radius:8px;font-size:9.5pt;color:#6b7280">
        Dokumen ini berlaku sebagai tagihan resmi dari <strong>${co.name}</strong>. Harap melakukan pembayaran sebelum tanggal jatuh tempo.
      </div>
      ${sig({title:'Diterbitkan oleh,',name:doc.createdByName||'',role:'UD. Nelayan Widya Jaya'},{title:'Diterima oleh,',name:'(________________________)',role:doc.clientName})}
      <div style="margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:8.5pt">
        ${co.name} | ${co.address} | ${co.phone} | ${co.email||''}
      </div>`
  }

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>${doc.number}</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#1a1a2e;background:#fff}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div style="background:${ac};padding:22px 30px;display:flex;align-items:flex-start;justify-content:space-between">
  <div>
    <div style="font-size:19pt;font-weight:900;color:#fff;letter-spacing:-.02em">${co.name}</div>
    <div style="font-size:9.5pt;color:rgba(255,255,255,.8);margin-top:4px">${co.address}</div>
    <div style="font-size:9.5pt;color:rgba(255,255,255,.8)">${co.phone}${co.email ? ' | ' + co.email : ''}</div>
    ${co.npwp ? `<div style="font-size:9pt;color:rgba(255,255,255,.65);margin-top:2px">NPWP: ${co.npwp}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:22pt;font-weight:900;color:#fff;letter-spacing:.05em">${cfg.label.toUpperCase()}</div>
    <div style="font-size:13pt;color:rgba(255,255,255,.92);margin-top:5px;font-weight:700">${doc.number}</div>
  </div>
</div>
<div style="padding:26px 30px">${body}</div>
</body></html>`

  const win = window.open('', '_blank', 'width=860,height=720')
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

// ── DB mapper ──
function dbToDoc(r) {
  return {
    id: r.id, type: r.type, number: r.number, date: r.date, status: r.status,
    clientName: r.client_name, clientAddress: r.client_address, clientPhone: r.client_phone,
    clientPoNumber: r.client_po_number || '',
    refNumber: r.ref_number || '',
    driverName: r.driver_name || '', vehicle: r.vehicle || '',
    items: r.items || [],
    subtotal: r.subtotal, taxPct: r.tax_pct, discount: r.discount, total: r.total,
    dueDate: r.due_date || '', paymentTerms: r.payment_terms || '',
    bankName: r.bank_name || '', accountNumber: r.account_number || '', accountName: r.account_name || '',
    notes: r.notes || '', createdByName: r.created_by_name || '', createdAt: r.created_at,
  }
}

// ── ItemRow ──
function ItemRow({ item, type, onChange, onDelete, isLast }) {
  const withPrice    = type === 'SO' || type === 'Invoice'
  const withReceived = type === 'GR'
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '9px 0', borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0', flexWrap: 'wrap' }}>
      <input value={item.name} onChange={e => onChange({ ...item, name: e.target.value })}
        placeholder="Nama produk" style={{ flex: 2, minWidth: 120, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 10px', fontSize: 13, ...FF }} />
      <input value={item.qty} type="number" min="0" onChange={e => onChange(recalcItem({ ...item, qty: e.target.value }))}
        placeholder="Qty" style={{ width: 62, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 8px', fontSize: 13, textAlign: 'right', ...FF }} />
      <select value={item.unit} onChange={e => onChange({ ...item, unit: e.target.value })}
        style={{ width: 58, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 6px', fontSize: 12, ...FF }}>
        {UNITS.map(u => <option key={u}>{u}</option>)}
      </select>
      {withPrice && (
        <input value={item.price ?? ''} type="number" min="0" onChange={e => onChange(recalcItem({ ...item, price: e.target.value }))}
          placeholder="Harga/unit" style={{ width: 100, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 8px', fontSize: 13, textAlign: 'right', ...FF }} />
      )}
      {withReceived && <>
        <input value={item.receivedQty} type="number" min="0" onChange={e => onChange({ ...item, receivedQty: e.target.value })}
          placeholder="Terima" style={{ width: 68, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 8px', fontSize: 13, textAlign: 'right', ...FF }} />
        <select value={item.condition} onChange={e => onChange({ ...item, condition: e.target.value })}
          style={{ width: 72, border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 6px', fontSize: 12, ...FF }}>
          {CONDITIONS.map(c => <option key={c}>{c}</option>)}
        </select>
      </>}
      {withPrice && (
        <div style={{ width: 90, textAlign: 'right', fontSize: 12, color: '#3c3c43', paddingRight: 4 }}>
          {item.total ? 'Rp ' + (+item.total).toLocaleString('id-ID') : '–'}
        </div>
      )}
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── FieldRow ──
function FieldRow({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px', borderBottom: last ? 'none' : '0.5px solid #f0f0f0', background: 'white' }}>
      <p style={{ fontSize: 14, color: '#1c1c1e', margin: 0, minWidth: 110, fontWeight: 400, flexShrink: 0 }}>{label}</p>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  )
}
const inputR = { border: 'none', outline: 'none', textAlign: 'right', fontSize: 14, color: '#3c3c43', background: 'transparent', ...FF, width: '100%' }
const selectR = { border: 'none', outline: 'none', textAlign: 'right', fontSize: 14, color: '#3c3c43', background: 'transparent', ...FF }

// ── Section label ──
function SLabel({ text }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 6, marginBottom: 7 }}>{text}</p>
}
function Card({ children }) {
  return <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)', marginBottom: 22 }}>{children}</div>
}

// ── Main ──
export default function Documents() {
  const location = useLocation()
  const { user, profile, demoMode, isRole } = useAuth()
  const canEdit = isRole('admin') || isRole('owner')
  const isStaff = isRole('staff')

  const [docs, setDocs]   = useState([])
  const [clients, setClients] = useState([])
  const [tab, setTab]     = useState(isStaff ? 'DO' : 'all')
  const [menu, setMenu]   = useState(false)
  const [form, setForm]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [detail, setDetail] = useState(null)

  const navigate = useNavigate()
  const createType = form?.type || null

  useEffect(() => {
    if (demoMode) { setDocs(DEMO_DOCS); return }
    supabase.from('documents').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        // Hide confirmed SOs — they've been converted to DOs
        setDocs(data.map(dbToDoc).filter(d => !(d.type === 'SO' && d.status === 'confirmed')))
      })
  }, [demoMode])

  // Auto-open creation if navigated from Orders page
  useEffect(() => {
    if (location.state?.createType) {
      openCreate(location.state.createType)
      window.history.replaceState({}, document.title)
    }
  }, [])

  useEffect(() => {
    if (demoMode) return
    supabase.from('clients').select('id,name,address,phone').eq('active', true)
      .then(({ data }) => data && setClients(data))
  }, [demoMode])

  async function getNextNumber(type) {
    if (demoMode) {
      const prefix = type === 'Invoice' ? 'INV' : type
      const n = docs.filter(d => d.type === type).length + 1
      return `${prefix}-202606-${String(n).padStart(3, '0')}`
    }
    const prefix = type === 'Invoice' ? 'INV' : type
    const ym = new Date().toISOString().slice(0, 7).replace('-', '')
    const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true })
      .eq('type', type).ilike('number', `${prefix}-${ym}-%`)
    return `${prefix}-${ym}-${String((count || 0) + 1).padStart(3, '0')}`
  }

  function openCreate(type) {
    setForm(emptyForm(type))
    setMenu(false)
    setSaved(false)
  }

  function openCreateFrom(type, sourceDoc) {
    const withPrice = type === 'SO' || type === 'Invoice'
    const f = {
      ...emptyForm(type),
      clientName: sourceDoc.clientName,
      clientAddress: sourceDoc.clientAddress || '',
      clientPhone: sourceDoc.clientPhone || '',
      clientPoNumber: sourceDoc.clientPoNumber || '',
      refNumber: sourceDoc.number,
      items: sourceDoc.items.map(it => ({
        ...it, id: newId(),
        price: withPrice ? (it.price ?? '') : null,
        receivedQty: '',
        condition: 'Baik',
        total: withPrice ? (it.total ?? 0) : null,
      })),
    }
    setDetail(null)
    setForm(withPrice ? recalcForm(f) : f)
    setMenu(false)
    setSaved(false)
  }

  function openEdit(doc) {
    const withPrice = doc.type === 'SO' || doc.type === 'Invoice'
    const f = {
      editId: doc.id,
      type: doc.type, date: doc.date, status: doc.status,
      clientName: doc.clientName, clientAddress: doc.clientAddress || '', clientPhone: doc.clientPhone || '', clientPoNumber: doc.clientPoNumber || '',
      refNumber: doc.refNumber || '', driverName: doc.driverName || '', vehicle: doc.vehicle || '',
      items: doc.items.map(it => ({ ...it, id: it.id || newId() })),
      subtotal: doc.subtotal || 0, taxPct: doc.taxPct || 0, discount: doc.discount || 0, total: doc.total || 0,
      dueDate: doc.dueDate || '', paymentTerms: doc.paymentTerms || 'Net 14 hari',
      bankName: doc.bankName || '', accountNumber: doc.accountNumber || '', accountName: doc.accountName || '',
      notes: doc.notes || '',
    }
    setDetail(null)
    setForm(withPrice ? recalcForm(f) : f)
    setMenu(false)
    setSaved(false)
  }

  function setF(patch) {
    setForm(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      return (next.type === 'SO' || next.type === 'Invoice') ? recalcForm(next) : next
    })
  }

  function updateItem(idx, updated) {
    setF(prev => {
      const items = prev.items.map((it, i) => i === idx ? updated : it)
      return { ...prev, items }
    })
  }
  function addItem() {
    setF(prev => ({ ...prev, items: [...prev.items, blankItem(prev.type === 'SO' || prev.type === 'Invoice')] }))
  }
  function deleteItem(idx) {
    setF(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  function fillClient(name) {
    if (!name) { setF({ clientName: '', clientAddress: '', clientPhone: '' }); return }
    const c = clients.find(x => x.name === name)
    if (c) setF({ clientName: c.name, clientAddress: c.address || '', clientPhone: c.phone || '' })
    else    setF({ clientName: name })
  }

  function fillFromRef(refNumber) {
    setF({ refNumber })
    const ref = docs.find(d => d.number === refNumber)
    if (!ref) return
    setF(prev => ({
      ...prev, refNumber,
      clientName: ref.clientName, clientAddress: ref.clientAddress || '', clientPhone: ref.clientPhone || '',
      items: ref.items.map(it => ({
        ...it, id: newId(),
        price: (prev.type === 'Invoice') ? it.price : null,
        receivedQty: '', condition: 'Baik',
        total: (prev.type === 'Invoice') ? it.total : null,
      })),
    }))
  }

  async function pushDocToDB(doc, isNew) {
    const payload = {
      type: doc.type, date: doc.date, status: doc.status,
      client_name: doc.clientName, client_address: doc.clientAddress || null, client_phone: doc.clientPhone || null,
      ref_number: doc.refNumber || null, driver_name: doc.driverName || null, vehicle: doc.vehicle || null,
      items: doc.items, subtotal: doc.subtotal, tax_pct: doc.taxPct, discount: doc.discount, total: doc.total,
      due_date: doc.dueDate || null, payment_terms: doc.paymentTerms || null,
      bank_name: doc.bankName || null, account_number: doc.accountNumber || null, account_name: doc.accountName || null,
      notes: doc.notes || null,
    }
    if (isNew) {
      const { error } = await supabase.from('documents').insert({ id: doc.id, number: doc.number, created_by: user?.id, created_by_name: doc.createdByName, ...payload })
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('documents').update(payload).eq('id', doc.id)
      if (error) throw new Error(error.message)
    }
  }

  function buildDoc(overrides) {
    return {
      type: form.type, date: form.date, status: form.status,
      clientName: form.clientName.trim(), clientAddress: form.clientAddress.trim(), clientPhone: form.clientPhone.trim(),
      clientPoNumber: form.clientPoNumber.trim(),
      refNumber: form.refNumber.trim(), driverName: form.driverName.trim(), vehicle: form.vehicle.trim(),
      items: form.items.filter(it => it.name.trim()),
      subtotal: form.subtotal || null, taxPct: form.taxPct || null, discount: form.discount || null, total: form.total || null,
      dueDate: form.dueDate || null, paymentTerms: form.paymentTerms.trim(),
      bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), accountName: form.accountName.trim(),
      notes: form.notes.trim(),
      ...overrides,
    }
  }

  async function autoCreateDO(soDoc) {
    const doId = newId()
    const doNumber = await getNextNumber('DO')
    const doDoc = {
      id: doId, number: doNumber,
      type: 'DO', date: soDoc.date, status: 'dispatched',
      clientName: soDoc.clientName, clientAddress: soDoc.clientAddress || '',
      clientPhone: soDoc.clientPhone || '', clientPoNumber: soDoc.clientPoNumber || '',
      refNumber: soDoc.number, driverName: '', vehicle: '',
      items: soDoc.items.map(it => ({ ...it, price: null, total: null })),
      subtotal: null, taxPct: null, discount: null, total: null,
      dueDate: null, paymentTerms: '',
      bankName: '', accountNumber: '', accountName: '',
      notes: soDoc.notes || '', createdByName: soDoc.createdByName || '',
      createdAt: new Date().toISOString(),
    }
    // Add DO and remove the source SO in one update
    setDocs(prev => [doDoc, ...prev.filter(d => !(d.type === 'SO' && d.id === soDoc.id))])
    if (!demoMode) {
      const { error } = await supabase.from('documents').insert({
        id: doId, number: doNumber, type: 'DO', date: doDoc.date, status: 'dispatched',
        client_name: doDoc.clientName, client_address: doDoc.clientAddress || null,
        client_phone: doDoc.clientPhone || null,
        ref_number: soDoc.number, driver_name: null, vehicle: null,
        items: doDoc.items, subtotal: null, tax_pct: null, discount: null, total: null,
        due_date: null, payment_terms: null, bank_name: null, account_number: null, account_name: null,
        notes: doDoc.notes || null, created_by: user?.id, created_by_name: doDoc.createdByName,
      })
      if (error) console.error('Auto-DO creation failed:', error)
    }
  }

  async function save() {
    if (!form.clientName.trim()) return
    setSaving(true)
    try {
      if (form.editId) {
        const orig = docs.find(d => d.id === form.editId) || {}
        const doc = buildDoc({ id: form.editId, number: orig.number || '', createdByName: orig.createdByName || profile?.name || '', createdAt: orig.createdAt || new Date().toISOString() })
        setDocs(prev => prev.map(d => d.id === form.editId ? doc : d))
        if (!demoMode) await pushDocToDB(doc, false)
        if (doc.type === 'SO' && doc.status === 'confirmed' && orig.status !== 'confirmed') {
          await autoCreateDO(doc)
        }
      } else {
        const id = newId()
        const number = await getNextNumber(form.type)
        const doc = buildDoc({ id, number, createdByName: profile?.name || '', createdAt: new Date().toISOString() })
        setDocs(prev => [doc, ...prev])
        if (!demoMode) await pushDocToDB(doc, true)
        if (doc.type === 'SO' && doc.status === 'confirmed') {
          await autoCreateDO(doc)
        }
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); setForm(null) }, 900)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally { setSaving(false) }
  }

  const visibleDocs = isStaff ? docs.filter(d => d.type === 'DO') : docs
  const filtered = tab === 'all' ? visibleDocs : visibleDocs.filter(d => d.type === tab)
  const soList = docs.filter(d => d.type === 'SO')
  const doList = docs.filter(d => d.type === 'DO')

  // ── Render ──
  return (
    <div style={{ maxWidth: 720, ...FF, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>
          {isStaff ? 'Tugas Pengiriman' : 'Dokumen'}
        </h2>
        {canEdit && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#007aff', color: 'white', border: 'none',
              borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...FF,
            }}>
              <Plus size={15} /> Buat <ChevronDown size={13} />
            </button>
            {menu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20,
                background: 'white', borderRadius: 13, overflow: 'hidden', minWidth: 180,
                boxShadow: '0 8px 32px rgba(0,0,0,.14),0 0 0 .5px rgba(0,0,0,.08)',
              }}>
                {Object.entries(DOC_CFG).map(([type, cfg]) => (
                  <button key={type} onClick={() => openCreate(type)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: type !== 'Invoice' ? '0.5px solid #f0f0f0' : 'none', textAlign: 'left', ...FF,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <cfg.Icon size={14} color={cfg.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{cfg.label}</p>
                      <p style={{ fontSize: 11, color: '#8e8e93', margin: 0 }}>{type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs — hidden for staff (they only see DO) */}
      {!isStaff && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'Semua'], ...Object.entries(DOC_CFG).map(([k, v]) => [k, v.label])].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === val ? 600 : 400, ...FF,
              background: tab === val ? '#1c1c1e' : 'white',
              color: tab === val ? 'white' : '#3c3c43',
              boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)',
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 13, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)' }}>
          <FileText size={36} color="#c7c7cc" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#8e8e93', fontSize: 15, margin: 0 }}>Belum ada dokumen</p>
          {canEdit && <p style={{ color: '#c7c7cc', fontSize: 13, marginTop: 4 }}>Klik "+ Buat" untuk membuat SO, DO, GR, atau Invoice</p>}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)' }}>
          {filtered.map((doc, idx) => {
            const cfg = DOC_CFG[doc.type]
            const st  = STATUS_CFG[doc.status] || STATUS_CFG.draft
            return (
              <div key={doc.id} onClick={() => setDetail(doc)} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: 'pointer',
                borderBottom: idx === filtered.length - 1 ? 'none' : '0.5px solid #f0f0f0',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.Icon size={18} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{doc.number}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#3c3c43', margin: 0 }}>{doc.clientName}</p>
                  {doc.refNumber && <p style={{ fontSize: 11.5, color: '#8e8e93', margin: '2px 0 0' }}>Ref: {doc.refNumber}</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>
                    {doc.total ? fmtRp(doc.total) : ''}
                  </p>
                  <p style={{ fontSize: 12, color: '#8e8e93', margin: '2px 0 0' }}>{fmtDate(doc.date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {form && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620, maxHeight: '94vh', overflowY: 'auto', ...FF }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
              <button onClick={() => setForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}><X size={22} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: DOC_CFG[createType]?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {createType && (() => { const I = DOC_CFG[createType].Icon; return <I size={14} color={DOC_CFG[createType].color} /> })()}
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{form.editId ? 'Edit' : 'Buat'} {DOC_CFG[createType]?.label}</p>
              </div>
              <button onClick={save} disabled={saving || !form.clientName.trim()} style={{
                background: 'none', border: 'none', cursor: (!form.clientName.trim() || saving) ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 600, ...FF, display: 'flex', alignItems: 'center', gap: 4,
                color: saved ? '#34c759' : !form.clientName.trim() ? '#c7c7cc' : '#007aff',
              }}>
                {saved ? <><Check size={15} /> Tersimpan</> : saving ? '...' : 'Simpan'}
              </button>
            </div>

            <div style={{ padding: '20px 16px' }}>
              {/* Info Dasar */}
              <SLabel text="Informasi Dasar" />
              <Card>
                <FieldRow label="Tanggal">
                  <input type="date" value={form.date} onChange={e => setF({ date: e.target.value })} style={inputR} />
                </FieldRow>
                <FieldRow label="Status" last>
                  <select value={form.status} onChange={e => setF({ status: e.target.value })} style={selectR}>
                    {createType === 'SO' && <><option value="draft">Draft</option><option value="confirmed">Dikonfirmasi</option><option value="cancelled">Batal</option></>}
                    {createType === 'DO' && <><option value="draft">Draft</option><option value="dispatched">Dikirim</option><option value="delivered">Terkirim</option></>}
                    {createType === 'GR' && <><option value="draft">Draft</option><option value="received">Diterima</option></>}
                    {createType === 'Invoice' && <><option value="draft">Draft</option><option value="sent">Terkirim</option><option value="paid">Dibayar</option><option value="overdue">Jatuh Tempo</option></>}
                  </select>
                </FieldRow>
              </Card>

              {/* Referensi dokumen */}
              {(createType === 'DO' || createType === 'GR' || createType === 'Invoice') && (
                <>
                  <SLabel text={createType === 'GR' ? 'Referensi DO' : 'Referensi SO'} />
                  <Card>
                    <FieldRow label={createType === 'GR' ? 'No. DO' : 'No. SO'} last>
                      <select value={form.refNumber} onChange={e => fillFromRef(e.target.value)} style={selectR}>
                        <option value="">– Pilih atau ketik manual –</option>
                        {(createType === 'GR' ? doList : soList).map(d => (
                          <option key={d.id} value={d.number}>{d.number} — {d.clientName}</option>
                        ))}
                      </select>
                    </FieldRow>
                  </Card>
                </>
              )}

              {/* Klien */}
              <SLabel text="Data Klien / Tujuan" />
              <Card>
                <FieldRow label="Nama Klien">
                  {clients.length > 0 ? (
                    <select value={form.clientName} onChange={e => fillClient(e.target.value)} style={selectR}>
                      <option value="">Pilih klien...</option>
                      {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      {form.clientName && form.clientName !== '__manual__' && !clients.find(c => c.name === form.clientName) && (
                        <option value={form.clientName}>{form.clientName}</option>
                      )}
                      <option value="__manual__">+ Ketik manual</option>
                    </select>
                  ) : (
                    <input value={form.clientName} onChange={e => setF({ clientName: e.target.value })} placeholder="Nama restoran / klien" style={inputR} />
                  )}
                </FieldRow>
                {clients.length > 0 && form.clientName === '__manual__' && (
                  <FieldRow label="Nama Klien">
                    <input value="" onChange={e => setF({ clientName: e.target.value })} placeholder="Ketik nama klien" style={inputR} />
                  </FieldRow>
                )}
                <FieldRow label="No PO Klien">
                  <input value={form.clientPoNumber} onChange={e => setF({ clientPoNumber: e.target.value })} placeholder="PO-001 (opsional)" style={inputR} />
                </FieldRow>
                <FieldRow label="Alamat">
                  <input value={form.clientAddress} onChange={e => setF({ clientAddress: e.target.value })} placeholder="Alamat pengiriman" style={inputR} />
                </FieldRow>
                <FieldRow label="Telepon" last>
                  <input value={form.clientPhone} onChange={e => setF({ clientPhone: e.target.value })} placeholder="No. telepon" style={inputR} />
                </FieldRow>
              </Card>

              {/* DO: Info pengiriman */}
              {createType === 'DO' && (
                <>
                  <SLabel text="Info Pengiriman" />
                  <Card>
                    <FieldRow label="Driver / Kurir">
                      <input value={form.driverName} onChange={e => setF({ driverName: e.target.value })} placeholder="Nama pengirim" style={inputR} />
                    </FieldRow>
                    <FieldRow label="Kendaraan" last>
                      <input value={form.vehicle} onChange={e => setF({ vehicle: e.target.value })} placeholder="Plat nomor / jenis" style={inputR} />
                    </FieldRow>
                  </Card>
                </>
              )}

              {/* Invoice: Due date & bank */}
              {createType === 'Invoice' && (
                <>
                  <SLabel text="Info Pembayaran" />
                  <Card>
                    <FieldRow label="Jatuh Tempo">
                      <input type="date" value={form.dueDate} onChange={e => setF({ dueDate: e.target.value })} style={inputR} />
                    </FieldRow>
                    <FieldRow label="Termin">
                      <input value={form.paymentTerms} onChange={e => setF({ paymentTerms: e.target.value })} placeholder="Net 14 hari" style={inputR} />
                    </FieldRow>
                    <FieldRow label="Nama Bank">
                      <input value={form.bankName} onChange={e => setF({ bankName: e.target.value })} placeholder="BCA / BRI / Mandiri" style={inputR} />
                    </FieldRow>
                    <FieldRow label="No. Rekening">
                      <input value={form.accountNumber} onChange={e => setF({ accountNumber: e.target.value })} placeholder="Nomor rekening" style={inputR} />
                    </FieldRow>
                    <FieldRow label="Atas Nama" last>
                      <input value={form.accountName} onChange={e => setF({ accountName: e.target.value })} placeholder="Nama pemilik rekening" style={inputR} />
                    </FieldRow>
                  </Card>
                </>
              )}

              {/* Items */}
              <SLabel text={createType === 'GR' ? 'Barang Diterima' : 'Item / Barang'} />
              <div style={{ background: 'white', borderRadius: 13, padding: '12px 14px', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)', marginBottom: 10 }}>
                {/* Column headers */}
                <div style={{ display: 'flex', gap: 6, padding: '0 0 8px', borderBottom: '0.5px solid #f0f0f0', marginBottom: 4 }}>
                  <span style={{ flex: 2, minWidth: 120, fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>PRODUK</span>
                  <span style={{ width: 62, fontSize: 11, color: '#8e8e93', fontWeight: 600, textAlign: 'right' }}>QTY</span>
                  <span style={{ width: 58, fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>SAT.</span>
                  {(createType === 'SO' || createType === 'Invoice') && <span style={{ width: 100, fontSize: 11, color: '#8e8e93', fontWeight: 600, textAlign: 'right' }}>HARGA/UNIT</span>}
                  {createType === 'GR' && <><span style={{ width: 68, fontSize: 11, color: '#8e8e93', fontWeight: 600, textAlign: 'right' }}>TERIMA</span><span style={{ width: 72, fontSize: 11, color: '#8e8e93', fontWeight: 600 }}>KONDISI</span></>}
                  {(createType === 'SO' || createType === 'Invoice') && <span style={{ width: 90, fontSize: 11, color: '#8e8e93', fontWeight: 600, textAlign: 'right' }}>TOTAL</span>}
                  <span style={{ width: 22 }} />
                </div>
                {form.items.map((it, idx) => (
                  <ItemRow key={it.id} item={it} type={createType}
                    onChange={updated => updateItem(idx, updated)}
                    onDelete={() => deleteItem(idx)}
                    isLast={idx === form.items.length - 1} />
                ))}
                <button onClick={addItem} style={{
                  marginTop: 10, width: '100%', padding: '9px', border: '1.5px dashed #c7c7cc',
                  borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13,
                  color: '#007aff', fontWeight: 500, ...FF,
                }}>+ Tambah Item</button>
              </div>

              {/* Totals (SO & Invoice) */}
              {(createType === 'SO' || createType === 'Invoice') && (
                <>
                  <SLabel text="Total" />
                  <Card>
                    <FieldRow label="PPN (%)">
                      <input type="number" min="0" max="100" value={form.taxPct} onChange={e => setF({ taxPct: e.target.value })} placeholder="0" style={inputR} />
                    </FieldRow>
                    <FieldRow label="Diskon (Rp)">
                      <input type="number" min="0" value={form.discount} onChange={e => setF({ discount: e.target.value })} placeholder="0" style={inputR} />
                    </FieldRow>
                    <FieldRow label="Subtotal">
                      <span style={{ fontSize: 14, color: '#3c3c43' }}>{fmtRp(form.subtotal)}</span>
                    </FieldRow>
                    <FieldRow label="Total" last>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#007aff' }}>{fmtRp(form.total)}</span>
                    </FieldRow>
                  </Card>
                </>
              )}

              {/* Catatan */}
              <SLabel text="Catatan (opsional)" />
              <div style={{ background: 'white', borderRadius: 13, padding: '12px 16px', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)', marginBottom: 8 }}>
                <textarea value={form.notes} onChange={e => setF({ notes: e.target.value })}
                  placeholder="Instruksi, keterangan tambahan, dll."
                  rows={3} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#3c3c43', ...FF, resize: 'none', lineHeight: 1.55 }} />
              </div>
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div style={{ background: '#f2f2f7', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', ...FF }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid #d1d1d6', position: 'sticky', top: 0, background: '#f2f2f7', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(() => { const cfg = DOC_CFG[detail.type]; const I = cfg.Icon; return (
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <I size={15} color={cfg.color} />
                  </div>
                )})()}
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{detail.number}</p>
                  <p style={{ fontSize: 12, color: '#8e8e93', margin: 0 }}>{detail.clientName}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canEdit && (
                  <button onClick={() => printDocument(detail)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: '#1c1c1e', color: 'white',
                    border: 'none', borderRadius: 9, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', ...FF,
                  }}>
                    <Printer size={14} /> Cetak
                  </button>
                )}
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', padding: 0 }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Status & meta */}
              <Card>
                {[
                  ['Nomor', detail.number],
                  ['Tanggal', fmtDate(detail.date)],
                  detail.refNumber ? ['Referensi', detail.refNumber] : null,
                  detail.driverName ? ['Pengirim', detail.driverName] : null,
                  detail.vehicle ? ['Kendaraan', detail.vehicle] : null,
                  detail.dueDate ? ['Jatuh Tempo', fmtDate(detail.dueDate)] : null,
                  ['Dibuat oleh', detail.createdByName],
                  ['Status', (STATUS_CFG[detail.status] || {}).label || detail.status],
                ].filter(Boolean).map(([l, v], i, arr) => (
                  <FieldRow key={l} label={l} last={i === arr.length - 1}>
                    <span style={{ fontSize: 14, color: '#3c3c43', textAlign: 'right' }}>{v}</span>
                  </FieldRow>
                ))}
              </Card>

              {/* Client */}
              <div>
                <SLabel text="Klien" />
                <Card>
                  <FieldRow label="Nama" last={!detail.clientPoNumber && !detail.clientAddress && !detail.clientPhone}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{detail.clientName}</span>
                  </FieldRow>
                  {detail.clientPoNumber && <FieldRow label="No PO Klien" last={!detail.clientAddress && !detail.clientPhone}><span style={{ fontSize: 13.5, fontWeight: 600, color: '#3c3c43' }}>{detail.clientPoNumber}</span></FieldRow>}
                  {detail.clientAddress && <FieldRow label="Alamat" last={!detail.clientPhone}><span style={{ fontSize: 13.5, color: '#3c3c43', textAlign: 'right' }}>{detail.clientAddress}</span></FieldRow>}
                  {detail.clientPhone && <FieldRow label="Telepon" last><span style={{ fontSize: 13.5, color: '#3c3c43' }}>{detail.clientPhone}</span></FieldRow>}
                </Card>
              </div>

              {/* Items */}
              <div>
                <SLabel text="Item" />
                <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)' }}>
                  {detail.items.map((it, idx) => (
                    <div key={it.id || idx} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: idx === detail.items.length - 1 ? 'none' : '0.5px solid #f0f0f0', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1c1e', margin: 0 }}>{it.name}</p>
                        {it.receivedQty !== undefined && it.receivedQty !== '' && (
                          <p style={{ fontSize: 12, color: '#34c759', margin: '2px 0 0' }}>Diterima: {it.receivedQty} {it.unit} · {it.condition}</p>
                        )}
                      </div>
                      <p style={{ fontSize: 13.5, color: '#3c3c43', margin: 0, flexShrink: 0 }}>{it.qty} {it.unit}</p>
                      {!isStaff && it.price != null && <p style={{ fontSize: 13.5, color: '#8e8e93', margin: 0, flexShrink: 0 }}>× {fmtRp(it.price)}</p>}
                      {!isStaff && it.total != null && <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e', margin: 0, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>{fmtRp(it.total)}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals — hidden from staff */}
              {!isStaff && detail.total != null && (
                <div>
                  <SLabel text="Total" />
                  <Card>
                    {detail.subtotal != null && <FieldRow label="Subtotal"><span style={{ fontSize: 14, color: '#3c3c43' }}>{fmtRp(detail.subtotal)}</span></FieldRow>}
                    {detail.taxPct ? <FieldRow label={`PPN ${detail.taxPct}%`}><span style={{ fontSize: 14, color: '#3c3c43' }}>{fmtRp(Math.round((+detail.subtotal||0)*(+detail.taxPct||0)/100))}</span></FieldRow> : null}
                    {detail.discount ? <FieldRow label="Diskon"><span style={{ fontSize: 14, color: '#ff3b30' }}>− {fmtRp(detail.discount)}</span></FieldRow> : null}
                    <FieldRow label="Total" last><span style={{ fontSize: 16, fontWeight: 700, color: '#007aff' }}>{fmtRp(detail.total)}</span></FieldRow>
                  </Card>
                </div>
              )}

              {/* Bank (Invoice) — hidden from staff */}
              {!isStaff && detail.bankName && (
                <div>
                  <SLabel text="Info Pembayaran" />
                  <Card>
                    <FieldRow label="Bank"><span style={{ fontSize: 14, color: '#3c3c43' }}>{detail.bankName}</span></FieldRow>
                    <FieldRow label="No. Rekening"><span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{detail.accountNumber}</span></FieldRow>
                    <FieldRow label="Atas Nama" last><span style={{ fontSize: 14, color: '#3c3c43' }}>{detail.accountName}</span></FieldRow>
                  </Card>
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div>
                  <SLabel text="Catatan" />
                  <div style={{ background: 'white', borderRadius: 13, padding: '13px 16px', boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)' }}>
                    <p style={{ fontSize: 14, color: '#3c3c43', margin: 0, lineHeight: 1.55 }}>{detail.notes}</p>
                  </div>
                </div>
              )}
              {/* Action Buttons */}
              {canEdit && detail.status === 'draft' && (
                <button
                  onClick={() => openEdit(detail)}
                  style={{ width: '100%', padding: '15px', background: '#1c1c1e', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  Edit / Konfirmasi
                </button>
              )}
              {isStaff && detail.type === 'DO' && detail.status === 'dispatched' && (
                <button
                  onClick={() => { navigate('/dashboard/deliveries', { state: { doRef: detail.number, doId: detail.id, clientName: detail.clientName, items: detail.items, driverName: detail.driverName } }); setDetail(null) }}
                  style={{ width: '100%', padding: '15px', background: '#ff9500', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Truck size={16} /> Kirim Laporan
                </button>
              )}
              {canEdit && detail.type === 'SO' && detail.status === 'confirmed' && (
                <button
                  onClick={() => openCreateFrom('DO', detail)}
                  style={{ width: '100%', padding: '15px', background: '#ff9500', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Truck size={16} /> Buat Delivery Order
                </button>
              )}
              {canEdit && detail.type === 'DO' && detail.status === 'delivered' && (
                <button
                  onClick={() => openCreateFrom('GR', detail)}
                  style={{ width: '100%', padding: '15px', background: '#34c759', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <PackageCheck size={16} /> Buat Goods Receipt
                </button>
              )}
              {canEdit && detail.type === 'GR' && detail.status === 'received' && (
                <button
                  onClick={() => openCreateFrom('Invoice', detail)}
                  style={{ width: '100%', padding: '15px', background: '#af52de', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', ...FF, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Receipt size={16} /> Buat Invoice
                </button>
              )}
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menu && <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(false)} />}
    </div>
  )
}
