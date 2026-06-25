import { createNotification as apiCreateNotification } from '@academix/shared'

export async function createNotification(
  userId: string,
  type: 'grade_released' | 'announcement' | 'assignment',
  message: string,
  relatedId: string,
  schoolId?: string
) {
  await apiCreateNotification({
    id: crypto.randomUUID(),
    userId,
    type,
    message,
    read: false,
    relatedId,
    schoolId: schoolId || '',
    createdAt: Date.now(),
  })
}
