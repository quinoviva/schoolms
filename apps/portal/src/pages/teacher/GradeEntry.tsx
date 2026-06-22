import { useEffect, useState, useRef, useCallback } from 'react'
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore'
import { db, fetchUsersByIds, mergeClassesWithSubjects, sanitizeNumber, createAuditLog, type AppUser, type Class, type Subject, type GradeScore, type GradingComponent, type GradeRelease } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { showToast } from '../../components/ui/toast'
import { createNotification } from '../../utils/notifications'

export default function GradeEntry({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [components, setComponents] = useState<GradingComponent[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const studentsRef = useRef<{ id: string; name: string }[]>([])
  const [isReleased, setIsReleased] = useState(false)
  const gradeReleaseDocId = useRef<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const result = await mergeClassesWithSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)))
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return
    setComponents(cls.subject.gradingComponents)

    const unsubEnroll = onSnapshot(
      query(collection(db, 'enrollments'), where('classId', '==', selectedClassId)),
      async (snap) => {
        const studentIds = snap.docs.map(d => d.data().studentId)
        const userMap = await fetchUsersByIds(studentIds)
        const stuList = studentIds
          .map(id => {
            const user = userMap.get(id)
            return user ? { id, name: user.name } : null
          })
          .filter(Boolean) as { id: string; name: string }[]
        setStudents(stuList)
        studentsRef.current = stuList
      }
    )

    return unsubEnroll
  }, [selectedClassId, classes])

  useEffect(() => {
    if (!selectedClassId) return
    const unsubGrades = onSnapshot(
      query(collection(db, 'grades'), where('classId', '==', selectedClassId)),
      (snap) => {
        const existingScores = snap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore))
        const initScores: Record<string, Record<string, string>> = {}
        for (const s of studentsRef.current) {
          initScores[s.id] = {}
          for (const comp of components) {
            const match = existingScores.find(es => es.studentId === s.id && es.componentId === comp.id)
            initScores[s.id][comp.id] = match ? String(match.score) : ''
          }
        }
        setScores(initScores)
      }
    )
    return unsubGrades
  }, [selectedClassId, components])

  useEffect(() => {
    if (!selectedClassId) return
    const unsub = onSnapshot(
      query(collection(db, 'gradeReleases'), where('classId', '==', selectedClassId)),
      (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data() as GradeRelease
          setIsReleased(data.isReleased)
          gradeReleaseDocId.current = snap.docs[0].id
        } else {
          setIsReleased(false)
          gradeReleaseDocId.current = null
        }
      }
    )
    return unsub
  }, [selectedClassId])

  const autoSave = useCallback(async () => {
    if (!selectedClassId || !dirty) return
    setSaving(true)
    try {
      const existingSnap = await getDocs(query(collection(db, 'grades'), where('classId', '==', selectedClassId)))
      const existingGrades = existingSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore))
      const batch = writeBatch(db)
      const newSet = new Set<string>()

      for (const student of students) {
        for (const comp of components) {
          const raw = parseFloat(scores[student.id]?.[comp.id] || '0')
          const val = sanitizeNumber(raw, 0, 100)
          if (isNaN(val) || val < 0) continue
          const found = existingGrades.find(eg => eg.studentId === student.id && eg.componentId === comp.id)
          if (found) {
            if (found.score !== val) {
              batch.update(doc(db, 'grades', found.id), { score: val })
            }
            newSet.add(found.id)
          } else {
            const ref = doc(collection(db, 'grades'))
            batch.set(ref, { studentId: student.id, classId: selectedClassId, componentId: comp.id, score: val, maxScore: 100, schoolId } satisfies Omit<GradeScore, 'id'>)
            newSet.add(ref.id)
          }
        }
      }
      existingGrades.filter(eg => !newSet.has(eg.id)).forEach(eg => batch.delete(doc(db, 'grades', eg.id)))
      await batch.commit()
      await createAuditLog(user.id, user.email, 'grade', 'grades', selectedClassId, 'Auto-saved grades').catch(console.error)
      setDirty(false)
    } catch (err) { console.error('Auto-save failed:', err); showToast('Auto-save failed. Changes will be retried.', 'error') } finally { setSaving(false) }
  }, [selectedClassId, students, components, scores, dirty, schoolId])

  useEffect(() => {
    if (!dirty) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(autoSave, 3000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [dirty, autoSave])

  function updateScore(studentId: string, componentId: string, value: string) {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [componentId]: value },
    }))
    setDirty(true)
  }

  function calcFinal(studentId: string): number {
    let total = 0
    for (const comp of components) {
      const val = parseFloat(scores[studentId]?.[comp.id] || '0')
      total += val * (comp.weight / 100)
    }
    return Math.round(total)
  }

  async function handleSaveAll() {
    if (!selectedClassId) return
    setSaving(true)
    try {
      const existingSnap = await getDocs(query(collection(db, 'grades'), where('classId', '==', selectedClassId)))
      const existingGrades = existingSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeScore))
      const batch = writeBatch(db)
      const newSet = new Set<string>()

      for (const student of students) {
        for (const comp of components) {
          const raw = parseFloat(scores[student.id]?.[comp.id] || '0')
          const val = sanitizeNumber(raw, 0, 100)
          if (isNaN(val) || val < 0) continue
          const found = existingGrades.find(eg => eg.studentId === student.id && eg.componentId === comp.id)
          if (found) {
            if (found.score !== val) {
              batch.update(doc(db, 'grades', found.id), { score: val })
            }
            newSet.add(found.id)
          } else {
            const ref = doc(collection(db, 'grades'))
            batch.set(ref, {
              studentId: student.id,
              classId: selectedClassId,
              componentId: comp.id,
              score: val,
              maxScore: 100,
              schoolId,
            } satisfies Omit<GradeScore, 'id'>)
            newSet.add(ref.id)
          }
        }
      }

      existingGrades.filter(eg => !newSet.has(eg.id)).forEach(eg => {
        batch.delete(doc(db, 'grades', eg.id))
      })

      await batch.commit()
      await createAuditLog(user.id, user.email, 'grade', 'grades', selectedClassId, `Saved grades for ${students.length} students`)

      if (isReleased) {
        const ref = gradeReleaseDocId.current
          ? doc(db, 'gradeReleases', gradeReleaseDocId.current)
          : doc(collection(db, 'gradeReleases'))
        await setDoc(ref, {
          classId: selectedClassId,
          teacherId: user.id,
          releasedAt: Date.now(),
          isReleased: true,
          schoolId,
        } satisfies Omit<GradeRelease, 'id'>)
        for (const student of students) {
          await createNotification(student.id, 'grade_released', 'Your grades have been released.', selectedClassId, schoolId)
        }
      } else if (gradeReleaseDocId.current) {
        await setDoc(doc(db, 'gradeReleases', gradeReleaseDocId.current), {
          classId: selectedClassId,
          teacherId: user.id,
          releasedAt: Date.now(),
          isReleased: false,
          schoolId,
        } satisfies Omit<GradeRelease, 'id'>)
      }

      showToast('Grades saved successfully!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to save grades.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const selectedClass = classes.find(c => c.id === selectedClassId)

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Grade Entry
          </h1>
          {selectedClass && (
            <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} · {selectedClass.section}</p>
          )}
        </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isReleased}
                onChange={e => setIsReleased(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-[#1e3a5f]"
              />
              <span className="text-foreground font-medium">Release grades to students</span>
            </label>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save All Grades'}
            </button>
          </div>
      </div>

      <div className="mb-5">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25"
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.subject.code} — {c.section}</option>
          ))}
        </select>
      </div>

      {selectedClass && (
        <div className="mb-5 flex flex-wrap gap-2">
          {selectedClass.subject.gradingComponents.map(comp => (
            <span key={comp.id} className="text-xs px-3 py-1.5 rounded-full bg-[#1e3a5f]/8 text-[#1e3a5f] font-semibold">
              {comp.name} ({comp.weight}%)
            </span>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-[#1e3a5f] text-white text-xs">
              <th className="text-left px-5 py-3.5 font-semibold">Student</th>
              {components.map(comp => (
                <th key={comp.id} className="px-3 py-3.5 font-semibold text-center">
                  {comp.name}<br /><span className="font-normal opacity-60">{comp.weight}%</span>
                </th>
              ))}
              <th className="px-3 py-3.5 font-semibold text-center">Final</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const final = calcFinal(s.id)
              return (
                <tr key={s.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-3 font-semibold text-foreground">{s.name}</td>
                  {components.map(comp => (
                    <td key={comp.id} className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min={0} max={100}
                        value={scores[s.id]?.[comp.id] || ''}
                        onChange={e => updateScore(s.id, comp.id, e.target.value)}
                        className="w-16 text-center px-2 py-1.5 rounded-lg border border-border bg-[#f5f1eb] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm font-mono"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold px-2.5 py-0.5 rounded text-sm ${final >= 75 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                      {final || '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No students enrolled in this class yet.
          </div>
        )}
      </div>
    </div>
  )
}
