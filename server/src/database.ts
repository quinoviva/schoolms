import knex from 'knex'
import config from './knexfile.js'

const db = knex(config)

export async function checkConnection(): Promise<void> {
  await db.raw('SELECT 1')
}

export function schoolScope(schoolId: string | undefined) {
  return function (tableName: string) {
    let q = db(tableName)
    if (schoolId) q = q.where('school_id', schoolId)
    return q
  }
}

export default db
