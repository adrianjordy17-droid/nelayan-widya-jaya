import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Role hierarchy: owner > admin > staff
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
}

const ROLE_PERMISSIONS = {
  owner: ['orders', 'stock', 'reports', 'attendance', 'clients', 'settings', 'users', 'deliveries', 'documents'],
  admin: ['orders', 'stock', 'reports', 'attendance', 'clients', 'settings', 'deliveries', 'documents'],
  staff: ['orders', 'attendance', 'deliveries', 'documents'],
}

// Demo users for offline/demo mode
const DEMO_USERS = {
  'jordy@nelayan.id': { id: 'demo-1', email: 'jordy@nelayan.id', role: 'owner', name: 'Jordy' },
  'april@nelayan.id': { id: 'demo-2', email: 'april@nelayan.id', role: 'admin', name: 'April' },
  'bimbim@nelayan.id': { id: 'demo-3', email: 'bimbim@nelayan.id', role: 'staff', name: 'Bimbim' },
  'wowo@nelayan.id': { id: 'demo-4', email: 'wowo@nelayan.id', role: 'staff', name: 'Wowo' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    // Check for demo session
    const demoSession = localStorage.getItem('demo_user')
    if (demoSession) {
      const demoUser = JSON.parse(demoSession)
      setUser(demoUser)
      setProfile(demoUser)
      setDemoMode(true)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    // Demo mode login
    const demoUser = DEMO_USERS[email.toLowerCase()]
    if (demoUser && password === 'demo1234') {
      localStorage.setItem('demo_user', JSON.stringify(demoUser))
      setUser(demoUser)
      setProfile(demoUser)
      setDemoMode(true)
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    localStorage.removeItem('demo_user')
    setDemoMode(false)
    setUser(null)
    setProfile(null)
    if (!demoMode) await supabase.auth.signOut()
  }

  function hasPermission(feature) {
    const role = profile?.role || 'staff'
    return ROLE_PERMISSIONS[role]?.includes(feature) ?? false
  }

  function isRole(role) {
    return profile?.role === role
  }

  const value = { user, profile, loading, demoMode, signIn, signOut, hasPermission, isRole, ROLES }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
