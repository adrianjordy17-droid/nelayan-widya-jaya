import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
}

const ROLE_PERMISSIONS = {
  owner: ['orders', 'stock', 'reports', 'attendance', 'clients', 'settings', 'users', 'deliveries', 'documents', 'jobdesk', 'products', 'bookkeeping', 'suppliers', 'purchases'],
  admin: ['orders', 'stock', 'reports', 'attendance', 'clients', 'settings', 'deliveries', 'documents', 'jobdesk', 'products', 'bookkeeping', 'suppliers', 'purchases'],
  staff: ['attendance', 'deliveries', 'documents', 'products'],
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  function hasPermission(feature) {
    const role = profile?.role || 'staff'
    return ROLE_PERMISSIONS[role]?.includes(feature) ?? false
  }

  function isRole(role) {
    return profile?.role === role
  }

  const value = { user, profile, loading, signIn, signOut, hasPermission, isRole, ROLES, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
