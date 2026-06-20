import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './pages/LoginPage'
import PortalLayout from './layouts/PortalLayout'
import StudentDashboard from './pages/student/StudentDashboard'
import MyGrades from './pages/student/MyGrades'
import Transcript from './pages/student/Transcript'
import TeacherClasses from './pages/teacher/TeacherClasses'
import Attendance from './pages/teacher/Attendance'
import GradeEntry from './pages/teacher/GradeEntry'
import SeatPlan from './pages/teacher/SeatPlan'
import ReportCards from './pages/teacher/ReportCards'
import ClassSheets from './pages/teacher/ClassSheets'
import LearningMaterials from './pages/teacher/LearningMaterials'
import StudentMaterials from './pages/student/StudentMaterials'
import Schedule from './pages/Schedule'
import Announcements from './pages/Announcements'
import Assignments from './pages/Assignments'
import Profile from './pages/Profile'
import ToastContainer from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

function AppRoutes() {
  const { appUser, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
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
      default:
        if (user.role === 'teacher') return <TeacherClasses user={user} onNav={setPage} />
        return <StudentDashboard user={user} />
    }
  }

  return (
    <PortalLayout path={page} onNav={setPage}>
      <ErrorBoundary>{renderPage()}</ErrorBoundary>
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
