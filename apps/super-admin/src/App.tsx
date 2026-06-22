import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import SuperAdminLoginPage from './components/SuperAdminLoginPage'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import SchoolsList from './pages/SchoolsList'
import CreateSchool from './pages/CreateSchool'
import SchoolDetail from './pages/SchoolDetail'

function Loading() {
  return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
}

function SuperAdminRoutes() {
  const { appUser, loading } = useAuth()
  const [page, setPage] = useState('/')
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)

  if (loading) return <Loading />
  if (!appUser) return <SuperAdminLoginPage />

  function renderPage() {
    switch (page) {
      case '/schools':
        return <SchoolsList onSelect={(id) => { setSelectedSchoolId(id); setPage('/school-detail') }} />
      case '/school-detail':
        return selectedSchoolId ? <SchoolDetail schoolId={selectedSchoolId} onBack={() => setPage('/schools')} /> : <SchoolsList onSelect={() => {}} />
      case '/create-school':
        return <CreateSchool onCreated={() => setPage('/schools')} />
      default:
        return <Dashboard />
    }
  }

  return (
    <SuperAdminLayout path={page} onNav={setPage}>
      <ErrorBoundary>
        {renderPage()}
      </ErrorBoundary>
    </SuperAdminLayout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SuperAdminRoutes />
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  )
}
