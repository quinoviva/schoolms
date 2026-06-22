export type Role = 'student' | 'teacher' | 'admin'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'TARDY'

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  section?: string
  nfcUid?: string
  createdAt: number
}

export interface AcademicTerm {
  id: string
  label: string
  semester: string
  isActive: boolean
  isArchived?: boolean
  createdAt: number
}

export interface GradingComponent {
  id: string
  name: string
  weight: number
}

export interface Subject {
  id: string
  code: string
  title: string
  teacherId: string
  termId: string
  gradeLevel: string
  gradingComponents: GradingComponent[]
  createdAt: number
}

export interface Class {
  id: string
  subjectId: string
  section: string
  teacherId: string
  schedule: string
  room: string
  termId: string
  createdAt: number
}

export interface Enrollment {
  id: string
  studentId: string
  classId: string
  termId: string
}

export interface GradeScore {
  id: string
  studentId: string
  classId: string
  componentId: string
  score: number
  maxScore: number
}

export interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  date: string
  status: AttendanceStatus
  remarks: string
  recordedBy: string
}

export interface Announcement {
  id: string
  classId: string
  teacherId: string
  title: string
  content: string
  createdAt: number
}

export interface Assignment {
  id: string
  classId: string
  teacherId: string
  title: string
  description: string
  dueDate: string
  maxScore: number
  createdAt: number
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  fileUrl: string
  fileName: string
  score: number | null
  submittedAt: number
  gradedAt: number | null
}

export interface Notification {
  id: string
  userId: string
  type: 'grade_released' | 'announcement' | 'assignment'
  message: string
  read: boolean
  relatedId: string
  createdAt: number
}

export interface Section {
  id: string
  name: string
  gradeLevel: string
}

export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: 'create' | 'update' | 'delete'
  collection: string
  documentId: string
  details: string
  timestamp: number
}

export interface GradeRelease {
  id: string
  classId: string
  teacherId: string
  releasedAt: number
  isReleased: boolean
}

export interface DriveLink {
  id: string
  classId: string
  teacherId: string
  title: string
  driveUrl: string
  driveFileId: string
  mimeType?: string
  createdAt: number
}

export type ThemeMode = 'light' | 'dark'

export interface ClassroomElement {
  id: string
  type: 'seat' | 'blackboard' | 'teacherDesk'
  x: number
  y: number
  width: number
  height: number
  studentId?: string | null
  label?: string
}

export interface SeatPlan {
  id: string
  classId: string
  canvasWidth: number
  canvasHeight: number
  elements: ClassroomElement[]
  createdAt: number
  updatedAt: number
}
