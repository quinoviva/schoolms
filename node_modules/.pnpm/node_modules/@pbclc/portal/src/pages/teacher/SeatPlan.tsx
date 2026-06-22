import { useEffect, useState, useRef, useCallback } from 'react'
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, setDoc, writeBatch, updateDoc } from 'firebase/firestore'
import { db, fetchSubjectsByIds, fetchUsersByIds, sanitizeString, sanitizeNumber, createAuditLog, type AppUser, type Class, type Subject, type SeatPlan, type ClassroomElement, type AttendanceRecord } from '@pbclc/shared'
import { showToast } from '../../components/ui/toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Smartphone, Plus, GripHorizontal, Monitor, Hash } from 'lucide-react'

const SEAT_W = 80
const SEAT_H = 68
const BOARD_W = 360
const BOARD_H = 48
const DESK_W = 200
const DESK_H = 40
const CANVAS_W = 900
const CANVAS_H = 600

interface DragState {
  id: string; startX: number; startY: number; origX: number; origY: number
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function SeatPlanPage({ user }: { user: AppUser }) {
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null)
  const [students, setStudents] = useState<{ id: string; name: string; nfcUid?: string }[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [elements, setElements] = useState<ClassroomElement[]>([])
  const [nfcScanning, setNfcScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scannedUid, setScannedUid] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [manualUid, setManualUid] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [deletingElementId, setDeletingElementId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragTarget, setDragTarget] = useState<DragState | null>(null)
  const manualRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const nfcSupported = 'NDEFReader' in window
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator as any).standalone === true

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', user.id)),
      async (snap) => {
        const classData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))
        const subjectMap = await fetchSubjectsByIds(classData.map(c => c.subjectId))
        const result = classData
          .map(cls => {
            const subject = subjectMap.get(cls.subjectId)
            return subject ? { ...cls, subject } as Class & { subject: Subject } : null
          })
          .filter(Boolean) as (Class & { subject: Subject })[]
        setClasses(result)
        if (!selectedClassId && result.length) setSelectedClassId(result[0].id)
      }
    )
    return unsub
  }, [user.id])

  useEffect(() => {
    if (!selectedClassId) return
    const unsub = onSnapshot(
      query(collection(db, 'seatPlans'), where('classId', '==', selectedClassId)),
      (snap) => {
        if (!snap.empty) {
          const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as SeatPlan
          setSeatPlan(plan); setElements(plan.elements || [])
        } else {
          setSeatPlan(null); setElements([])
        }
      }
    )
    return unsub
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedClassId) return
    async function loadStudents() {
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('classId', '==', selectedClassId)))
      const ids = enrollSnap.docs.map(d => d.data().studentId)
      const userMap = await fetchUsersByIds(ids)
      const list = ids
        .map(id => {
          const user = userMap.get(id)
          return user ? { id, name: user.name, nfcUid: user.nfcUid } : null
        })
        .filter(Boolean) as { id: string; name: string; nfcUid?: string }[]
      setStudents(list)
    }
    loadStudents()
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedClassId) return
    const unsub = onSnapshot(
      query(collection(db, 'attendance'), where('classId', '==', selectedClassId), where('date', '==', today)),
      (snap) => {
        const map: Record<string, boolean> = {}
        snap.docs.forEach(d => {
          const data = d.data() as AttendanceRecord
          map[data.studentId] = data.status === 'PRESENT'
        })
        setAttendanceMap(map)
      }
    )
    return unsub
  }, [selectedClassId, today])

  useEffect(() => {
    if (!dragTarget) return
    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setElements(prev => prev.map(el =>
        el.id === dragRef.current!.id
          ? { ...el, x: Math.max(0, dragRef.current!.origX + dx), y: Math.max(0, dragRef.current!.origY + dy) }
          : el
      ))
    }
    function handleMouseUp() { dragRef.current = null; setDragTarget(null) }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp) }
  }, [dragTarget])

  function startDrag(e: React.MouseEvent, el: ClassroomElement) {
    e.preventDefault()
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y }
    setDragTarget(dragRef.current)
  }

  function getStudentName(id: string | null | undefined) {
    if (!id) return ''
    return students.find(s => s.id === id)?.name || 'Unknown'
  }

  function getAssignedSeatId(studentId: string) {
    return elements.find(e => e.type === 'seat' && e.studentId === studentId)?.id || null
  }

  function addSeat() {
    const existing = elements.filter(e => e.type === 'seat')
    setElements(prev => [...prev, {
      id: crypto.randomUUID(), type: 'seat',
      x: 60 + (existing.length % 7) * (SEAT_W + 14), y: 140 + Math.floor(existing.length / 7) * (SEAT_H + 14),
      width: SEAT_W, height: SEAT_H, studentId: null,
    }])
  }

  function addBlackboard() {
    setElements(prev => [...prev, {
      id: crypto.randomUUID(), type: 'blackboard',
      x: (CANVAS_W - BOARD_W) / 2, y: 10,
      width: BOARD_W, height: BOARD_H, label: 'Blackboard',
    }])
  }

  function addTeacherDesk() {
    setElements(prev => [...prev, {
      id: crypto.randomUUID(), type: 'teacherDesk',
      x: (CANVAS_W - DESK_W) / 2, y: 70,
      width: DESK_W, height: DESK_H, label: "Teacher's Desk",
    }])
  }

  function removeElement(id: string) {
    setElements(prev => prev.filter(e => e.id !== id))
    setDeletingElementId(null)
  }

  function assignStudentToSeat(seatId: string, studentId: string | null) {
    setElements(prev => {
      const already = prev.find(e => e.type === 'seat' && e.studentId === studentId)
      return prev.map(e => {
        if (e.id === seatId) return { ...e, studentId }
        if (already && e.id === already.id) return { ...e, studentId: null }
        return e
      })
    })
  }

  function handleSeatClickInEdit(seatId: string, currentStudentId: string | null) {
    if (selectedStudentId) {
      if (currentStudentId === selectedStudentId) {
        assignStudentToSeat(seatId, null)
      } else {
        assignStudentToSeat(seatId, selectedStudentId)
      }
      setSelectedStudentId(null)
    } else {
      if (currentStudentId) {
        setSelectedStudentId(currentStudentId)
      }
    }
  }

  async function handleSaveLayout() {
    setSaving(true)
    try {
      const data = { classId: selectedClassId, canvasWidth: sanitizeNumber(CANVAS_W, 100, 5000), canvasHeight: sanitizeNumber(CANVAS_H, 100, 5000), elements, createdAt: seatPlan?.createdAt || Date.now(), updatedAt: Date.now() }
      if (seatPlan) { await setDoc(doc(db, 'seatPlans', seatPlan.id), data) }
      else { await addDoc(collection(db, 'seatPlans'), data) }
      showToast('Seat plan saved!', 'success')
      await createAuditLog(user.id, user.email, 'update', 'seatPlans', seatPlan?.id || '', `Saved seat plan layout for class ${selectedClassId}`)
      setMode('view')
    } catch { showToast('Failed to save seat plan.', 'error') }
    finally { setSaving(false) }
  }

  const handleNfcScan = useCallback(async () => {
    if (!nfcSupported) { showToast('NFC not supported.', 'error'); return }
    setNfcScanning(true)
    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()
      reader.addEventListener('reading', async (event: any) => {
        const uid = event.serialNumber
        await processNfcUid(uid)
        setTimeout(() => setNfcScanning(false), 1200)
      })
      reader.addEventListener('readingerror', () => { showToast('Error reading NFC tag.', 'error'); setNfcScanning(false) })
    } catch (err: any) { showToast(err.message || 'NFC scan failed.', 'error'); setNfcScanning(false) }
  }, [selectedClassId, students, today, user.id, nfcSupported])

  async function markAttendance(studentId: string, remarks = 'NFC scan') {
    const existingSnap = await getDocs(query(collection(db, 'attendance'), where('classId', '==', selectedClassId), where('date', '==', today), where('studentId', '==', studentId)))
    const batch = writeBatch(db)
    existingSnap.docs.forEach(d => batch.delete(doc(db, 'attendance', d.id)))
    batch.set(doc(collection(db, 'attendance')), { studentId, classId: selectedClassId, date: today, status: 'PRESENT', remarks, recordedBy: user.id } satisfies Omit<AttendanceRecord, 'id'>)
    await batch.commit()
  }

  async function processNfcUid(uid: string) {
    const normalized = sanitizeString(uid, 50).trim().toUpperCase()
    setScannedUid(normalized)
    const student = students.find(s => s.nfcUid?.toUpperCase() === normalized)
    if (student) {
      await markAttendance(student.id, 'NFC scan')
      showToast(`${student.name} marked PRESENT`, 'success')
      return
    }
    if (selectedStudentId) {
      await updateDoc(doc(db, 'users', selectedStudentId), { nfcUid: normalized })
      await markAttendance(selectedStudentId, 'NFC scan')
      const name = getStudentName(selectedStudentId)
      showToast(`NFC registered to ${name} — PRESENT`, 'success')
      return
    }
    showToast(`Unknown NFC chip. Select a student first, then tap again.`, 'info')
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uid = params.get('nfc_uid')
    if (uid && selectedClassId) {
      processNfcUid(uid)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [selectedClassId])

  async function handleManualSubmit() {
    if (!manualUid.trim()) return
    await processNfcUid(manualUid.trim())
    setManualUid('')
    setShowManualInput(false)
  }

  async function toggleAttendance(studentId: string, present: boolean) {
    const existingSnap = await getDocs(query(collection(db, 'attendance'), where('classId', '==', selectedClassId), where('date', '==', today), where('studentId', '==', studentId)))
    const batch = writeBatch(db)
    existingSnap.docs.forEach(d => batch.delete(doc(db, 'attendance', d.id)))
    if (present) batch.set(doc(collection(db, 'attendance')), { studentId, classId: selectedClassId, date: today, status: 'PRESENT', remarks: 'Manual', recordedBy: user.id } satisfies Omit<AttendanceRecord, 'id'>)
    await batch.commit()
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const presentCount = Object.values(attendanceMap).filter(Boolean).length

  function renderElement(el: ClassroomElement, isEdit: boolean) {
    const isSeat = el.type === 'seat'
    const studentId = el.studentId
    const student = students.find(s => s.id === studentId)
    const isPresent = attendanceMap[studentId || ''] === true
    const isSelectedStudent = selectedStudentId === studentId

    const baseStyle: React.CSSProperties = {
      position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height,
      cursor: isEdit ? 'grab' : (isSeat && studentId ? 'pointer' : 'default'),
    }

    if (el.type === 'blackboard') {
      return (
        <div key={el.id} style={baseStyle}
          className={`rounded-lg bg-[#1e3a5f] flex items-center justify-center shadow-md select-none ${isEdit ? 'hover:ring-2 hover:ring-[#c4a32a]' : ''}`}
          onMouseDown={isEdit ? (e) => startDrag(e, el) : undefined}>
          <span className="text-white text-xs font-semibold tracking-widest uppercase">{el.label || 'Blackboard'}</span>
          {isEdit && <button onMouseDown={e => e.stopPropagation()} onClick={() => setDeletingElementId(el.id)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[0.55rem] flex items-center justify-center hover:bg-red-600 shadow">Ã—</button>}
        </div>
      )
    }

    if (el.type === 'teacherDesk') {
      return (
        <div key={el.id} style={baseStyle}
          className={`rounded-lg bg-[#8b6914]/80 flex items-center justify-center shadow-sm select-none ${isEdit ? 'hover:ring-2 hover:ring-[#c4a32a]' : ''}`}
          onMouseDown={isEdit ? (e) => startDrag(e, el) : undefined}>
          <span className="text-white text-[0.6rem] font-semibold">{el.label || "Teacher's Desk"}</span>
          {isEdit && <button onMouseDown={e => e.stopPropagation()} onClick={() => setDeletingElementId(el.id)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[0.55rem] flex items-center justify-center hover:bg-red-600 shadow">Ã—</button>}
        </div>
      )
    }

    if (isEdit) {
      return (
        <div key={el.id} style={{ ...baseStyle, cursor: 'pointer' }}
          className={`rounded-lg border-2 flex flex-col items-center justify-center p-1 select-none transition-all ${
            studentId
              ? isSelectedStudent
                ? 'bg-[#c4a32a]/15 border-[#c4a32a] shadow-md'
                : 'bg-[#1e3a5f]/8 border-[#1e3a5f]/40'
              : selectedStudentId
                ? 'bg-emerald-50 border-emerald-400 border-dashed animate-pulse'
                : 'bg-secondary/40 border-dashed border-border'
          } ${dragTarget?.id === el.id ? 'shadow-lg scale-105 opacity-80 z-50' : 'z-10'}`}
          onMouseDown={(e) => startDrag(e, el)}
          onClick={(e) => { e.stopPropagation(); handleSeatClickInEdit(el.id, studentId || null) }}>
          <GripHorizontal size={10} className="text-muted-foreground/40 mb-0.5" />
          {studentId ? (
            <span className={`text-[0.55rem] font-bold text-center leading-tight ${isSelectedStudent ? 'text-[#8b6914]' : 'text-[#1e3a5f]'}`}>
              {getStudentName(studentId)}
            </span>
          ) : (
            <span className="text-[0.5rem] text-muted-foreground">
              {selectedStudentId ? 'Assign â†’' : 'Empty'}
            </span>
          )}
          <button onMouseDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeElement(el.id) }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[0.5rem] flex items-center justify-center hover:bg-red-600 shadow">Ã—</button>
        </div>
      )
    }

    if (!studentId) {
      return (
        <div key={el.id} style={baseStyle}
          className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center select-none">
          <span className="text-[0.5rem] text-gray-400">Empty</span>
        </div>
      )
    }

    return (
      <button key={el.id} style={baseStyle}
        onClick={() => toggleAttendance(studentId, !isPresent)}
        className={`rounded-lg border-2 flex flex-col items-center justify-center p-1 transition-all hover:shadow-md ${
          isPresent ? 'bg-emerald-100 border-emerald-500 shadow-sm' : 'bg-gray-100 border-gray-300'
        }`}>
        <span className={`text-[0.55rem] font-bold text-center leading-tight ${isPresent ? 'text-emerald-800' : 'text-gray-600'}`}>
          {student?.name || 'Unknown'}
        </span>
        <span className={`text-[0.45rem] mt-0.5 font-semibold ${isPresent ? 'text-emerald-600' : 'text-gray-400'}`}>
          {isPresent ? 'PRESENT' : 'ABSENT'}
        </span>
      </button>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[1.65rem] font-bold text-[#1e3a5f] leading-tight">
            Interactive Seat Plan
          </h1>
          {selectedClass && <p className="text-sm text-muted-foreground mt-0.5">{selectedClass.subject.code} Â· {selectedClass.section} Â· {selectedClass.room}</p>}
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25">
            {classes.map(c => <option key={c.id} value={c.id}>{c.subject.code} â€” {c.section}</option>)}
          </select>
          {seatPlan && (
            <button onClick={() => { setMode(mode === 'edit' ? 'view' : 'edit'); setSelectedStudentId(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'edit' ? 'bg-secondary text-foreground border border-border' : 'bg-[#1e3a5f] text-white hover:bg-[#16304f]'}`}>
              {mode === 'edit' ? 'Done Editing' : 'Edit Layout'}
            </button>
          )}
        </div>
      </div>

      {!seatPlan && mode === 'view' && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Monitor size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-3">No seat plan configured yet.</p>
          <button onClick={() => setMode('edit')}
            className="px-6 py-2.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] transition-colors">
            Create Seat Plan
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button onClick={addSeat} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
                  <Plus size={13} /> Add Seat
                </button>
                <button onClick={addBlackboard} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/20 transition-colors">
                  <Plus size={13} /> Blackboard
                </button>
                <button onClick={addTeacherDesk} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f] text-sm font-semibold hover:bg-[#1e3a5f]/20 transition-colors">
                  <Plus size={13} /> Desk
                </button>
                <span className="text-xs text-muted-foreground ml-auto">{elements.filter(e => e.type === 'seat').length} seats</span>
              </div>
              <p className="text-[0.6rem] text-muted-foreground mb-2">
                <strong>1.</strong> Click a student in the right panel â†’ <strong>2.</strong> Click an empty seat to assign.
                Drag elements to reposition.
              </p>
              <div ref={canvasRef} className="relative border border-border rounded-lg bg-[#f8f5f0]/50"
                style={{ width: '100%', height: CANVAS_H, overflow: 'auto', backgroundImage: 'radial-gradient(circle, #d0c8bc 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}>
                <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
                  {elements.map(el => renderElement(el, true))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-56 shrink-0">
            <div className="bg-card rounded-xl border border-border shadow-sm sticky top-4">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Students</h3>
                <span className="text-xs text-muted-foreground">{students.length}</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-2 space-y-1">
                {students.map(s => {
                  const isSelected = selectedStudentId === s.id
                  const seatId = getAssignedSeatId(s.id)
                  const seatIndex = elements.filter(e => e.type === 'seat').findIndex(e => e.id === seatId)
                  return (
                    <button key={s.id} onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-[#c4a32a]/15 border border-[#c4a32a]'
                          : seatId
                            ? 'bg-[#1e3a5f]/5 border border-transparent hover:bg-[#1e3a5f]/10'
                            : 'border border-dashed border-transparent hover:bg-secondary'
                      }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.55rem] font-bold shrink-0 ${
                        isSelected ? 'bg-[#c4a32a] text-white' : seatId ? 'bg-[#1e3a5f]/20 text-[#1e3a5f]' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {initials(s.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[0.65rem] font-semibold truncate ${isSelected ? 'text-[#8b6914]' : 'text-foreground'}`}>
                          {s.name}
                        </p>
                        <p className="text-[0.5rem] text-muted-foreground">
                          {seatId ? `Seat ${seatIndex + 1}` : 'Unassigned'}
                        </p>
                      </div>
                      {s.nfcUid && <span className="text-[0.5rem] text-muted-foreground" title="NFC registered">ðŸ“±</span>}
                    </button>
                  )
                })}
                {students.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No students enrolled</p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border flex justify-between">
                <button onClick={() => { setMode('view'); setElements(seatPlan?.elements || []); setSelectedStudentId(null) }}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold">Cancel</button>
                <button onClick={handleSaveLayout} disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white font-semibold hover:bg-[#16304f] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Layout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'view' && seatPlan && elements.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {nfcSupported ? (
              <button onClick={handleNfcScan} disabled={nfcScanning}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${nfcScanning ? 'bg-emerald-600 text-white animate-pulse' : 'bg-[#1e3a5f] text-white hover:bg-[#16304f]'}`}>
                <Smartphone size={14} /> {nfcScanning ? 'Scanning...' : 'Start NFC Scan'}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary">
                <Smartphone size={12} /> {isIOS ? 'iPhone NFC via Shortcuts' : 'NFC not available'}
              </span>
            )}
            <button onClick={() => setShowManualInput(!showManualInput)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                showManualInput ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5'
              }`}>
              <Hash size={12} /> Enter UID
            </button>
            {scannedUid && <span className="text-xs text-muted-foreground">Last: {scannedUid.slice(0, 8)}...</span>}
            <div className="flex items-center gap-4 ml-auto text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-dashed border-gray-400" /> Empty</span>
            </div>
          </div>

          {showManualInput && (
            <div className="mb-4 p-3 bg-card rounded-lg border border-border flex flex-wrap items-center gap-2">
              <input ref={manualRef} type="text" value={manualUid} onChange={e => setManualUid(e.target.value)}
                placeholder="Paste or type NFC UID..."
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25"
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()} />
              <button onClick={handleManualSubmit} disabled={!manualUid.trim()}
                className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16304f] disabled:opacity-50">
                Mark Present
              </button>
              <button onClick={() => { setShowManualInput(false); setManualUid('') }}
                className="px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-5">
            <div className="flex-1 min-w-0">
              <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div ref={canvasRef} className="relative rounded-lg"
                  style={{ width: '100%', height: CANVAS_H, overflow: 'auto', backgroundImage: 'radial-gradient(circle, #e0d8cc 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}>
                  <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
                    {elements.map(el => renderElement(el, false))}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
                  <span>{students.length} enrolled</span>
                  <span>{presentCount} present · {elements.filter(e => e.type === 'seat' && e.studentId).length - presentCount} absent · {elements.filter(e => e.type === 'seat' && !e.studentId).length} empty</span>
                  <span>{today}</span>
                </div>
              </div>
            </div>

            <div className="w-56 shrink-0">
              <div className="bg-card rounded-xl border border-border shadow-sm sticky top-4">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Students</h3>
                  <span className="text-xs text-muted-foreground">{students.length}</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-2 space-y-1">
                  {students.map(s => {
                    const isSelected = selectedStudentId === s.id
                    const seatId = getAssignedSeatId(s.id)
                    const seatIndex = elements.filter(e => e.type === 'seat' && e.studentId).findIndex(e => e.id === seatId)
                    return (
                      <button key={s.id} onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-[#c4a32a]/15 border border-[#c4a32a]'
                            : 'bg-[#1e3a5f]/5 border border-transparent hover:bg-[#1e3a5f]/10'
                        }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.55rem] font-bold shrink-0 ${
                          isSelected ? 'bg-[#c4a32a] text-white' : 'bg-[#1e3a5f]/20 text-[#1e3a5f]'
                        }`}>
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[0.65rem] font-semibold truncate ${isSelected ? 'text-[#8b6914]' : 'text-foreground'}`}>
                            {s.name}
                          </p>
                          <p className="text-[0.5rem] text-muted-foreground">
                            {seatId ? `Seat ${seatIndex + 1}` : 'No seat'}
                          </p>
                        </div>
                        {s.nfcUid && <span className="text-[0.5rem] text-muted-foreground" title="NFC registered">📱</span>}
                      </button>
                    )
                  })}
                  {students.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No students enrolled</p>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-border text-[0.6rem] text-muted-foreground text-center">
                  {selectedStudentId
                    ? `Selected: ${getStudentName(selectedStudentId)} — tap NFC to register`
                    : 'Tap a student to select for NFC'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === 'view' && seatPlan && elements.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">Seat plan is empty. Switch to Edit to add seats.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingElementId}
        title="Delete Element"
        message="Are you sure you want to remove this element? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deletingElementId) removeElement(deletingElementId) }}
        onCancel={() => setDeletingElementId(null)}
      />
    </div>
  )
}
