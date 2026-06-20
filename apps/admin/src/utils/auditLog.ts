import { addDoc, collection } from 'firebase/firestore'
import { db, auth } from '@pbclc/shared'

export async function createAuditLog(
  userId: string,
  userEmail: string | null,
  action: 'create' | 'update' | 'delete',
  collectionName: string,
  documentId: string,
  details: string
) {
  const currentUser = auth.currentUser
  await addDoc(collection(db, 'auditLogs'), {
    userId: currentUser?.uid || userId,
    userEmail: currentUser?.email || userEmail || '',
    action,
    collection: collectionName,
    documentId,
    details,
    timestamp: Date.now(),
  })
}
