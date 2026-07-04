import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Clear legacy localStorage keys that contained hardcoded demo data
try { ['nwj_orders', 'nwj_stock', 'nwj_clients', 'nwj_attendance'].forEach(k => localStorage.removeItem(k)) } catch {}
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/auth/LoginPage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Orders from './pages/Orders'
import Stock from './pages/Stock'
import Reports from './pages/Reports'
import Attendance from './pages/Attendance'
import Clients from './pages/Clients'
import Settings from './pages/Settings'
import Deliveries from './pages/Deliveries'
import Documents from './pages/Documents'
import Jobdesk from './pages/Jobdesk'
import Products from './pages/Products'
import Employees from './pages/Employees'
import Bookkeeping from './pages/Bookkeeping'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function FeatureRoute({ feature, children }) {
  const { hasPermission } = useAuth()
  if (!hasPermission(feature)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h2 className="text-lg font-semibold text-slate-700">Akses Ditolak</h2>
        <p className="text-slate-400 text-sm mt-1">Anda tidak memiliki akses ke fitur ini.</p>
      </div>
    )
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="orders" element={<FeatureRoute feature="orders"><Orders /></FeatureRoute>} />
        <Route path="deliveries" element={<FeatureRoute feature="deliveries"><Deliveries /></FeatureRoute>} />
        <Route path="documents" element={<FeatureRoute feature="documents"><Documents /></FeatureRoute>} />
        <Route path="stock" element={<FeatureRoute feature="stock"><Stock /></FeatureRoute>} />
        <Route path="reports" element={<FeatureRoute feature="reports"><Reports /></FeatureRoute>} />
        <Route path="attendance" element={<FeatureRoute feature="attendance"><Attendance /></FeatureRoute>} />
        <Route path="clients" element={<FeatureRoute feature="clients"><Clients /></FeatureRoute>} />
        <Route path="jobdesk" element={<FeatureRoute feature="jobdesk"><Jobdesk /></FeatureRoute>} />
        <Route path="products" element={<FeatureRoute feature="products"><Products /></FeatureRoute>} />
        <Route path="settings" element={<FeatureRoute feature="settings"><Settings /></FeatureRoute>} />
        <Route path="employees" element={<FeatureRoute feature="settings"><Employees /></FeatureRoute>} />
        <Route path="bookkeeping" element={<FeatureRoute feature="bookkeeping"><Bookkeeping /></FeatureRoute>} />
        <Route path="suppliers" element={<FeatureRoute feature="suppliers"><Suppliers /></FeatureRoute>} />
        <Route path="purchases" element={<FeatureRoute feature="purchases"><Purchases /></FeatureRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
