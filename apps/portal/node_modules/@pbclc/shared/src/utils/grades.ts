export const TRANSMUTATION: Record<number, number> = {
  100: 100, 99: 99, 98: 98, 97: 97, 96: 96, 95: 95,
  94: 93, 93: 91, 92: 90, 91: 89, 90: 88,
  89: 87, 88: 86, 87: 85, 86: 84, 85: 83,
  84: 82, 83: 81, 82: 80, 81: 79, 80: 78,
  79: 77, 78: 76, 77: 75, 76: 75, 75: 75,
  74: 73, 73: 72, 72: 71, 71: 70,
  70: 69, 69: 68, 68: 67, 67: 66, 66: 65,
  65: 64, 64: 63, 63: 62, 62: 61, 61: 60, 60: 60,
}

export const GRADE_DESCRIPTORS: Record<string, { min: number; label: string }> = {
  Outstanding: { min: 90, label: 'Outstanding' },
  'Very Satisfactory': { min: 85, label: 'Very Satisfactory' },
  Satisfactory: { min: 80, label: 'Satisfactory' },
  'Fairly Satisfactory': { min: 75, label: 'Fairly Satisfactory' },
  'Did Not Meet Expectations': { min: 0, label: 'Did Not Meet Expectations' },
}

export function transmute(initialGrade: number): number {
  const clamped = Math.max(60, Math.min(100, Math.round(initialGrade)))
  return TRANSMUTATION[clamped] ?? clamped
}

export function getGradeDescriptor(transmuted: number): string {
  if (transmuted >= 90) return 'Outstanding'
  if (transmuted >= 85) return 'Very Satisfactory'
  if (transmuted >= 80) return 'Satisfactory'
  if (transmuted >= 75) return 'Fairly Satisfactory'
  return 'Did Not Meet Expectations'
}

export function computeFinalGrade(
  scores: { componentId: string; score: number; maxScore: number }[],
  components: { id: string; weight: number }[]
): number {
  let total = 0
  for (const comp of components) {
    const compScores = scores.filter(s => s.componentId === comp.id)
    if (!compScores.length) continue
    const avg = compScores.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / compScores.length
    total += avg * (comp.weight / 100)
  }
  return Math.round(total)
}
