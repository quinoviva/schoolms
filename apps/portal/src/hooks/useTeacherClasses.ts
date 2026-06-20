import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db, type Subject, type Class } from '@pbclc/shared'

export function useTeacherClasses(teacherId: string) {
  const [classes, setClasses] = useState<(Class & { subject: Subject })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId) { setClasses([]); setLoading(false); return }
    const unsub = onSnapshot(
      query(collection(db, 'classes'), where('teacherId', '==', teacherId)),
      async (snap) => {
        const result: (Class & { subject: Subject })[] = []
        const classData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Class))
        for (const cls of classData) {
          const subjSnap = await getDocs(query(collection(db, 'subjects'), where('__name__', '==', cls.subjectId)))
          if (!subjSnap.empty) {
            result.push({ ...cls, subject: { id: subjSnap.docs[0].id, ...subjSnap.docs[0].data() } as Subject })
          }
        }
        setClasses(result)
        setLoading(false)
      }
    )
    return unsub
  }, [teacherId])

  return { classes, loading }
}
