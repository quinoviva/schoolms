import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './pages/LoginPage'
import PortalLayout from './layouts/PortalLayout'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const MyGrades = lazy(() => import('./pages/student/MyGrades'))
const Transcript = lazy(() => import('./pages/student/Transcript'))
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses'))
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const Attendance = lazy(() => import('./pages/teacher/Attendance'))
const GradeEntry = lazy(() => import('./pages/teacher/GradeEntry'))
const SeatPlan = lazy(() => import('./pages/teacher/SeatPlan'))
const ReportCards = lazy(() => import('./pages/teacher/ReportCards'))
const ClassSheets = lazy(() => import('./pages/teacher/ClassSheets'))
const LearningMaterials = lazy(() => import('./pages/teacher/LearningMaterials'))
const StudentMaterials = lazy(() => import('./pages/student/StudentMaterials'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Assignments = lazy(() => import('./pages/Assignments'))
const Profile = lazy(() => import('./pages/Profile'))

function Loading() {
  return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
}

function AppRoutes() {
  const { appUser, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return <Loading />
  if (!appUser) return <LoginPage />

  const user = appUser

  function renderPage() {
    switch (page) {
      case 'grades':
        return user.role === 'student' ? <MyGrades user={user} /> : <GradeEntry user={user} />
      case 'transcript':
        return <Transcript user={user} />
      case 'attendance':
        return <Attendance user={user} />
      case 'seatplan':
        return <SeatPlan user={user} />
      case 'reportcards':
        return <ReportCards user={user} />
      case 'classsheets':
        return <ClassSheets user={user} />
      case 'materials':
        return user.role === 'teacher' ? <LearningMaterials user={user} /> : <StudentMaterials user={user} />
      case 'schedule':
        return <Schedule user={user} />
      case 'assignments':
        return <Assignments user={user} />
      case 'announcements':
        return <Announcements user={user} />
      case 'profile':
        return <Profile user={user} />
      case 'classes':
        return <TeacherClasses user={user} onNav={setPage} />
      default:
        if (user.role === 'teacher') return <TeacherDashboard user={user} onNav={setPage} />
        return <StudentDashboard user={user} />
    }
  }

  return (
    <PortalLayout path={page} onNav={setPage}>
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>{renderPage()}</Suspense>
      </ErrorBoundary>
    </PortalLayout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  )
}
