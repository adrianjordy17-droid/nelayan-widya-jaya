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
  const text = rows.join('\n')

  const poMatch =
    text.match(/(?:no\.?\s*(?:po|p\.o\.?)|purchase\s+order\s*(?:no\.?|number|#)?|nomor\s*(?:po|pesanan)|po\s*(?:no\.?|number|#)?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/\.]{1,30})/i) ||
    text.match(/\b(PO[-\/]?[A-Z0-9\-\/]{3,20})\b/i)
  const poNumber = poMatch ? (poMatch[1] || poMatch[0]).trim() : ''

  const clientMatch = text.match(
    /(?:kepada\s*(?:yth\.?)?|bill\s+to\s*:?|ship\s+to\s*:?|to\s*:|vendor\s*:?|supplier\s*:?|dari\s*:?)\s*\n?\s*([A-Z][^\n]{3,60})/i
  )
  const clientName = clientMatch ? clientMatch[1].trim() : ''

  const monthMap = { jan:1,feb:2,mar:3,apr:4,mei:5,may:5,jun:6,jul:7,agu:8,aug:8,sep:9,okt:10,oct:10,nov:11,des:12,dec:12 }
  let date = ''
  const dm = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|may|aug|oct|dec)[a-z]*\.?\s+(\d{4})/i) ||
             text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/) ||
             text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dm) {
    if (isNaN(Number(dm[2]))) {
      const mn = monthMap[dm[2].slice(0,3).toLowerCase()] || 1
      date = `${dm[3]}-${String(mn).padStart(2,'0')}-${dm[1].padStart(2,'0')}`
    } else if (dm[1].length === 4) {
      date = `${dm[1]}-${dm[2]}-${dm[3]}`
    } else {
      date = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`
    }
  }

  const items = []
  let inTable = false
  const headerRe = /(?:nama\s*(?:barang|produk|item)|description|produk|item\s*desc|barang)/i
  const skipRe = /(?:^total|subtotal|diskon|discount|pajak|ppn|tax|ongkos|grand\s*total)/i
  const numRe = (s) => !isNaN(parseFloat(s.replace(/[.,]/g, '').replace(',','.'))) && s.replace(/[.,]/g,'').length > 0
  const unitWords = /^(pcs|kg|unit|box|dus|lusin|ltr|gram|gr|ton|kodi)$/i

  rows.forEach(row => {
    if (headerRe.test(row)) { inTable = true; return }
    if (!inTable) return
    if (skipRe.test(row.trim())) { inTable = false; return }

    const cols = row.split('\t').map(s => s.trim()).filter(Boolean)
    if (cols.length < 2) return

    const nums = cols
      .filter(c => numRe(c) && !unitWords.test(c))
      .map(c => parseFloat(c.replace(/\./g,'').replace(',','.')))
    const names = cols.filter(c => !numRe(c) && !unitWords.test(c) && c.length > 1)

    if (names.length > 0 && nums.length >= 1) {
      items.push({ name: names[0], qty: nums[0] || 1, price: nums[1] || 0 })
    }
  })

  return { poNumber, clientName, date, items }
}

export default function PdfPoImport({ onImport, style }) {
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ poNumber: '', clientName: '', date: '', notes: '' })
  const [items, setItems] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  async function handleFile(file) {
    if (!file) return
    if (file.type !== 'application/pdf') { setError('File harus berformat PDF'); return }
    setPhase('loading')
    setError('')
    try {
      const rows = await extractPdfRows(file)
      const parsed = parsePoData(rows)
      setForm({ poNumber: parsed.poNumber, clientName: parsed.clientName, date: parsed.date, notes: '' })
      setItems(parsed.items.map((it, i) => ({ ...it, id: i })))
      setPhase('review')
    } catch (e) {
      setError('Gagal membaca PDF. Coba input manual.')
      setPhase('idle')
    }
  }

  function addItem() {
    setItems(p => [...p, { id: Date.now(), name: '', qty: 1, price: 0 }])
  }

  function updateItem(id, key, val) {
    setItems(p => p.map(it => it.id === id ? { ...it, [key]: val } : it))
  }

  function removeItem(id) {
    setItems(p => p.filter(it => it.id !== id))
  }

  function confirm() {
    onImport({
      poNumber: form.poNumber,
      clientName: form.clientName,
      date: form.date,
      notes: form.notes,
      items: items.filter(it => it.name.trim()).map(({ name, qty, price }) => ({
        name, qty: Number(qty) || 1, price: Number(price) || 0
      }))
    })
    setPhase('idle')
  }

  const card = { background: '#fff', borderRadius: 16, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
  const inp = {
    width: '100%', border: '1px solid #e5e5ea', borderRadius: 10, padding: '9px 12px',
    fontSize: 14, color: '#1c1c1e', background: '#f9f9fb', fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none'
  }
  const lbl = { fontSize: 10, color: '#8e8e93', fontWeight: 600, marginBottom: 5, display: 'block', letterSpacing: 0.8, textTransform: 'uppercase' }

  if (phase === 'idle') return (
    <div style={style}>
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragOver ? '#007AFF' : '#c7c7cc'}`,
          borderRadius: 14, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#f0f7ff' : '#f9f9fb', transition: 'all 0.18s'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3a3a3c' }}>Upload PO dari Klien</div>
        <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 3 }}>Drop file PDF atau klik untuk browse</div>
        <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 8 }}>Nomor PO, klien, & item akan terdeteksi otomatis</div>
        {error && <div style={{ fontSize: 12, color: '#FF3B30', marginTop: 8 }}>{error}</div>}
      </div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )

  if (phase === 'loading') return (
    <div style={{ ...card, ...style, textAlign: 'center', padding: '36px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#3a3a3c' }}>Membaca PDF…</div>
      <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>Mengekstrak data PO</div>
    </div>
  )

  return (
    <div style={{ ...card, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>Data PO Terdeteksi</div>
          <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Periksa & edit sebelum import ke SO</div>
        </div>
        <button onClick={() => setPhase('idle')} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8e8e93', padding: 0, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={lbl}>Nomor PO</label>
          <input style={inp} value={form.poNumber} onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))} placeholder="e.g. PO-2024-001" />
        </div>
        <div>
          <label style={lbl}>Nama Klien</label>
          <input style={inp} value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nama perusahaan klien" />
        </div>
        <div>
          <label style={lbl}>Tanggal PO</label>
          <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ ...lbl, marginBottom: 0 }}>Item Order ({items.length})</label>
          <button onClick={addItem} style={{ fontSize: 13, color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>+ Tambah Item</button>
        </div>

        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aeaeb2', textAlign: 'center', padding: '14px', background: '#f9f9fb', borderRadius: 10 }}>
            Item tidak terdeteksi — tambah manual atau PDF berformat gambar (scan)
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 24px', gap: 6, marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 600 }}>NAMA PRODUK</div>
              <div style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 600, textAlign: 'center' }}>QTY</div>
              <div style={{ fontSize: 10, color: '#aeaeb2', fontWeight: 600 }}>HARGA</div>
              <div />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(it => (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 24px', gap: 6, alignItems: 'center' }}>
                  <input style={{ ...inp, padding: '8px 10px' }} value={it.name} onChange={e => updateItem(it.id, 'name', e.target.value)} placeholder="Nama produk" />
                  <input style={{ ...inp, padding: '8px 6px', textAlign: 'center' }} type="number" value={it.qty} onChange={e => updateItem(it.id, 'qty', e.target.value)} min="0" />
                  <input style={{ ...inp, padding: '8px 10px' }} type="number" value={it.price} onChange={e => updateItem(it.id, 'price', e.target.value)} min="0" placeholder="0" />
                  <button onClick={() => removeItem(it.id)} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Catatan dari PO</label>
        <textarea
          style={{ ...inp, resize: 'vertical', minHeight: 56 }}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Instruksi khusus dari klien..."
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setPhase('idle')} style={{ flex: 1, background: '#f2f2f7', color: '#3a3a3c', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Batal
        </button>
        <button onClick={confirm} style={{ flex: 2, background: '#007AFF', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Import ke SO →
        </button>
      </div>
    </div>
  )
}
