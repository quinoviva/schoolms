import { query, where, type Query, type CollectionReference, type QueryConstraint } from 'firebase/firestore'

export function schoolQuery<T>(
  colRef: CollectionReference<T>,
  schoolId: string,
  ...constraints: QueryConstraint[]
): Query<T> {
  return query(colRef, where('schoolId', '==', schoolId), ...constraints)
}
