import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export async function createAuditLog(
  userId: string,
  userEmail: string | null | undefined,
  action: 'create' | 'update' | 'delete' | 'grade' | 'mark',
  collectionName: string,
  documentId: string | null,
  details: string
) {
  await addDoc(collection(db, 'auditLogs'), {
    userId,
    userEmail: userEmail || '',
    action,
    collection: collectionName,
    documentId: documentId || '',
    details,
    timestamp: Date.now(),
  })
}
