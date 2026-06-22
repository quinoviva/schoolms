import { collection, query, where, getDocs, type DocumentData, type Firestore } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import type { Subject } from '../types/index.js'

const IN_BATCH_SIZE = 10

export async function fetchDocsByIds<T extends DocumentData>(
  colPath: string,
  ids: string[]
): Promise<Map<string, T>> {
  const result = new Map<string, T>()
  if (!ids.length) return result

  for (let i = 0; i < ids.length; i += IN_BATCH_SIZE) {
    const batch = ids.slice(i, i + IN_BATCH_SIZE)
    const snap = await getDocs(query(collection(db, colPath), where('__name__', 'in', batch)))
    snap.docs.forEach(d => result.set(d.id, d.data() as T))
  }
  return result
}

export async function fetchSubjectsByIds(
  ids: string[]
): Promise<Map<string, Subject>> {
  return fetchDocsByIds<Subject>('subjects', ids)
}

export async function fetchUsersByIds(
  ids: string[]
): Promise<Map<string, { name: string; section?: string; nfcUid?: string }>> {
  return fetchDocsByIds<{ name: string; section?: string; nfcUid?: string }>('users', ids)
}
