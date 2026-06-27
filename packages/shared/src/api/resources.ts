import { api } from './client.js'
import type {
  School, AppUser, AcademicTerm, Subject, Class, Enrollment, GradeScore,
  AttendanceRecord, Section, Announcement, Assignment, Submission, Notification,
  DriveLink, SeatPlan, GradeRelease, AuditLog,
} from '../types/index.js'

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamelCase)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const camel = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
      out[camel] = toCamelCase(v)
    }
    return out
  }
  return value
}

function mapRow<T>(row: Record<string, unknown> | null): T | null {
  if (!row) return null
  return toCamelCase(row) as T
}

function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => toCamelCase(r) as T)
}

/* ── Schools ── */
export function listSchools(): Promise<School[]> {
  return api.get<Record<string, unknown>[]>('/schools').then(mapRows<School>)
}

export function getSchoolBySlug(slug: string): Promise<School | null> {
  return api.get<Record<string, unknown> | null>(`/schools/slug/${slug}`).then(mapRow<School>)
}

export function getSchool(id: string): Promise<School | null> {
  return api.get<Record<string, unknown> | null>(`/schools/${id}`).then(mapRow<School>)
}

export type CreateSchoolInput = Omit<School, 'id' | 'createdAt' | 'updatedAt'> & { id: string }

export function createSchool(data: CreateSchoolInput): Promise<School & { adminEmail?: string; adminPassword?: string }> {
  return api.post<Record<string, unknown>>('/schools', data).then(r => {
    const school = mapRow<School>(r)!
    return { ...school, adminEmail: r.adminEmail as string | undefined, adminPassword: r.adminPassword as string | undefined }
  })
}

export function updateSchool(id: string, data: Partial<School>): Promise<School> {
  return api.put<Record<string, unknown>>(`/schools/${id}`, data).then(r => mapRow<School>(r)!)
}

/* ── Users ── */
export function listUsers(params: { schoolId?: string; role?: string; section?: string } = {}): Promise<AppUser[]> {
  const qs = new URLSearchParams()
  if (params.schoolId) qs.set('schoolId', params.schoolId)
  if (params.role) qs.set('role', params.role)
  if (params.section) qs.set('section', params.section)
  return api.get<Record<string, unknown>[]>(`/users?${qs}`).then(mapRows<AppUser>)
}

export function getUser(id: string): Promise<AppUser | null> {
  return api.get<Record<string, unknown> | null>(`/users/${id}`).then(mapRow<AppUser>)
}

export function createUser(data: AppUser): Promise<AppUser> {
  return api.post<Record<string, unknown>>('/users', data).then(r => mapRow<AppUser>(r)!)
}

export function updateUser(id: string, data: Partial<AppUser>): Promise<AppUser> {
  return api.put<Record<string, unknown>>(`/users/${id}`, data).then(r => mapRow<AppUser>(r)!)
}

export function deleteUser(id: string): Promise<void> {
  return api.del<void>(`/users/${id}`)
}

/* ── Terms ── */
export function listTerms(schoolId?: string): Promise<AcademicTerm[]> {
  const qs = schoolId ? `?schoolId=${schoolId}` : ''
  return api.get<Record<string, unknown>[]>(`/terms${qs}`).then(mapRows<AcademicTerm>)
}

export function createTerm(data: AcademicTerm): Promise<AcademicTerm> {
  return api.post<Record<string, unknown>>('/terms', data).then(r => mapRow<AcademicTerm>(r)!)
}

export function updateTerm(id: string, data: Partial<AcademicTerm>): Promise<AcademicTerm> {
  return api.put<Record<string, unknown>>(`/terms/${id}`, data).then(r => mapRow<AcademicTerm>(r)!)
}

/* ── Subjects ── */
export function listSubjects(params: { schoolId?: string; teacherId?: string; termId?: string; gradeLevel?: string } = {}): Promise<Subject[]> {
  const qs = new URLSearchParams()
  if (params.schoolId) qs.set('schoolId', params.schoolId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  if (params.termId) qs.set('termId', params.termId)
  if (params.gradeLevel) qs.set('gradeLevel', params.gradeLevel)
  return api.get<Record<string, unknown>[]>(`/subjects?${qs}`).then(mapRows<Subject>)
}

export function createSubject(data: Subject): Promise<Subject> {
  return api.post<Record<string, unknown>>('/subjects', data).then(r => mapRow<Subject>(r)!)
}

export function updateSubject(id: string, data: Partial<Subject>): Promise<Subject> {
  return api.put<Record<string, unknown>>(`/subjects/${id}`, data).then(r => mapRow<Subject>(r)!)
}

export function deleteSubject(id: string): Promise<void> {
  return api.del<void>(`/subjects/${id}`)
}

/* ── Classes ── */
export function listClasses(params: { schoolId?: string; teacherId?: string; termId?: string; section?: string } = {}): Promise<Class[]> {
  const qs = new URLSearchParams()
  if (params.schoolId) qs.set('schoolId', params.schoolId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  if (params.termId) qs.set('termId', params.termId)
  if (params.section) qs.set('section', params.section)
  return api.get<Record<string, unknown>[]>(`/classes?${qs}`).then(mapRows<Class>)
}

export function getClass(id: string): Promise<Class | null> {
  return api.get<Record<string, unknown> | null>(`/classes/${id}`).then(mapRow<Class>)
}

export function createClass(data: Class): Promise<Class> {
  return api.post<Record<string, unknown>>('/classes', data).then(r => mapRow<Class>(r)!)
}

export function updateClass(id: string, data: Partial<Class>): Promise<Class> {
  return api.put<Record<string, unknown>>(`/classes/${id}`, data).then(r => mapRow<Class>(r)!)
}

export function deleteClass(id: string): Promise<void> {
  return api.del<void>(`/classes/${id}`)
}

/* ── Enrollments ── */
export function listEnrollments(params: { classId?: string; studentId?: string; termId?: string } = {}): Promise<Enrollment[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.studentId) qs.set('studentId', params.studentId)
  if (params.termId) qs.set('termId', params.termId)
  return api.get<Record<string, unknown>[]>(`/enrollments?${qs}`).then(mapRows<Enrollment>)
}

export function batchCreateEnrollments(enrollments: Enrollment[]): Promise<{ count: number }> {
  return api.post<{ count: number }>('/enrollments', { enrollments })
}

export function deleteEnrollment(id: string): Promise<void> {
  return api.del<void>(`/enrollments/${id}`)
}

export function batchDeleteEnrollments(ids: string[]): Promise<{ deleted: number }> {
  return api.post<{ deleted: number }>('/enrollments/batch-delete', { ids })
}

/* ── Grades ── */
export function listGrades(params: { classId?: string; studentId?: string; componentId?: string } = {}): Promise<GradeScore[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.studentId) qs.set('studentId', params.studentId)
  if (params.componentId) qs.set('componentId', params.componentId)
  return api.get<Record<string, unknown>[]>(`/grades?${qs}`).then(mapRows<GradeScore>)
}

export function batchSaveGrades(scores: GradeScore[]): Promise<{ count: number }> {
  return api.post<{ count: number }>('/grades/batch', { scores })
}

/* ── Attendance ── */
export function listAttendance(params: { classId?: string; studentId?: string; date?: string } = {}): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.studentId) qs.set('studentId', params.studentId)
  if (params.date) qs.set('date', params.date)
  return api.get<Record<string, unknown>[]>(`/attendance?${qs}`).then(mapRows<AttendanceRecord>)
}

export function batchSaveAttendance(records: AttendanceRecord[]): Promise<{ count: number }> {
  return api.post<{ count: number }>('/attendance/batch', { records })
}

/* ── Sections ── */
export function listSections(params: { schoolId?: string; gradeLevel?: string } = {}): Promise<Section[]> {
  const qs = new URLSearchParams()
  if (params.schoolId) qs.set('schoolId', params.schoolId)
  if (params.gradeLevel) qs.set('gradeLevel', params.gradeLevel)
  return api.get<Record<string, unknown>[]>(`/sections?${qs}`).then(mapRows<Section>)
}

export function createSection(data: Section): Promise<Section> {
  return api.post<Record<string, unknown>>('/sections', data).then(r => mapRow<Section>(r)!)
}

export function updateSection(id: string, data: Partial<Section>): Promise<Section> {
  return api.put<Record<string, unknown>>(`/sections/${id}`, data).then(r => mapRow<Section>(r)!)
}

export function deleteSection(id: string): Promise<void> {
  return api.del<void>(`/sections/${id}`)
}

/* ── Announcements ── */
export function listAnnouncements(params: { classId?: string; teacherId?: string } = {}): Promise<Announcement[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  return api.get<Record<string, unknown>[]>(`/announcements?${qs}`).then(mapRows<Announcement>)
}

export function createAnnouncement(data: Announcement): Promise<Announcement> {
  return api.post<Record<string, unknown>>('/announcements', data).then(r => mapRow<Announcement>(r)!)
}

/* ── Assignments ── */
export function listAssignments(params: { classId?: string; teacherId?: string } = {}): Promise<Assignment[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  return api.get<Record<string, unknown>[]>(`/assignments?${qs}`).then(mapRows<Assignment>)
}

export function createAssignment(data: Assignment): Promise<Assignment> {
  return api.post<Record<string, unknown>>('/assignments', data).then(r => mapRow<Assignment>(r)!)
}

export function updateAssignment(id: string, data: Partial<Assignment>): Promise<Assignment> {
  return api.put<Record<string, unknown>>(`/assignments/${id}`, data).then(r => mapRow<Assignment>(r)!)
}

export function deleteAssignment(id: string): Promise<void> {
  return api.del<void>(`/assignments/${id}`)
}

/* ── Submissions ── */
export function listSubmissions(params: { assignmentId?: string; studentId?: string } = {}): Promise<Submission[]> {
  const qs = new URLSearchParams()
  if (params.assignmentId) qs.set('assignmentId', params.assignmentId)
  if (params.studentId) qs.set('studentId', params.studentId)
  return api.get<Record<string, unknown>[]>(`/submissions?${qs}`).then(mapRows<Submission>)
}

export function createSubmission(data: Submission): Promise<Submission> {
  return api.post<Record<string, unknown>>('/submissions', data).then(r => mapRow<Submission>(r)!)
}

export function gradeSubmission(id: string, score: number): Promise<Submission> {
  return api.put<Record<string, unknown>>(`/submissions/${id}/grade`, { score }).then(r => mapRow<Submission>(r)!)
}

/* ── Notifications ── */
export function listNotifications(userId?: string): Promise<Notification[]> {
  const qs = userId ? `?userId=${userId}` : ''
  return api.get<Record<string, unknown>[]>(`/notifications${qs}`).then(mapRows<Notification>)
}

export function createNotification(data: Notification): Promise<Notification> {
  return api.post<Record<string, unknown>>('/notifications', data).then(r => mapRow<Notification>(r)!)
}

export function markNotificationRead(id: string): Promise<void> {
  return api.put<void>(`/notifications/${id}/read`)
}

/* ── Drive Links ── */
export function listDriveLinks(params: { classId?: string; teacherId?: string } = {}): Promise<DriveLink[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  return api.get<Record<string, unknown>[]>(`/drive-links?${qs}`).then(mapRows<DriveLink>)
}

export function createDriveLink(data: DriveLink): Promise<DriveLink> {
  return api.post<Record<string, unknown>>('/drive-links', data).then(r => mapRow<DriveLink>(r)!)
}

export function deleteDriveLink(id: string): Promise<void> {
  return api.del<void>(`/drive-links/${id}`)
}

/* ── Seat Plans ── */
export function getSeatPlan(classId: string): Promise<SeatPlan | null> {
  return api.get<Record<string, unknown> | null>(`/seat-plans/${classId}`).then(mapRow<SeatPlan>)
}

export function saveSeatPlan(classId: string, data: SeatPlan): Promise<SeatPlan> {
  return api.put<Record<string, unknown>>(`/seat-plans/${classId}`, data).then(r => mapRow<SeatPlan>(r)!)
}

/* ── Grade Releases ── */
export function listGradeReleases(params: { classId?: string; teacherId?: string } = {}): Promise<GradeRelease[]> {
  const qs = new URLSearchParams()
  if (params.classId) qs.set('classId', params.classId)
  if (params.teacherId) qs.set('teacherId', params.teacherId)
  return api.get<Record<string, unknown>[]>(`/grade-releases?${qs}`).then(mapRows<GradeRelease>)
}

export function saveGradeRelease(data: GradeRelease): Promise<GradeRelease> {
  return api.post<Record<string, unknown>>('/grade-releases', data).then(r => mapRow<GradeRelease>(r)!)
}

/* ── Audit Logs ── */
export function listAuditLogs(schoolId?: string): Promise<AuditLog[]> {
  const qs = schoolId ? `?schoolId=${schoolId}` : ''
  return api.get<Record<string, unknown>[]>(`/audit-logs${qs}`).then(mapRows<AuditLog>)
}

export function createAuditLog(
  userId: string,
  userEmail: string,
  action: AuditLog['action'],
  collection: string,
  documentId: string,
  details: string,
  schoolId?: string,
): Promise<void> {
  return api.post<void>('/audit-logs', {
    userId,
    userEmail: userEmail || '',
    action,
    collection,
    documentId: documentId || '',
    details,
    schoolId,
  })
}
