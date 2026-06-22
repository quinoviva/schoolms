import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore'
import { Edit2, Plus, BookOpen, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { db, fetchUsersByIds, sanitizeString, createAuditLog, type AppUser, type Class, type Subject, type AcademicTerm } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { showToast } from '../../components/ui/toast'

export default function TeacherClasses({ user, onNav }: { user: AppUser; onNav?: (p: string) => void }) {
  const schoolId = user.schoolId || ''
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)

  const [createTarget, setCreateTarget] = useState<Subject | null>(null)
  const [form, setForm] = useState({ section: '', schedule: '', room: '' })
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')

  const [editClass, setEditClass] = useState<Class | null>(null)
  const [editSchedule, setEditSchedule] = useState('')
  const [editRoom, setEditRoom] = useState('')

  const [studentsByClass, setStudentsByClass] = useState<Record<string, { id: string; name: string }[]>>({})
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  useEffect(() => {
    getDocs(query(collection(db, 'terms'), where('schoolId', '==', schoolId))).then(termSnap => {
      setTerms(termSnap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicTerm)))
    })
  }, [schoolId])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'subjects'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      (snap) => {
        setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)))
      }
    )
    return unsub
  }, [user, schoolId])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      (snap) => {
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)))
      }
    )
    return unsub
  }, [user, schoolId])

  useEffect(() => {
    if (!classes.length) { setStudentsByClass({}); return }
    const classIds = classes.map(c => c.id)
    const unsubs = classIds.map(classId =>
      onSnapshot(
        query(collection(db, 'enrollments'), where('classId', '==', classId)),
        async (snap) => {
          const studentIds = snap.docs.map(d => d.data().studentId)
          if (!studentIds.length) { setStudentsByClass(prev => ({ ...prev, [classId]: [] })); return }
          const userMap = await fetchUsersByIds(studentIds)
          const result = studentIds
            .map(id => {
              const user = userMap.get(id)
              return user ? { id, name: user.name } : null
            })
            .filter(Boolean) as { id: string; name: string }[]
          setStudentsByClass(prev => ({ ...prev, [classId]: result }))
        }
      )
    )
    return () => unsubs.forEach(u => u())
  }, [classes])

  useEffect(() => {
    if (subjects.length > 0 || classes.length > 0) setLoading(false)
  }, [subjects, classes])

  function getClassForSubject(subjectId: string) {
    return classes.find(c => c.subjectId === subjectId)
  }

  function getTermLabel(termId: string) {
    return terms.find(t => t.id === termId)?.label || '�'
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !createTarget) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'classes'), {
        subjectId: createTarget.id,
        section: sanitizeString(form.section, 50),
        teacherId: user.id,
        schedule: sanitizeString(form.schedule, 100),
        room: sanitizeString(form.room, 50),
        termId: createTarget.termId,
        schoolId,
        createdAt: Date.now(),
      } satisfies Omit<Class, 'id'>)
      setForm({ section: '', schedule: '', room: '' })
      setCreateTarget(null)
      showToast('Class created!', 'success')
      await createAuditLog(user.id, user.email, 'create', 'classes', createTarget.id, `Created class for ${sanitizeString(form.section, 50)}`)
    } catch (err) {
      console.error(err)
      showToast('Failed to create class.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openEditClass(cls: Class) {
    setEditClass(cls)
    setEditSchedule(cls.schedule)
    setEditRoom(cls.room)
  }

  async function handleSaveEditClass() {
    if (!editClass) return
    try {
      await updateDoc(doc(db, 'classes', editClass.id), {
        schedule: sanitizeString(editSchedule, 100),
        room: sanitizeString(editRoom, 50),
      } satisfies Partial<Class>)
      showToast('Class updated!', 'success')
      await createAuditLog(user.id, user.email, 'update', 'classes', editClass.id, 'Updated class schedule/room')
      setEditClass(null)
    } catch (err) {
      console.error(err)
      showToast('Failed to update class.', 'error')
    }
  }

  const q = search.toLowerCase().trim()

  const filteredSubjects = subjects.filter(s => {
    if (!q) return true
    const cls = getClassForSubject(s.id)
    return s.code.toLowerCase().includes(q)
      || s.title.toLowerCase().includes(q)
      || (cls?.section.toLowerCase().includes(q))
      || (cls?.schedule.toLowerCase().includes(q))
      || (cls?.room.toLowerCase().includes(q))
  })

  const grouped = filteredSubjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const level = s.gradeLevel || 'Ungrouped'
    if (!acc[level]) acc[level] = []
    acc[level].push(s)
    return acc
  }, {})

  const sortedLevels = Object.keys(grouped).sort()

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">My Classes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{user?.name}</p>
      </div>

      <div className="relative mb-6">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by subject code, title, section, schedule, or room..."
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No subjects assigned yet. Contact the admin.</p>
        </div>
      ) : filteredSubjects.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No classes match your search.</p>
        </div>
      )}

      {sortedLevels.map(level => (
        <div key={level} className="mb-8">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] text-xs">{level}</span>
            <span className="text-xs text-muted-foreground font-normal">{grouped[level].length} subjects</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped[level].map(subj => {
              const cls = getClassForSubject(subj.id)
              return (
                <div key={subj.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono px-2 py-1 rounded-md bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold">{subj.code}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">{getTermLabel(subj.termId)}</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{subj.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {subj.gradingComponents.map(comp => (
                      <span key={comp.id} className="text-[0.65rem] px-2 py-0.5 rounded-full bg-[#1e3a5f]/8 text-[#1e3a5f]">
                        {comp.name} {comp.weight}%
                      </span>
                    ))}
                  </div>
                  {cls ? (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-sm text-[#8b6914] font-semibold">{cls.section}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>??</span> {cls.schedule}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>?? {cls.room}</span>
                        <button
                          onClick={() => openEditClass(cls!)}
                          className="text-[#1e3a5f] hover:text-[#16304f] flex items-center gap-1 transition-colors"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                      </div>
                      {onNav && (
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => onNav('reportcards')}
                            className="text-[0.6rem] px-2 py-1 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold hover:bg-[#1e3a5f]/15 transition-colors">
                            Report Cards
                          </button>
                          <button onClick={() => onNav('classsheets')}
                            className="text-[0.6rem] px-2 py-1 rounded bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold hover:bg-[#1e3a5f]/15 transition-colors">
                            Class Sheets
                          </button>
                        </div>
                      )}
                      <div className="pt-1">
                        <button
                          onClick={() => setExpandedClass(expandedClass === cls.id ? null : cls.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#1e3a5f] transition-colors"
                        >
                          {expandedClass === cls.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          <Users size={11} />
                          <span>{(studentsByClass[cls.id] || []).length} students</span>
                        </button>
                        {expandedClass === cls.id && (
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {(studentsByClass[cls.id] || []).length === 0 ? (
                              <p className="text-[0.65rem] text-muted-foreground italic">No students enrolled yet.</p>
                            ) : (
                              studentsByClass[cls.id].map(s => (
                                <div key={s.id} className="flex items-center gap-2 text-xs text-foreground bg-secondary/30 px-2 py-1 rounded">
                                  <span className="w-5 h-5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-[0.55rem] flex items-center justify-center font-semibold shrink-0">
                                    {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </span>
                                  {s.name}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreateTarget(subj)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:text-[#1e3a5f] hover:border-[#1e3a5f]/30 transition-colors font-semibold"
                    >
                      <Plus size={14} /> Create Class
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {createTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setCreateTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg mb-1">Create Class</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {createTarget.code} � {createTarget.title}
            </p>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Section</label>
                <input
                  required value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                  placeholder="e.g., 11-A (Grace)"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Schedule</label>
                <input
                  required value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  placeholder="e.g., MWF 7:30-8:30 AM"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Room</label>
                <input
                  required value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                  placeholder="e.g., Room 201"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCreateTarget(null); setForm({ section: '', schedule: '', room: '' }) }}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditClass(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground text-lg mb-4">Edit Class Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Schedule</label>
                <input
                  value={editSchedule}
                  onChange={e => setEditSchedule(e.target.value)}
                  placeholder="e.g., MWF 7:30-8:30 AM"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Room</label>
                <input
                  value={editRoom}
                  onChange={e => setEditRoom(e.target.value)}
                  placeholder="e.g., Room 201"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditClass(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditClass}
                className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
