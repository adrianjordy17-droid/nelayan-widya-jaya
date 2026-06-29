import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, X, Check, Trash2, ClipboardList, User } from 'lucide-react'

const todayStr = () => new Date().toISOString().slice(0, 10)
const newId    = () => crypto.randomUUID()

function groupByAssignee(tasks) {
  const map = {}
  tasks.forEach(t => {
    if (!map[t.assigned_to_name]) map[t.assigned_to_name] = []
    map[t.assigned_to_name].push(t)
  })
  return map
}

const AVATAR_COLORS = ['#0a84ff', '#30d158', '#ff9500', '#ff375f', '#5e5ce6', '#32ade6']
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function Jobdesk() {
  const { profile } = useAuth()
  const [tasks, setTasks]       = useState([])
  const [staffList, setStaff]   = useState([])
  const [filter, setFilter]     = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ title: '', assignedTo: '', dueDate: todayStr() })

  useEffect(() => {
    supabase.from('profiles').select('id,name,role')
      .in('role', ['staff', 'admin'])
      .then(({ data, error }) => {
        if (error) console.error('profiles fetch error:', error.message)
        if (data && data.length > 0) setStaff(data)
      })

    supabase.from('tasks').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('tasks fetch error:', error.message)
        if (data) setTasks(data)
      })
  }, [])

  const setF = v => setForm(f => ({ ...f, ...v }))

  async function toggleDone(task) {
    const updated = { ...task, done: !task.done }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    const { error } = await supabase.from('tasks').update({ done: updated.done }).eq('id', task.id)
    if (error) setTasks(prev => prev.map(t => t.id === task.id ? task : t))
  }

  async function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function save() {
    if (!form.title.trim() || !form.assignedTo) return
    setSaving(true)
    const task = {
      id: newId(),
      title: form.title.trim(),
      assigned_to_name: form.assignedTo,
      due_date: form.dueDate || null,
      done: false,
      created_by: profile?.name || '',
    }
    setTasks(prev => [task, ...prev])
    setShowForm(false)
    setForm({ title: '', assignedTo: '', dueDate: todayStr() })
    const { error } = await supabase.from('tasks').insert({
      id: task.id, title: task.title, assigned_to_name: task.assigned_to_name,
      due_date: task.due_date, done: false, created_by: task.created_by,
    })
    if (error) {
      alert('Gagal simpan tugas: ' + error.message)
      setTasks(prev => prev.filter(t => t.id !== task.id))
    }
    setSaving(false)
  }

  const visible = tasks.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.done : !t.done
  )
  const grouped = groupByAssignee(visible)
  const pendingCount = tasks.filter(t => !t.done).length
  const doneCount    = tasks.filter(t => t.done).length

  const card = {
    background: 'white', borderRadius: 14,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    overflow: 'hidden',
  }
  const input = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 14,
    color: '#1e293b', outline: 'none',
    fontFamily: "inherit",
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Jobdesk Staf</h2>
          <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 3 }}>
            {pendingCount} tugas belum selesai · {doneCount} selesai
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10,
            background: '#0a84ff', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, color: 'white',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Buat Tugas
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { key: 'all',     label: 'Semua',        count: tasks.length },
          { key: 'pending', label: 'Belum Selesai', count: pendingCount },
          { key: 'done',    label: 'Selesai',       count: doneCount },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '6px 14px', borderRadius: 99,
              border: '1px solid ' + (filter === key ? '#0a84ff' : '#e2e8f0'),
              background: filter === key ? '#eff6ff' : 'white',
              color: filter === key ? '#0a84ff' : '#64748b',
              fontSize: 12.5, fontWeight: filter === key ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {label}
            <span style={{
              marginLeft: 6, fontSize: 11, fontWeight: 700,
              padding: '1px 6px', borderRadius: 99,
              background: filter === key ? '#0a84ff' : '#f1f5f9',
              color: filter === key ? 'white' : '#64748b',
            }}>{count}</span>
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ ...card, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <ClipboardList size={22} color="#7c3aed" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>Belum ada tugas</p>
          <p style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 6 }}>Klik "Buat Tugas" untuk menambah tugas baru</p>
        </div>
      ) : (
        Object.entries(grouped).map(([name, taskList]) => {
          const color = avatarColor(name)
          return (
            <div key={name} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 12px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>{taskList.filter(t => !t.done).length} tugas tersisa</p>
                </div>
              </div>

              {taskList.map((task, idx) => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 18px',
                  borderBottom: idx < taskList.length - 1 ? '1px solid #f8fafc' : 'none',
                  background: task.done ? '#fafafa' : 'white',
                  transition: 'background 0.15s',
                }}>
                  <button onClick={() => toggleDone(task)} style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: '2px solid ' + (task.done ? '#30d158' : '#cbd5e1'),
                    background: task.done ? '#30d158' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', marginTop: 1,
                  }}>
                    {task.done && <Check size={11} color="white" stroke
