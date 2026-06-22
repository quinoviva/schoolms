import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, addDoc, query, where, getDocs, deleteDoc, doc, writeBatch, orderBy, limit, startAfter } from 'firebase/firestore'
import { db, fetchSubjectsByIds, fetchUsersByIds, type Class, type Subject, type AppUser } from '@academix/shared'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { showToast } from '../components/ui/toast'
import { useAuth } from '../contexts/AuthContext'

export default function Enrollments() {
  const { appUser } = useAuth()
  const schoolId = appUser?.schoolId || ''
  const [students, setStudents] = useState<{ id: string; name: string; section: string }[]>([])
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [enrollments, setEnrollments] = useState<{ id?: string; studentId: string; classId: string }[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoaded, setSubjectsLoaded] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [search, setSearch] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{ studentId: string; classId: string; label: string } | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const [pageCursors, setPageCursors] = useState<(any | null)[]>([null])
  const [hasMore, setHasMore] = useState(true)
  const [studentSearch, setStudentSearch] = useState('')
  const [filteredStudents, setFilteredStudents] = useState<{ id: string; name: string; section: string }[]>([])

  useEffect(() => {
    if (!schoolId) return
    const unsubSubjects = onSnapshot(query(collection(db, 'subjects'), where('schoolId', '==', schoolId)), snap => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)))
      setSubjectsLoaded(true)
    })
    return () => unsubSubjects()
  }, [schoolId])

  useEffect(() => {
    if (!schoolId) return
    const unsubClasses = onSnapshot(query(collection(db, 'classes'), where('schoolId', '==', schoolId)), snap => {
      const classData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))
      const clsData: (Class & { subject: Subject })[] = []
      classData.forEach(cls => {
        const subj = subjects.find(s => s.id === cls.subjectId)
        if (subj) clsData.push({ ...cls, subject: subj })
      })
      setClasses(clsData)
    })
    return unsubClasses
  }, [subjects, schoolId])

  useEffect(() => {
    if (!schoolId) return
    async function loadStudents() {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student'), where('schoolId', '==', schoolId), orderBy('name'), limit(500)))
      setStudents(snap.docs.map(d => {
        const u = d.data() as AppUser
        return { id: d.id, name: u.name, section: u.section || '' }
      }))
    }
    loadStudents()
  }, [schoolId])

  useEffect(() => {
    if (!studentSearch) { setFilteredStudents(students); return }
    const q = studentSearch.toLowerCase()
    setFilteredStudents(students.filter(s => s.name.toLowerCase().includes(q)))
  }, [studentSearch, students])

  useEffect(() => {
    if (!schoolId) return
    async function loadEnrollments() {
      setSubjectsLoaded(false)
      const cursor = pageCursors[page - 1] || null
      let q = query(collection(db, 'enrollments'), where('schoolId', '==', schoolId), orderBy('studentId'), limit(PAGE_SIZE))
      if (cursor) q = query(collection(db, 'enrollments'), where('schoolId', '==', schoolId), orderBy('studentId'), startAfter(cursor), limit(PAGE_SIZE))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; studentId: string; classId: string }))
      setEnrollments(data)
      setHasMore(snap.docs.length === PAGE_SIZE)
      const lastDoc = snap.docs[snap.docs.length - 1]
      const newCursors = [...pageCursors]
      newCursors[page] = lastDoc || null
      setPageCursors(newCursors)
      setSubjectsLoaded(true)
    }
    loadEnrollments()
  }, [page, schoolId])

  const loading = !subjectsLoaded

  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    classes.forEach(c => { map[c.id] = `${c.subject.code} — ${c.section}` })
    return map
  }, [classes])

  const studentNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    students.forEach(s => { map[s.id] = s.name })
    return map
  }, [students])

  const filteredEnrollments = useMemo(() => {
    if (!search) return enrollments
    const q = search.toLowerCase()
    return enrollments.filter(e => {
      const sName = studentNameMap[e.studentId] || ''
      const cName = classNameMap[e.classId] || ''
      return sName.toLowerCase().includes(q) || cName.toLowerCase().includes(q)
    })
  }, [enrollments, search, studentNameMap, classNameMap])

  async function handleEnroll() {
    if (!selectedStudent || !selectedClass) return
    const exists = enrollments.some(e => e.studentId === selectedStudent && e.classId === selectedClass)
    if (exists) { showToast('Student already enrolled in this class.', 'error'); return }
    try {
      await addDoc(collection(db, 'enrollments'), { studentId: selectedStudent, classId: selectedClass, schoolId })
      showToast('Student enrolled successfully', 'success')
      setSelectedStudent('')
      setSelectedClass('')
    } catch {
      showToast('Failed to enroll student', 'error')
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    const { studentId, classId } = removeTarget
    try {
      const found = enrollments.find(e => e.studentId === studentId && e.classId === classId)
      if (found?.id) {
        await deleteDoc(doc(db, 'enrollments', found.id))
      } else {
        const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId), where('classId', '==', classId), where('schoolId', '==', schoolId))
        const snap = await getDocs(q)
        snap.docs.forEach(d => deleteDoc(doc(db, 'enrollments', d.id)))
      }

      const [gradesSnap, attSnap] = await Promise.all([
        getDocs(query(collection(db, 'grades'), where('studentId', '==', studentId), where('classId', '==', classId), where('schoolId', '==', schoolId))),
        getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId), where('classId', '==', classId), where('schoolId', '==', schoolId))),
      ])
      const batch = writeBatch(db)
      gradesSnap.docs.forEach(d => batch.delete(doc(db, 'grades', d.id)))
      attSnap.docs.forEach(d => batch.delete(doc(db, 'attendance', d.id)))
      await batch.commit()

      showToast('Enrollment removed', 'success')
    } catch {
      showToast('Failed to remove enrollment', 'error')
    }
    setRemoveTarget(null)
  }

  if (loading) return <Spinner text="Loading enrollments..." />

  return (
    <div>
      <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight mb-1">
        Enrollments
      </h1>
      <p className="text-sm text-muted-foreground mb-7">Enroll students in classes</p>

      <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-8">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Student</label>
            <input type="text" placeholder="Search student..." value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); setSelectedStudent('') }}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 min-w-[200px]" />
            {studentSearch && filteredStudents.length > 0 && (
              <div className="absolute z-50 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[250px]">
                {filteredStudents.slice(0, 50).map(s => (
                  <button key={s.id} type="button" onClick={() => { setSelectedStudent(s.id); setStudentSearch(s.name) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary/50 transition-colors ${selectedStudent === s.id ? 'bg-[#1e3a5f]/10 font-semibold' : ''}`}>
                    {s.name} <span className="text-muted-foreground">({s.section || 'No section'})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 min-w-[200px]">
              <option value="">Select class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject.code} — {c.section}</option>)}
            </select>
          </div>
          <button onClick={handleEnroll} disabled={!selectedStudent || !selectedClass}
            className="px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50">
            Enroll
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-secondary/20">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search by student or class..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground" />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-secondary/10">
              <th className="text-left px-5 py-3 font-semibold">Student</th>
              <th className="text-left px-4 py-3 font-semibold">Class</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEnrollments.map((e, i) => {
              const student = students.find(s => s.id === e.studentId)
              const cls = classes.find(c => c.id === e.classId)
              const label = `${student?.name || 'Unknown'} in ${cls ? `${cls.subject.code} — ${cls.section}` : 'Unknown'}`
              return (
                <tr key={`${e.studentId}-${e.classId}-${i}`} className="border-b border-border/50 hover:bg-secondary/15 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-foreground">{student?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{student?.section || ''}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {cls ? `${cls.subject.code} — ${cls.section}` : 'Unknown'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => setRemoveTarget({ studentId: e.studentId, classId: e.classId, label })}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded hover:bg-red-50 transition-colors">
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-secondary/30 text-xs text-muted-foreground flex items-center justify-between">
          <span>{filteredEnrollments.length} enrollments (page {page})</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
              className="p-1 rounded hover:bg-secondary disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Enrollment"
        message={`Are you sure you want to remove ${removeTarget?.label || 'this enrollment'}?`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
