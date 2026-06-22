export function sanitizeString(val: unknown, maxLen = 200): string {
  if (typeof val !== 'string') return ''
  return val.slice(0, maxLen).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

export function sanitizeNumber(val: unknown, min = -Infinity, max = Infinity): number {
  const n = typeof val === 'number' ? val : Number(val)
  if (isNaN(n)) return 0
  return Math.min(Math.max(n, min), max)
}

export function sanitizeDate(val: unknown): string {
  if (typeof val !== 'string') return ''
  const match = val.match(/^\d{4}-\d{2}-\d{2}$/)
  return match ? val : ''
}
