const MAX_RETRIES = 3
const BASE_DELAY = 500

export async function retry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    if (attempt >= MAX_RETRIES) throw err
    if (err.code === 'resource-exhausted' || err.code === 'unavailable' || err.code === 'deadline-exceeded' || err.code === 'aborted') {
      const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500
      await new Promise(resolve => setTimeout(resolve, delay))
      return retry(fn, attempt + 1)
    }
    throw err
  }
}
