import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AdminLoginPage from './components/AdminLoginPage'
import AdminLayout from './layouts/AdminLayout'
import ChangePasswordForm from './components/ChangePasswordForm'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const TermManagement = lazy(() => import('./pages/TermManagement'))
const Enrollments = lazy(() => import('./pages/Enrollments'))
const SectionManagement = lazy(() => import('./pages/SectionManagement'))
const SubjectManagement = lazy(() => import('./pages/SubjectManagement'))

function Loading() {
  return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
}

function AdminRoutes() {
  const { appUser, loading, mustChangePassword } = useAuth()
  const [page, setPage] = useState('/')

  if (loading) return <Loading />
  if (!appUser) return <AdminLoginPage />
  if (mustChangePassword) return <ChangePasswordForm />

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
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>{renderPage()}</Suspense>
      </ErrorBoundary>
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
