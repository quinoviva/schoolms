import { addDoc, collection } from 'firebase/firestore'
import { db } from '@academix/shared'

export async function createNotification(
  userId: string,
  type: 'grade_released' | 'announcement' | 'assignment',
  message: string,
  relatedId: string,
  schoolId?: string
) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    message,
    read: false,
    relatedId,
    schoolId: schoolId || null,
    createdAt: Date.now(),
  })
}
