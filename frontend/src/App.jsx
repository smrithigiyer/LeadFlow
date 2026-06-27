import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthProvider } from './context/AuthContext'

import AdminLayout   from './components/AdminLayout'
import Dashboard     from './pages/Dashboard'
import FollowUps     from './pages/FollowUps/FollowUps'
import Leads         from './pages/Leads/Leads'
import SettingsPage  from './pages/Settings'
import Login         from './pages/Login'
import UsersPage     from './pages/Users/Users'
import Customers     from './pages/Customers/Customers'
import LostLeads     from './pages/LostLeads/LostLeads'
import CalendarPage  from './pages/Calendar/Calendar'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/admin/dashboard" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/admin/dashboard" replace /> : <Login />}
      />

      {/* Admin panel */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index                element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="followups"     element={<FollowUps />} />
        <Route path="calendar"      element={<CalendarPage />} />
        <Route path="leads"         element={<Leads />} />
        <Route path="customers"     element={<Customers />} />
        <Route path="lost-leads"    element={<LostLeads />} />
        <Route path="settings"      element={<SettingsPage />} />
        <Route path="users"         element={<AdminRoute><UsersPage /></AdminRoute>} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
