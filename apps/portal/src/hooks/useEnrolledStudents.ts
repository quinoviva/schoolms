import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '@pbclc/shared'

export function useEnrolledStudents(classId: string) {
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) { setStudents([]); setLoading(false); return }
    const unsub = onSnapshot(
      query(collection(db, 'enrollments'), where('classId', '==', classId)),
      async (snap) => {
        const ids = snap.docs.map(d => d.data().studentId)
        const list: { id: string; name: string }[] = []
        for (const sid of ids) {
          const usr = await getDocs(query(collection(db, 'users'), where('__name__', '==', sid)))
          if (!usr.empty) {
            list.push({ id: sid, name: usr.docs[0].data().name })
          }
        }
        setStudents(list)
        setLoading(false)
      }
    )
    return unsub
  }, [classId])

  return { students, loading }
}
