import { useEffect, useState, useRef } from 'react'
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { BookOpen, CheckCircle2, Clock, FileText, Upload, Download, Paperclip } from 'lucide-react'
import { db, storage, fetchDocsByIds, fetchSubjectsByIds, fetchUsersByIds, mergeClassesWithSubjects, sanitizeString, sanitizeNumber, createAuditLog, type AppUser, type Assignment, type Submission, type Class, type Subject, type Enrollment } from '@academix/shared'
import Spinner from '../components/ui/Spinner'
import { showToast } from '../components/ui/toast'

export default function Assignments({ user }: { user: AppUser }) {
  const schoolId = user.schoolId || ''
  const [teacherClasses, setTeacherClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [saving, setSaving] = useState(false)

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<{ studentId: string; studentName: string; submission: Submission | null }[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null)

  useEffect(() => {
    if (user.role !== 'teacher') return
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const result = await mergeClassesWithSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)))
        setTeacherClasses(result)
      }
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedClassId) { setAssignments([]); setLoading(false); return }
    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, 'assignments'), where('classId', '==', selectedClassId)),
      (snap) => {
        setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)))
        setLoading(false)
      }
    )
    return unsub
  }, [selectedClassId])

  async function loadSubmissionDetails(assignment: Assignment) {
    setSelectedAssignment(assignment)
    setLoadingDetails(true)
    const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', assignment.classId)))
    const enrollments = enrollSnap.docs.map(d => d.data() as Enrollment)
    const studentIds = enrollments.map(e => e.studentId)

    const [userMap, subSnap] = await Promise.all([
      fetchUsersByIds(studentIds),
      getDocs(query(collection(db, 'submissions'), where('assignmentId', '==', assignment.id))),
    ])
    const subMap = new Map<string, Submission>(subSnap.docs.map(d => [d.data().studentId, { id: d.id, ...d.data() } as Submission]))

    const students = enrollments.map(e => ({
      studentId: e.studentId,
      studentName: userMap.get(e.studentId)?.name || 'Unknown',
      submission: subMap.get(e.studentId) ?? null,
    }))
    setSubmissionDetails(students)
    setLoadingDetails(false)
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !dueDate || !maxScore || !selectedClassId) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'assignments'), {
        classId: selectedClassId,
        teacherId: user.id,
        title: sanitizeString(title, 200),
        description: sanitizeString(description, 5000),
        dueDate,
        maxScore: sanitizeNumber(maxScore, 1, 1000),
        schoolId,
        createdAt: Date.now(),
      } satisfies Omit<Assignment, 'id'>)
      setTitle('')
      setDescription('')
      setDueDate('')
      setMaxScore('')
      setShowForm(false)
      showToast('Assignment created!', 'success')
      await createAuditLog(user.id, user.email, 'create', 'assignments', selectedClassId, `Created assignment: ${sanitizeString(title, 100)}`)
    } catch {
      showToast('Failed to create assignment.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitWithFile(assignmentId: string, file?: File) {
    if (!submissionText.trim() && !file) return
    setSubmittingId(assignmentId)
    try {
      let fileUrl = ''
      let fileName = ''
      if (file) {
        const storageRef = ref(storage, `submissions/${assignmentId}/${user.id}/${file.name}`)
        await uploadBytes(storageRef, file)
        fileUrl = await getDownloadURL(storageRef)
        fileName = file.name
      }
      await addDoc(collection(db, 'submissions'), {
        assignmentId,
        studentId: user.id,
        fileUrl: sanitizeString(fileUrl, 500),
        fileName: sanitizeString(fileName, 200),
        score: null,
        schoolId,
        submittedAt: Date.now(),
        gradedAt: null,
      } satisfies Omit<Submission, 'id'>)
      setSubmissionText('')
      setSubmittingId(null)
      showToast('Assignment submitted!', 'success')
    } catch {
      showToast('Failed to submit assignment.', 'error')
      setSubmittingId(null)
    }
  }

  async function handleGradeSubmission(submissionId: string, score: number) {
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { score: sanitizeNumber(score, 0, 1000), gradedAt: Date.now() })
      showToast('Submission graded!', 'success')
      await createAuditLog(user.id, user.email, 'grade', 'submissions', submissionId, `Graded submission with score ${sanitizeNumber(score, 0, 1000)}`)
    } catch {
      showToast('Failed to grade submission.', 'error')
    }
  }

  if (user.role === 'teacher') {
    return (
      <div>
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
              Assignments
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {teacherClasses.length > 0 && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
              >
                {showForm ? 'Cancel' : '+ New Assignment'}
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-foreground mb-1">Select Class</label>
          <select
            value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
          >
            <option value="">Choose a class...</option>
            {teacherClasses.map(c => (
              <option key={c.id} value={c.id}>{c.subject.code} — {c.section}</option>
            ))}
          </select>
        </div>

        {user.role === 'teacher' && showForm && selectedClassId && (
          <form onSubmit={handleCreateAssignment} className="bg-card rounded-xl border border-border p-6 shadow-sm mb-8 space-y-4">
            <h2 className="font-bold text-foreground text-lg">
              New Assignment
            </h2>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Title</label>
              <input
                required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Assignment title"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Description</label>
              <textarea
                required value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the assignment..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm resize-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Due Date</label>
                <input
                  required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Max Score</label>
                <input
                  required type="number" min={1} value={maxScore} onChange={e => setMaxScore(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? 'Creating...' : 'Create Assignment'}
            </button>
          </form>
        )}

        {loading && <Spinner />}

        {!loading && selectedClassId && assignments.length === 0 && (
          <p className="text-muted-foreground text-sm">No assignments yet for this class.</p>
        )}

        {!selectedClassId && (
          <p className="text-muted-foreground text-sm">Select a class to view its assignments.</p>
        )}

        <div className="space-y-4">
          {assignments.map(a => (
            <div
              key={a.id}
              className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadSubmissionDetails(a)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-[#c4a32a]/10 text-[#8b6914]">
                  <BookOpen size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-foreground text-base">
                      {a.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      Max: {a.maxScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setSelectedAssignment(null); setSubmissionDetails([]) }}>
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground text-lg mb-1">
                {selectedAssignment.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{selectedAssignment.description}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Due: {new Date(selectedAssignment.dueDate).toLocaleDateString()} &middot; Max score: {selectedAssignment.maxScore}
              </p>

              <h4 className="font-semibold text-foreground text-sm mb-3">Student Submissions</h4>
              {loadingDetails ? (
                <Spinner text="Loading submissions..." />
              ) : (
                <div className="space-y-2">
                  {submissionDetails.map(s => (
                    <div key={s.studentId} className="flex flex-col bg-secondary/40 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{s.studentName}</span>
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${s.submission ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {s.submission ? (
                            <><CheckCircle2 size={13} /> {s.submission.score !== null ? `Score: ${s.submission.score}` : 'Pending grading'}</>
                          ) : (
                            <><Clock size={13} /> Pending</>
                          )}
                        </span>
                      </div>
                      {s.submission?.fileUrl && (
                        <a href={s.submission.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#1e3a5f] hover:text-[#8b6914] mt-1 flex items-center gap-1">
                          <Download size={11} /> {s.submission.fileName || 'Download file'}
                        </a>
                      )}
                      {s.submission && s.submission.score === null && (() => {
                        const sub = s.submission
                        return (
                          <div className="flex items-center gap-2 mt-2">
                            <input type="number" min={0} max={selectedAssignment.maxScore}
                              placeholder="Score"
                              value={gradingScores[sub.id] || ''}
                              onChange={e => setGradingScores(p => ({ ...p, [sub.id]: e.target.value }))}
                              className="w-20 px-2 py-1 rounded border border-border text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/25" />
                            <button onClick={() => {
                              const score = parseInt(gradingScores[sub.id] || '0')
                              if (!isNaN(score)) handleGradeSubmission(sub.id, score)
                            }}
                              className="text-xs px-2.5 py-1 rounded bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors">
                              Grade
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => { setSelectedAssignment(null); setSubmissionDetails([]) }}
                  className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Assignments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.name}</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-foreground mb-1">Select Class</label>
        <StudentClassSelector user={user} selectedClassId={selectedClassId} onSelect={setSelectedClassId} />
      </div>

      {!selectedClassId && (
        <p className="text-muted-foreground text-sm">Select a class to view assignments.</p>
      )}

      {loading && <Spinner />}

      {!loading && selectedClassId && assignments.length === 0 && (
        <p className="text-muted-foreground text-sm">No assignments yet for this class.</p>
      )}

      <div className="space-y-4">
        {assignments.map(a => (
          <StudentAssignmentCard
            key={a.id}
            assignment={a}
            user={user}
            submittingId={submittingId}
            submissionText={submissionText}
            onSubmissionTextChange={setSubmissionText}
            onSubmit={handleSubmitWithFile}
          />
        ))}
      </div>
    </div>
  )
}

function StudentClassSelector({ user, selectedClassId, onSelect }: { user: AppUser; selectedClassId: string; onSelect: (id: string) => void }) {
  const schoolId = user.schoolId || ''
  const [classes, setClasses] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('studentId', '==', user.id), where('schoolId', '==', schoolId)),
      async (snap) => {
        const classIds = snap.docs.map(d => (d.data() as Enrollment).classId)
        if (!classIds.length) { setClasses([]); setLoading(false); return }
        const classesMap = await fetchDocsByIds<Class>('classes', classIds)
        const subjectIds = [...new Set([...classesMap.values()].map(c => c.subjectId))]
        const subjectsMap = await fetchSubjectsByIds(subjectIds)
        const result = [...classesMap.values()]
          .map(cls => {
            const subject = subjectsMap.get(cls.subjectId)
            return subject ? { id: cls.id!, label: `${subject.code} � ${cls.section}` } : null
          })
          .filter(Boolean) as { id: string; label: string }[]
        setClasses(result)
        setLoading(false)
      }
    )
    return unsub
  }, [user])

  if (loading) return <Spinner text="Loading classes..." />

  return (
    <select
      value={selectedClassId} onChange={e => onSelect(e.target.value)}
      className="w-full max-w-md px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm"
    >
      <option value="">Choose a class...</option>
      {classes.map(c => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </select>
  )
}

function StudentAssignmentCard({ assignment, user, submittingId, submissionText, onSubmissionTextChange, onSubmit }: {
  assignment: Assignment
  user: AppUser
  submittingId: string | null
  submissionText: string
  onSubmissionTextChange: (v: string) => void
  onSubmit: (assignmentId: string, file?: File) => void
}) {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoadingSub(true)
    const unsub = onSnapshot(
      query(collection(db, 'submissions'), where('assignmentId', '==', assignment.id), where('studentId', '==', user.id)),
      (snap) => {
        setSubmission(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() } as Submission)
        setLoadingSub(false)
      }
    )
    return unsub
  }, [assignment.id, user.id])

  const isOverdue = new Date(assignment.dueDate) < new Date()

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0 bg-[#c4a32a]/10 text-[#8b6914]">
          <BookOpen size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground text-base">
            {assignment.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{assignment.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <Clock size={12} />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <FileText size={12} />
              Max: {assignment.maxScore}
            </span>
          </div>
          {!loadingSub && submission && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${submission.score !== null ? 'text-emerald-600' : 'text-amber-600'}`}>
                <CheckCircle2 size={13} />
                {submission.score !== null ? `Score: ${submission.score} / ${assignment.maxScore}` : 'Submitted — Pending grading'}
              </span>
            </div>
          )}
          {!loadingSub && !submission && (
            <div className="mt-3 pt-3 border-t border-border">
              {showSubmitForm ? (
                <div className="space-y-3">
                  <textarea
                    value={submissionText}
                    onChange={e => onSubmissionTextChange(e.target.value)}
                    placeholder="Write your submission..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 text-sm resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" className="hidden"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors">
                      <Upload size={12} /> {selectedFile ? selectedFile.name : 'Attach file'}
                    </button>
                    {selectedFile && (
                      <button onClick={() => setSelectedFile(null)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSubmit(assignment.id, selectedFile || undefined)}
                      disabled={submittingId === assignment.id || (!submissionText.trim() && !selectedFile)}
                      className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-50"
                    >
                      {submittingId === assignment.id ? 'Submitting...' : 'Submit'}
                    </button>
                    <button
                      onClick={() => { setShowSubmitForm(false); onSubmissionTextChange(''); setSelectedFile(null) }}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
                >
                  Submit Assignment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
