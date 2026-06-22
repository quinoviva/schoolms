import { fetchSubjectsByIds } from './batch.js'
import type { Class, Subject } from '../types/index.js'

export async function mergeClassesWithSubjects(
  classData: Class[]
): Promise<(Class & { subject: Subject })[]> {
  if (!classData.length) return []
  const subjectMap = await fetchSubjectsByIds(classData.map(c => c.subjectId))
  return classData
    .map(cls => {
      const subject = subjectMap.get(cls.subjectId)
      return subject ? { ...cls, subject } as Class & { subject: Subject } : null
    })
    .filter(Boolean) as (Class & { subject: Subject })[]
}
