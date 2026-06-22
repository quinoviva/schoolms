import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence, collection, CollectionReference } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import type { School, AppUser, AcademicTerm, Subject, Class, Enrollment, GradeScore, AttendanceRecord, Announcement, Assignment, Submission, Notification, Section, AuditLog, GradeRelease, DriveLink, SeatPlan } from '../types/index.js'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const functions = getFunctions(app)
export const storage = getStorage(app)

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence disabled: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence disabled: browser does not support IndexedDB')
  }
})

// Collection references
export const schoolsCol = collection(db, 'schools') as CollectionReference<School>
export const usersCol = collection(db, 'users') as CollectionReference<AppUser>
export const termsCol = collection(db, 'terms') as CollectionReference<AcademicTerm>
export const subjectsCol = collection(db, 'subjects') as CollectionReference<Subject>
export const classesCol = collection(db, 'classes') as CollectionReference<Class>
export const enrollmentsCol = collection(db, 'enrollments') as CollectionReference<Enrollment>
export const gradesCol = collection(db, 'grades') as CollectionReference<GradeScore>
export const attendanceCol = collection(db, 'attendance') as CollectionReference<AttendanceRecord>
export const announcementsCol = collection(db, 'announcements') as CollectionReference<Announcement>
export const assignmentsCol = collection(db, 'assignments') as CollectionReference<Assignment>
export const submissionsCol = collection(db, 'submissions') as CollectionReference<Submission>
export const notificationsCol = collection(db, 'notifications') as CollectionReference<Notification>
export const sectionsCol = collection(db, 'sections') as CollectionReference<Section>
export const auditLogsCol = collection(db, 'auditLogs') as CollectionReference<AuditLog>
export const gradeReleasesCol = collection(db, 'gradeReleases') as CollectionReference<GradeRelease>
export const driveLinksCol = collection(db, 'driveLinks') as CollectionReference<DriveLink>
export const materialsCol = collection(db, 'materials') as CollectionReference<DriveLink>
export const seatPlansCol = collection(db, 'seatPlans') as CollectionReference<SeatPlan>
