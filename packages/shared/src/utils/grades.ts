export type GradingMode = 'transmuted' | 'zero-based'

export interface MatatagSubjectPreset {
  title: string
  shortCode: string
  subjectGroup: string
}

export const MATATAG_SUBJECTS: Record<string, MatatagSubjectPreset[]> = {
  K1: [
    { title: 'Language, Literacy and Communication', shortCode: 'LANG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Makabansa', shortCode: 'MKB', subjectGroup: 'Languages, AP, GMRC/VE' },
  ],
  K2: [
    { title: 'Language, Literacy and Communication', shortCode: 'LANG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Makabansa', shortCode: 'MKB', subjectGroup: 'Languages, AP, GMRC/VE' },
  ],
  G1: [
    { title: 'Language', shortCode: 'LANG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Reading and Literacy', shortCode: 'R&L', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Makabansa', shortCode: 'MKB', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
  ],
  G2: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Makabansa', shortCode: 'MKB', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
  ],
  G3: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Makabansa', shortCode: 'MKB', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
  ],
  G4: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Edukasyong Pantahanan at Pangkabuhayan', shortCode: 'EPP', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G5: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Edukasyong Pantahanan at Pangkabuhayan', shortCode: 'EPP', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G6: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Good Manners and Right Conduct', shortCode: 'GMRC', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Edukasyong Pantahanan at Pangkabuhayan', shortCode: 'EPP', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G7: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Values Education', shortCode: 'VE', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Technology and Livelihood Education', shortCode: 'TLE', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G8: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Values Education', shortCode: 'VE', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Technology and Livelihood Education', shortCode: 'TLE', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G9: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Values Education', shortCode: 'VE', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Technology and Livelihood Education', shortCode: 'TLE', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
  G10: [
    { title: 'Filipino', shortCode: 'FIL', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'English', shortCode: 'ENG', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Mathematics', shortCode: 'MATH', subjectGroup: 'Science, Mathematics' },
    { title: 'Science', shortCode: 'SCI', subjectGroup: 'Science, Mathematics' },
    { title: 'Araling Panlipunan', shortCode: 'AP', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Music & Arts', shortCode: 'MA', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Physical Education & Health', shortCode: 'PEH', subjectGroup: 'EPP/TLE, MAPEH' },
    { title: 'Values Education', shortCode: 'VE', subjectGroup: 'Languages, AP, GMRC/VE' },
    { title: 'Technology and Livelihood Education', shortCode: 'TLE', subjectGroup: 'EPP/TLE, MAPEH' },
  ],
}

export function getMatatagPresets(gradeLevel: string): MatatagSubjectPreset[] {
  return MATATAG_SUBJECTS[gradeLevel] || []
}

export function generateSubjectCode(shortCode: string, gradeLevel: string): string {
  const num = gradeLevel.replace(/[^0-9]/g, '')
  return `${shortCode}${num}`
}

/** DepEd proficiency level descriptors (DO 8, s. 2015 / DO 015, s. 2026) */
export const PROFICIENCY_LEVELS = [
  { label: 'Outstanding', min: 90, remark: 'Passed' },
  { label: 'Very Satisfactory', min: 85, remark: 'Passed' },
  { label: 'Satisfactory', min: 80, remark: 'Passed' },
  { label: 'Fairly Satisfactory', min: 75, remark: 'Passed' },
  { label: 'Did Not Meet Expectations', min: 0, remark: 'Failed' },
] as const

/** DepEd-prescribed component weight sets per subject group (DO 015, s. 2026, Annex B) */
export const DEPED_COMPONENT_WEIGHTS: Record<string, { label: string; weight: number }[]> = {
  'Languages, AP, GMRC/VE': [
    { label: 'Written or Oral Works (WWs)', weight: 20 },
    { label: 'Product or Performance Tasks (PTs)', weight: 50 },
    { label: 'Examinations (EXs)', weight: 30 },
  ],
  'Science, Mathematics': [
    { label: 'Written or Oral Works (WWs)', weight: 20 },
    { label: 'Product or Performance Tasks (PTs)', weight: 50 },
    { label: 'Examinations (EXs)', weight: 30 },
  ],
  'EPP/TLE, MAPEH': [
    { label: 'Written or Oral Works (WWs)', weight: 20 },
    { label: 'Product or Performance Tasks (PTs)', weight: 60 },
    { label: 'Examinations (EXs)', weight: 20 },
  ],
  'SHS Core / Academic Electives': [
    { label: 'Written or Oral Works (WWs)', weight: 20 },
    { label: 'Product or Performance Tasks (PTs)', weight: 50 },
    { label: 'Examinations (EXs)', weight: 30 },
  ],
  'SHS Work Immersion': [
    { label: 'Written or Oral Works (WWs)', weight: 20 },
    { label: 'Product or Performance Tasks (PTs)', weight: 80 },
  ],
  'SHS Research Electives': [
    { label: 'Written or Oral Works (WWs)', weight: 40 },
    { label: 'Product or Performance Tasks (PTs)', weight: 60 },
  ],
}

/** DepEd K-3 descriptive rating scale (DO 015, s. 2026) */
export const DESCRIPTIVE_RATINGS = [
  { label: 'N/A — Not Yet Assessed', code: 'NA' },
  { label: 'Emerging', code: 'E' },
  { label: 'Developing', code: 'D' },
  { label: 'Consolidating', code: 'C' },
  { label: 'Achieved', code: 'A' },
  { label: 'Exemplary', code: 'EX' },
] as const

/**
 * Transmutation table per DO 015, s. 2026 (adjusted for SY 2026-2027).
 * Raw 70 is the lowest that transmutes to a passing 75.
 */
export const TRANSMUTATION_2026: Record<number, number> = {}
for (let r = 70; r <= 100; r++) {
  const high = r >= 95 ? r : r >= 90 ? r - 2 : r >= 85 ? r - 3 : r >= 80 ? r - 4 : r >= 75 ? r - 3 : 75
  TRANSMUTATION_2026[r] = Math.max(75, high)
}

export function transmute(initialGrade: number, mode: GradingMode = 'transmuted'): number {
  const clamped = Math.max(0, Math.min(100, Math.round(initialGrade)))
  if (mode === 'zero-based') return clamped
  if (clamped < 70) return Math.round(clamped * 0.9)
  return TRANSMUTATION_2026[clamped] ?? clamped
}

export function getGradeDescriptor(grade: number): string {
  for (const level of PROFICIENCY_LEVELS) {
    if (grade >= level.min) return level.label
  }
  return PROFICIENCY_LEVELS[PROFICIENCY_LEVELS.length - 1].label
}

export function getProfiencyLabel(grade: number): string {
  return getGradeDescriptor(grade)
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
