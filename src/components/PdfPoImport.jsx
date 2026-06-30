import { useState, useRef } from 'react'

async function extractPdfRows(file) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const allRows = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const rowMap = {}
    content.items.forEach(item => {
      const y = Math.round(item.transform[5] / 4) * 4
      if (!rowMap[y]) rowMap[y] = []
      rowMap[y].push({ x: item.transform[4], str: item.str.trim() })
    })
    Object.entries(rowMap)
      .sort(([a], [b]) => Number(b) - Number(a))
      .forEach(([, cols]) => {
        const row = cols.sort((a, b) => a.x - b.x).map(c => c.str).filter(Boolean).join('\t')
        if (row.trim()) allRows.push(row)
      })
  }
  return allRows
}

function parsePoData(rows) {
  let poNumber = '', clientName = '', date = '', notes = ''
  const items = []

  for (const row of rows) {
    const low = row.toLowerCase()
    if (!poNumber && /p\.?o\.?\s*(no|number|#|:)/i.test(row)) {
      const m = row.match(/[\w-]{3,}[-/]\d{3,}/i) || row.match(/\d{4,}/)
      if (m) poNumber = m[0]
    }
    if (!poNumber && /purchase\s*order/i.test(row)) {
      const m = row.match(/[\w-]{3,}[-/]\d{3,}/i) || row.match(/\b\d{5,}\b/)
      if (m) poNumber = m[0]
    }
    if (!clientName && /(bill\s*to|ship\s*to|kepada|dari|vendor|supplier)\s*[:\t]/i.test(row)) {
      const parts = row.split(/\t+/)
      if (parts.length >= 2) clientName = parts[1].trim()
    }
    if (!date) {
      const m = row.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/) ||
                row.match(/(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|aug|sep|okt|nov|des)\w*\s+(\d{4})/i) ||
                row.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
      if (m) {
        try {
          const d = new Date(m[0])
          if (!isNaN(d)) date = d.toISOString().slice(0, 10)
        } catch { /* skip */ }
      }
    }
  }

  // Find table header row
  let headerIdx = -1
  const headerKw = /nama|barang|produk|item|description|deskripsi/i
  for (let i = 0; i < rows.length; i++) {
    if (headerKw.test(rows[i])) { headerIdx = i; break }
  }

  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (/total|subtotal|grand|jumlah|keterangan/i.test(row)) break
      const cols = row.split('\t').map(s => s.trim()).filter(Boolean)
      if (cols.length < 2) continue
      // Look for a column with a number (qty)
      let name = '', qty = 0, price = 0
      const numCols = cols.map(c => ({ c, n: parseFloat(c.replace(/[.,]/g, m => m === ',' ? '.' : '')) }))
      const named = numCols.filter(x => isNaN(x.n) || x.n === 0)
      const nums = numCols.filter(x => !isNaN(x.n) && x.n > 0)
      name = named.map(x => x.c).join(' ').trim()
      if (nums.length >= 2) { qty = nums[0].n; price = nums[nums.length - 1].n }
      else if (nums.length === 1) { qty = nums[0].n }
      if (name && qty > 0) items.push({ name, qty, price })
    }
  }

  return { poNumber, clientName, date, notes, items }
}

const FF = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }

export default function PdfPoImport({ onImport, style }) {
  const [state, setState] = useState('idle') // idle | loading | review
  const [parsed, setParsed] = useState(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef()

  async function processFile(file) {
    if (!file || !file.name.endsWith('.pdf')) { alert('Pilih file PDF'); return }
    setState('loading')
    try {
      const rows = await extractPdfRows(file)
      const data = parsePoData(rows)
      setParsed({ ...data, items: data.items.map((it, i) => ({ ...it, _id: i })) })
      setState('review')
    } catch (e) {
      alert('Gagal membaca PDF: ' + e.message)
      setState('idle')
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files[0]
    processFile(file)
  }

  function confirm() {
    if (!parsed) return
    onImport({
      poNumber: parsed.poNumber,
      clientName: parsed.clientName,
      date: parsed.date,
      notes: parsed.notes,
      items: parsed.items.map(it => ({ name: it.name, qty: it.qty, price: it.price })),
    })
    setState('idle')
    setParsed(null)
  }

  function updateItem(id, field, val) {
    setParsed(p => ({ ...p, items: p.items.map(it => it._id === id ? { ...it, [field]: val } : it) }))
  }
  function removeItem(id) {
    setParsed(p => ({ ...p, items: p.items.filter(it => it._id !== id) }))
  }
  function addItem() {
    setParsed(p => ({ ...p, items: [...p.items, { _id: Date.now(), name: '', qty: 1, price: 0 }] }))
  }

  if (state === 'idle') return (
    <div
      style={{
        border: `1.5px dashed ${drag ? '#007aff' : '#c7c7cc'}`, borderRadius: 12,
        padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
        background: drag ? '#f0f7ff' : '#fafafa', transition: 'all .15s', ...FF, ...style,
      }}
      onClick={() => fileRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
      <p style={{ fontSize: 13.5, color: '#007aff', fontWeight: 600, margin: 0 }}>Upload PDF PO Klien</p>
      <p style={{ fontSize: 12, color: '#8e8e93', margin: '4px 0 0' }}>Drag & drop atau klik untuk pilih file</p>
    </div>
  )

  if (state === 'loading') return (
    <div style={{ border: '1.5px dashed #c7c7cc', borderRadius: 12, padding: '20px 16px', textAlign: 'center', background: '#fafafa', ...FF, ...style }}>
      <p style={{ fontSize: 13.5, color: '#8e8e93', margin: 0 }}>Membaca PDF…</p>
    </div>
  )

  if (state === 'review') return (
    <div style={{ background: 'white', borderRadius: 13, boxShadow: '0 1px 1px rgba(0,0,0,.04),0 0 0 .5px rgba(0,0,0,.07)', ...FF, ...style }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Periksa Data PO</p>
        <button onClick={() => { setState('idle'); setParsed(null) }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#8e8e93', cursor: 'pointer', ...FF }}>Batal</button>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['No. PO', 'poNumber', 'PO-001'], ['Nama Klien', 'clientName', 'Nama restoran'], ['Tanggal', 'date', 'YYYY-MM-DD'], ['Catatan', 'notes', 'opsional']].map(([label, key, ph]) => (
            <div key={key}>
              <p style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 600, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
              <input value={parsed[key] || ''} onChange={e => setParsed(p => ({ ...p, [key]: e.target.value }))}
                placeholder={ph} style={{ width: '100%', border: '1px solid #e5e5ea', borderRadius: 8, padding: '7px 10px', fontSize: 13, ...FF }} />
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 10.5, color: '#8e8e93', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Item ({parsed.items.length} terdeteksi)</p>
          {parsed.items.length === 0 && <p style={{ fontSize: 12, color: '#c7c7cc', margin: '0 0 8px' }}>Tidak ada item terdeteksi — tambah manual di bawah</p>}
          {parsed.items.map(it => (
            <div key={it._id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <input value={it.name} onChange={e => updateItem(it._id, 'name', e.target.value)} placeholder="Nama produk"
                style={{ flex: 2, border: '1px solid #e5e5ea', borderRadius: 8, padding: '6px 9px', fontSize: 13, ...FF }} />
              <input value={it.qty} type="number" onChange={e => updateItem(it._id, 'qty', e.target.value)} placeholder="Qty"
                style={{ width: 58, border: '1px solid #e5e5ea', borderRadius: 8, padding: '6px 8px', fontSize: 13, textAlign: 'right', ...FF }} />
              <input value={it.price} type="number" onChange={e => updateItem(it._id, 'price', e.target.value)} placeholder="Harga"
                style={{ width: 88, border: '1px solid #e5e5ea', borderRadius: 8, padding: '6px 8px', fontSize: 13, textAlign: 'right', ...FF }} />
              <button onClick={() => removeItem(it._id)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
          ))}
          <button onClick={addItem} style={{ fontSize: 12, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, ...FF }}>+ Tambah item</button>
        </div>
        <button onClick={confirm} style={{
          width: '100%', padding: '12px', background: '#007aff', border: 'none', borderRadius: 10,
          color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...FF,
        }}>Import ke SO</button>
      </div>
    </div>
  )
}
