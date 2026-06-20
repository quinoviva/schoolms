import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminLoginPage from './components/AdminLoginPage'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import UserManagement from './pages/UserManagement'
import TermManagement from './pages/TermManagement'
import Enrollments from './pages/Enrollments'
import SectionManagement from './pages/SectionManagement'
import SubjectManagement from './pages/SubjectManagement'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

function AdminRoutes() {
  const { appUser, loading } = useAuth()
  const [page, setPage] = useState('/')

  if (loading) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
  if (!appUser) return <AdminLoginPage />

  function renderPage() {
    switch (page) {
      case '/users': return <UserManagement />
      case '/terms': return <TermManagement />
      case '/enrollments': return <Enrollments />
      case '/sections': return <SectionManagement />
      case '/subjects': return <SubjectManagement />
      default: return <AdminDashboard />
    }
  }

  return (
    <AdminLayout path={page} onNav={setPage}>
      <ErrorBoundary>{renderPage()}</ErrorBoundary>
    </AdminLayout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminRoutes />
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  )
}
