import { useEffect, useState, useRef, useCallback } from 'react'
import { listClasses, listSubjects, listEnrollments, getUser, listGrades, batchSaveGrades, listGradeReleases, saveGradeRelease, createAuditLog, transmute, getGradeDescriptor, type AppUser, type Class, type Subject, type GradeScore, type GradingComponent } from '@academix/shared'
import Spinner from '../../components/ui/Spinner'
import { showToast } from '../../components/ui/toast'
import { createNotification } from '../../utils/notifications'

export default function GradeEntry({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [components, setComponents] = useState<GradingComponent[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, { score: string; maxScore: string }>>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const studentsRef = useRef<{ id: string; name: string }[]>([])
  const [isReleased, setIsReleased] = useState(false)
  const gradeReleaseDocId = useRef<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      const classesData = await listClasses({ teacherId: user.id, schoolId })
      const subjects = await listSubjects({ schoolId })
      const result = classesData
        .map(c => {
          const subject = subjects.find(s => s.id === c.subjectId)
          return subject ? { ...c, subject } as Class & { subject: Subject } : null
        })
        .filter(Boolean) as (Class & { subject: Subject })[]
      if (cancelled) return
      setClasses(result)
      if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return
    setComponents(cls.subject.gradingComponents)

    let cancelled = false
    async function load() {
      const enrollData = await listEnrollments({ classId: selectedClassId })
      const studentIds = enrollData.map(e => e.studentId)
      const users = (await Promise.all(studentIds.map(id => getUser(id)))).filter(Boolean) as AppUser[]
      const stuList = studentIds
        .map(id => {
          const u = users.find(uu => uu.id === id)
          return u ? { id: u.id, name: u.name } : null
        })
        .filter(Boolean) as { id: string; name: string }[]
      if (cancelled) return
      setStudents(stuList)
      studentsRef.current = stuList
    }
    load()
    return () => { cancelled = true }
  }, [selectedClassId, classes])

  useEffect(() => {
    if (!selectedClassId) return
    let cancelled = false
    async function load() {
      const existingScores = await listGrades({ classId: selectedClassId })
      const initScores: Record<string, Record<string, { score: string; maxScore: string }>> = {}
      for (const s of studentsRef.current) {
        initScores[s.id] = {}
        for (const comp of components) {
          const match = existingScores.find(es => es.studentId === s.id && es.componentId === comp.id)
          initScores[s.id][comp.id] = match
            ? { score: String(match.score), maxScore: String(match.maxScore) }
            : { score: '', maxScore: '' }
        }
      }
      if (!cancelled) setScores(initScores)
    }
    load()
    return () => { cancelled = true }
  }, [selectedClassId, components])

  useEffect(() => {
    if (!selectedClassId) return
    let cancelled = false
    async function load() {
      const releases = await listGradeReleases({ classId: selectedClassId })
      if (releases.length > 0) {
        const data = releases[0]
        setIsReleased(data.isReleased)
        gradeReleaseDocId.current = data.id
      } else {
        setIsReleased(false)
        gradeReleaseDocId.current = null
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedClassId])

  const autoSave = useCallback(async () => {
    if (!selectedClassId || !dirty) return
    setSaving(true)
    try {
      const existingGrades = await listGrades({ classId: selectedClassId })
      const newSet = new Set<string>()
      const toSave: GradeScore[] = []

      for (const student of students) {
        for (const comp of components) {
          const cell = scores[student.id]?.[comp.id]
          const scoreVal = parseFloat(cell?.score || '0')
          const maxVal = parseFloat(cell?.maxScore || '0')
          if (isNaN(scoreVal) || isNaN(maxVal) || maxVal <= 0) continue
          const found = existingGrades.find(eg => eg.studentId === student.id && eg.componentId === comp.id)
          if (found) {
            toSave.push({ ...found, score: scoreVal >= 0 ? scoreVal : 0, maxScore: maxVal })
            newSet.add(found.id)
          } else {
            toSave.push({
              id: crypto.randomUUID(),
              studentId: student.id,
              classId: selectedClassId,
              componentId: comp.id,
              score: scoreVal >= 0 ? scoreVal : 0,
              maxScore: maxVal,
              schoolId,
            })
            newSet.add(toSave[toSave.length - 1].id)
          }
        }
      }
      existingGrades.filter(eg => !newSet.has(eg.id)).forEach(eg => {
        toSave.push({ ...eg, score: 0, maxScore: 100 })
      })

      await batchSaveGrades(toSave)
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

  function updateScore(studentId: string, componentId: string, field: 'score' | 'maxScore', value: string) {
    setScores(prev => {
      const prevCell = prev[studentId]?.[componentId] || { score: '', maxScore: '' }
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [componentId]: { ...prevCell, [field]: value },
        },
      }
    })
    setDirty(true)
  }

  function calcFinal(studentId: string): { initial: number; transmuted: number; descriptor: string } {
    let total = 0
    for (const comp of components) {
      const cell = scores[studentId]?.[comp.id]
      const scoreVal = parseFloat(cell?.score || '0')
      const maxVal = parseFloat(cell?.maxScore || '0')
      if (isNaN(scoreVal) || isNaN(maxVal) || maxVal <= 0) continue
      total += (scoreVal / maxVal) * 100 * (comp.weight / 100)
    }
    const initial = Math.round(total)
    const t = transmute(initial)
    return { initial, transmuted: t, descriptor: getGradeDescriptor(t) }
  }

  async function handleSaveAll() {
    if (!selectedClassId) return
    setSaving(true)
    try {
      const existingGrades = await listGrades({ classId: selectedClassId })
      const newSet = new Set<string>()
      const toSave: GradeScore[] = []

      for (const student of students) {
        for (const comp of components) {
          const cell = scores[student.id]?.[comp.id]
          const scoreVal = parseFloat(cell?.score || '0')
          const maxVal = parseFloat(cell?.maxScore || '0')
          if (isNaN(scoreVal) || isNaN(maxVal) || maxVal <= 0) continue
          const found = existingGrades.find(eg => eg.studentId === student.id && eg.componentId === comp.id)
          if (found) {
            toSave.push({ ...found, score: scoreVal >= 0 ? scoreVal : 0, maxScore: maxVal })
            newSet.add(found.id)
          } else {
            toSave.push({
              id: crypto.randomUUID(),
              studentId: student.id,
              classId: selectedClassId,
              componentId: comp.id,
              score: scoreVal >= 0 ? scoreVal : 0,
              maxScore: maxVal,
              schoolId,
            })
            newSet.add(toSave[toSave.length - 1].id)
          }
        }
      }
      existingGrades.filter(eg => !newSet.has(eg.id)).forEach(eg => {
        toSave.push({ ...eg, score: 0, maxScore: 100 })
      })

      await batchSaveGrades(toSave)
      await createAuditLog(user.id, user.email, 'grade', 'grades', selectedClassId, `Saved grades for ${students.length} students`)

      await saveGradeRelease({
        id: gradeReleaseDocId.current || crypto.randomUUID(),
        classId: selectedClassId,
        teacherId: user.id,
        releasedAt: Date.now(),
        isReleased,
        schoolId,
      })

      if (isReleased) {
        for (const student of students) {
          await createNotification(student.id, 'grade_released', 'Your grades have been released.', selectedClassId, schoolId)
        }
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
              <th className="text-left px-3 py-3 font-semibold">Student</th>
              {components.map(comp => (
                <th key={comp.id} colSpan={2} className="px-1 py-3 font-semibold text-center">
                  <div className="text-[0.5rem] uppercase tracking-wider">{comp.name.replace(/\(.*\)/, '').trim()}</div>
                  <div className="font-normal opacity-60">{comp.weight}%</div>
                </th>
              ))}
              <th className="px-2 py-3 font-semibold text-center">Initial</th>
              <th className="px-2 py-3 font-semibold text-center">Transmuted</th>
              <th className="px-2 py-3 font-semibold text-center">Proficiency</th>
            </tr>
            <tr className="bg-[#1e3a5f]/85 text-white/70 text-[0.5rem] uppercase tracking-wider">
              <th></th>
              {components.map(comp => (
                <th key={`h-${comp.id}`} colSpan={2} className="px-1 py-1 font-normal text-center">
                  <span className="inline-block w-10">Score</span>
                  <span className="inline-block w-10">Max</span>
                </th>
              ))}
              <th colSpan={3}></th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const { initial, transmuted: t, descriptor } = calcFinal(s.id)
              return (
                <tr key={s.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2 font-semibold text-foreground text-xs">{s.name}</td>
                  {components.map(comp => {
                    const cell = scores[s.id]?.[comp.id] || { score: '', maxScore: '' }
                    return (
                      <td key={comp.id} colSpan={2} className="px-1 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            value={cell.score}
                            onChange={e => updateScore(s.id, comp.id, 'score', e.target.value)}
                            className="w-10 text-center px-1 py-1 rounded border border-border bg-[#f5f1eb] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-xs font-mono"
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">/</span>
                          <input
                            type="number"
                            min={1}
                            value={cell.maxScore}
                            onChange={e => updateScore(s.id, comp.id, 'maxScore', e.target.value)}
                            className="w-10 text-center px-1 py-1 rounded border border-border bg-[#f5f1eb] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-xs font-mono text-muted-foreground"
                            placeholder="50"
                          />
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center text-xs font-mono">{initial > 0 ? initial : '—'}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${t >= 75 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                      {t > 0 ? t : '—'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-[0.55rem] font-semibold text-muted-foreground max-w-[80px] leading-tight">{descriptor}</td>
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
