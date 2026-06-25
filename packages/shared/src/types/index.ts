export type Role = 'student' | 'teacher' | 'admin' | 'super_admin'
export type SchoolLevel = 'kinder' | 'elementary' | 'highschool' | 'senior_highschool'

export const SCHOOL_LEVELS: Record<SchoolLevel, { label: string; grades: string[] }> = {
  kinder: { label: 'Kinder', grades: ['K1', 'K2'] },
  elementary: { label: 'Elementary', grades: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'] },
  highschool: { label: 'High School', grades: ['G7', 'G8', 'G9', 'G10'] },
  senior_highschool: { label: 'Senior High School', grades: ['G11', 'G12'] },
}

export interface School {
  id: string
  name: string
  slug: string
  domain?: string
  isActive: boolean
  ownerName: string
  ownerEmail: string
  levels: SchoolLevel[]
  databaseId?: string
  createdAt: number
  updatedAt?: number
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'TARDY'

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  schoolId?: string
  section?: string
  nfcUid?: string
  lrn?: string
  createdAt: number
}

export interface AcademicTerm {
  id: string
  label: string
  semester: string
  isActive: boolean
  isArchived?: boolean
  schoolId?: string
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
  subjectGroup?: string
  schoolId?: string
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
  schoolId?: string
  createdAt: number
}

export interface Enrollment {
  id: string
  studentId: string
  classId: string
  termId: string
  schoolId?: string
}

export interface GradeScore {
  id: string
  studentId: string
  classId: string
  componentId: string
  score: number
  maxScore: number
  schoolId?: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  date: string
  status: AttendanceStatus
  remarks?: string
  recordedBy: string
  schoolId?: string
}

export interface Announcement {
  id: string
  classId: string
  teacherId: string
  title: string
  content: string
  schoolId?: string
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
  schoolId?: string
  createdAt: number
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  fileUrl: string
  fileName: string
  score: number | null
  schoolId?: string
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
  schoolId?: string
  createdAt: number
}

export interface Section {
  id: string
  name: string
  gradeLevel: string
  schoolId?: string
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
  schoolId?: string
}

export interface GradeRelease {
  id: string
  classId: string
  teacherId: string
  releasedAt: number
  isReleased: boolean
  schoolId?: string
}

export interface DriveLink {
  id: string
  classId: string
  teacherId: string
  title: string
  driveUrl: string
  driveFileId: string
  mimeType?: string
  schoolId?: string
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

export function getGradesForLevels(levels: SchoolLevel[]): string[] {
  const grades: string[] = []
  for (const level of levels) {
    if (SCHOOL_LEVELS[level]) grades.push(...SCHOOL_LEVELS[level].grades)
  }
  return grades
}

export interface SeatPlan {
  id: string
  classId: string
  canvasWidth: number
  canvasHeight: number
  elements: ClassroomElement[]
  schoolId?: string
  createdAt: number
  updatedAt: number
}
