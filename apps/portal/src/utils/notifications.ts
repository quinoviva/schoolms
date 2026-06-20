import { addDoc, collection } from 'firebase/firestore'
import { db } from '@pbclc/shared'

export async function createNotification(
  userId: string,
  type: 'grade_released' | 'announcement' | 'assignment',
  message: string,
  relatedId: string
) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    message,
    read: false,
    relatedId,
    createdAt: Date.now(),
  })
}
