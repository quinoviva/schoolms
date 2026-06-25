import db from './database.js'
import { randomUUID } from 'crypto'

const now = Date.now()

/* ── IDs ── */
const school1Id = randomUUID()
const school2Id = randomUUID()

const term1Id = randomUUID()
const term2Id = randomUUID()

const sectionIds = {
  'G7-A': randomUUID(), 'G7-B': randomUUID(), 'G8-A': randomUUID(),
  'G9-A': randomUUID(), 'G9-B': randomUUID(), 'G10-A': randomUUID(),
}

const teacherIds = {
  'john.smith': randomUUID(), 'sarah.johnson': randomUUID(),
  'michael.brown': randomUUID(), 'emily.davis': randomUUID(),
}

const subjectIds: Record<string, string> = {}
function subj(key: string) { subjectIds[key] = randomUUID() }
subj('spfld.math7'); subj('spfld.eng7'); subj('spfld.sci7')
subj('spfld.math8'); subj('spfld.eng8')
subj('river.algebra9'); subj('river.lit9'); subj('river.bio9')
subj('river.geo10'); subj('river.chem10')

interface Student { id: string; lrn: string; name: string; section: string; schoolId: string; email: string }
const students: Student[] = [
  { lrn: '123456789101', name: 'Alice Cooper', section: 'G7-A', schoolId: school1Id, email: '123456789101@schoolms.edu', id: randomUUID() },
  { lrn: '123456789102', name: 'Bob Martinez', section: 'G7-A', schoolId: school1Id, email: '123456789102@schoolms.edu', id: randomUUID() },
  { lrn: '123456789103', name: 'Carol Reyes', section: 'G7-B', schoolId: school1Id, email: '123456789103@schoolms.edu', id: randomUUID() },
  { lrn: '123456789104', name: 'David Kim', section: 'G7-B', schoolId: school1Id, email: '123456789104@schoolms.edu', id: randomUUID() },
  { lrn: '123456789105', name: 'Eva Chen', section: 'G8-A', schoolId: school1Id, email: '123456789105@schoolms.edu', id: randomUUID() },
  { lrn: '123456789106', name: 'Frank Lopez', section: 'G8-A', schoolId: school1Id, email: '123456789106@schoolms.edu', id: randomUUID() },
  { lrn: '123456789107', name: 'Grace Patel', section: 'G8-A', schoolId: school1Id, email: '123456789107@schoolms.edu', id: randomUUID() },
  { lrn: '123456789108', name: 'Henry Nakano', section: 'G7-A', schoolId: school1Id, email: '123456789108@schoolms.edu', id: randomUUID() },
  { lrn: '987654321001', name: 'Iris Thompson', section: 'G9-A', schoolId: school2Id, email: '987654321001@schoolms.edu', id: randomUUID() },
  { lrn: '987654321002', name: 'Jack Wilson', section: 'G9-A', schoolId: school2Id, email: '987654321002@schoolms.edu', id: randomUUID() },
  { lrn: '987654321003', name: 'Karen Okafor', section: 'G9-B', schoolId: school2Id, email: '987654321003@schoolms.edu', id: randomUUID() },
  { lrn: '987654321004', name: 'Leo Garcia', section: 'G9-B', schoolId: school2Id, email: '987654321004@schoolms.edu', id: randomUUID() },
  { lrn: '987654321005', name: 'Mia Andersen', section: 'G10-A', schoolId: school2Id, email: '987654321005@schoolms.edu', id: randomUUID() },
  { lrn: '987654321006', name: 'Noah Brooks', section: 'G10-A', schoolId: school2Id, email: '987654321006@schoolms.edu', id: randomUUID() },
  { lrn: '987654321007', name: 'Olivia Santos', section: 'G10-A', schoolId: school2Id, email: '987654321007@schoolms.edu', id: randomUUID() },
  { lrn: '987654321008', name: 'Peter Johansson', section: 'G9-A', schoolId: school2Id, email: '987654321008@schoolms.edu', id: randomUUID() },
]

async function seed() {
  console.log('Seeding...')

  /* ── Schools ── */
  await db('schools').insert([
    { id: school1Id, name: 'Springfield Academy', slug: 'spfld', is_active: true, owner_name: 'Dev Cyril', owner_email: 'dev-cyril@schoolms.edu', levels: ['kinder', 'elementary', 'highschool', 'senior_highschool'], created_at: now, updated_at: now },
    { id: school2Id, name: 'Riverside High School', slug: 'riverside', is_active: true, owner_name: 'Dev Cyril', owner_email: 'dev-cyril@schoolms.edu', levels: ['highschool', 'senior_highschool'], created_at: now, updated_at: now },
  ])

  /* ── Terms ── */
  await db('terms').insert([
    { id: term1Id, school_id: school1Id, label: 'SY 2025-2026', semester: '1st', is_active: true, is_archived: false, created_at: now },
    { id: term2Id, school_id: school2Id, label: 'SY 2025-2026', semester: '1st', is_active: true, is_archived: false, created_at: now },
  ])

  /* ── Sections ── */
  await db('sections').insert([
    { id: sectionIds['G7-A'], school_id: school1Id, name: 'G7-A', grade_level: 'G7' },
    { id: sectionIds['G7-B'], school_id: school1Id, name: 'G7-B', grade_level: 'G7' },
    { id: sectionIds['G8-A'], school_id: school1Id, name: 'G8-A', grade_level: 'G8' },
    { id: sectionIds['G9-A'], school_id: school2Id, name: 'G9-A', grade_level: 'G9' },
    { id: sectionIds['G9-B'], school_id: school2Id, name: 'G9-B', grade_level: 'G9' },
    { id: sectionIds['G10-A'], school_id: school2Id, name: 'G10-A', grade_level: 'G10' },
  ])

  /* ── Teachers ── */
  const teachers = [
    { id: teacherIds['john.smith'], email: 'john.smith@schoolms.edu', name: 'John Smith', role: 'teacher', school_id: school1Id, created_at: now },
    { id: teacherIds['sarah.johnson'], email: 'sarah.johnson@schoolms.edu', name: 'Sarah Johnson', role: 'teacher', school_id: school1Id, created_at: now },
    { id: teacherIds['michael.brown'], email: 'michael.brown@schoolms.edu', name: 'Michael Brown', role: 'teacher', school_id: school2Id, created_at: now },
    { id: teacherIds['emily.davis'], email: 'emily.davis@schoolms.edu', name: 'Emily Davis', role: 'teacher', school_id: school2Id, created_at: now },
  ]
  await db('users').insert(teachers)

  /* ── Students ── */
  await db('users').insert(students.map(s => ({
    id: s.id, email: s.email, name: s.name, role: 'student', section: s.section, school_id: s.schoolId, lrn: s.lrn, created_at: now,
  })))

  /* ── Subjects with DepEd-aligned grading components (DO 015, s. 2026) ── */
  const subjects = [
    { id: subjectIds['spfld.math7'], school_id: school1Id, code: 'MATH7', title: 'Mathematics 7', teacher_id: teacherIds['john.smith'], term_id: term1Id, grade_level: 'G7', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['spfld.eng7'], school_id: school1Id, code: 'ENG7', title: 'English 7', teacher_id: teacherIds['sarah.johnson'], term_id: term1Id, grade_level: 'G7', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['spfld.sci7'], school_id: school1Id, code: 'SCI7', title: 'Science 7', teacher_id: teacherIds['john.smith'], term_id: term1Id, grade_level: 'G7', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['spfld.math8'], school_id: school1Id, code: 'MATH8', title: 'Mathematics 8', teacher_id: teacherIds['sarah.johnson'], term_id: term1Id, grade_level: 'G8', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['spfld.eng8'], school_id: school1Id, code: 'ENG8', title: 'English 8', teacher_id: teacherIds['john.smith'], term_id: term1Id, grade_level: 'G8', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['river.algebra9'], school_id: school2Id, code: 'ALG9', title: 'Algebra I', teacher_id: teacherIds['michael.brown'], term_id: term2Id, grade_level: 'G9', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['river.lit9'], school_id: school2Id, code: 'LIT9', title: 'Literature 9', teacher_id: teacherIds['emily.davis'], term_id: term2Id, grade_level: 'G9', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['river.bio9'], school_id: school2Id, code: 'BIO9', title: 'Biology', teacher_id: teacherIds['michael.brown'], term_id: term2Id, grade_level: 'G9', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['river.geo10'], school_id: school2Id, code: 'GEO10', title: 'World Geography', teacher_id: teacherIds['emily.davis'], term_id: term2Id, grade_level: 'G10', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
    { id: subjectIds['river.chem10'], school_id: school2Id, code: 'CHEM10', title: 'Chemistry', teacher_id: teacherIds['michael.brown'], term_id: term2Id, grade_level: 'G10', grading_components: JSON.stringify([{ name: 'Written or Oral Works (WWs)', weight: 20 }, { name: 'Product or Performance Tasks (PTs)', weight: 50 }, { name: 'Examinations (EXs)', weight: 30 }]), created_at: now },
  ]
  await db('subjects').insert(subjects)

  /* ── Classes (section + subject pairings) ── */
  const classIds: Record<string, string> = {}
  function cls(key: string) { classIds[key] = randomUUID() }
  cls('spfld.g7a.math7'); cls('spfld.g7b.math7'); cls('spfld.g7a.eng7'); cls('spfld.g7b.eng7')
  cls('spfld.g7a.sci7'); cls('spfld.g7b.sci7')
  cls('spfld.g8a.math8'); cls('spfld.g8a.eng8')
  cls('river.g9a.algebra9'); cls('river.g9b.algebra9'); cls('river.g9a.lit9'); cls('river.g9b.lit9')
  cls('river.g9a.bio9'); cls('river.g9b.bio9')
  cls('river.g10a.geo10'); cls('river.g10a.chem10')

  await db('classes').insert([
    { id: classIds['spfld.g7a.math7'], subject_id: subjectIds['spfld.math7'], section: 'G7-A', teacher_id: teacherIds['john.smith'], schedule: 'MWF 8:00-9:00', room: '101', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g7b.math7'], subject_id: subjectIds['spfld.math7'], section: 'G7-B', teacher_id: teacherIds['john.smith'], schedule: 'MWF 9:00-10:00', room: '101', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g7a.eng7'], subject_id: subjectIds['spfld.eng7'], section: 'G7-A', teacher_id: teacherIds['sarah.johnson'], schedule: 'TTh 8:00-9:30', room: '102', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g7b.eng7'], subject_id: subjectIds['spfld.eng7'], section: 'G7-B', teacher_id: teacherIds['sarah.johnson'], schedule: 'TTh 9:30-11:00', room: '102', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g7a.sci7'], subject_id: subjectIds['spfld.sci7'], section: 'G7-A', teacher_id: teacherIds['john.smith'], schedule: 'TTh 10:00-11:30', room: 'Lab 1', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g7b.sci7'], subject_id: subjectIds['spfld.sci7'], section: 'G7-B', teacher_id: teacherIds['john.smith'], schedule: 'MWF 10:00-11:00', room: 'Lab 1', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g8a.math8'], subject_id: subjectIds['spfld.math8'], section: 'G8-A', teacher_id: teacherIds['sarah.johnson'], schedule: 'MWF 8:00-9:00', room: '103', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['spfld.g8a.eng8'], subject_id: subjectIds['spfld.eng8'], section: 'G8-A', teacher_id: teacherIds['john.smith'], schedule: 'TTh 8:00-9:30', room: '103', term_id: term1Id, school_id: school1Id, created_at: now },
    { id: classIds['river.g9a.algebra9'], subject_id: subjectIds['river.algebra9'], section: 'G9-A', teacher_id: teacherIds['michael.brown'], schedule: 'MWF 8:00-9:00', room: '201', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g9b.algebra9'], subject_id: subjectIds['river.algebra9'], section: 'G9-B', teacher_id: teacherIds['michael.brown'], schedule: 'MWF 9:00-10:00', room: '201', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g9a.lit9'], subject_id: subjectIds['river.lit9'], section: 'G9-A', teacher_id: teacherIds['emily.davis'], schedule: 'TTh 8:00-9:30', room: '202', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g9b.lit9'], subject_id: subjectIds['river.lit9'], section: 'G9-B', teacher_id: teacherIds['emily.davis'], schedule: 'TTh 9:30-11:00', room: '202', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g9a.bio9'], subject_id: subjectIds['river.bio9'], section: 'G9-A', teacher_id: teacherIds['michael.brown'], schedule: 'MWF 10:00-11:00', room: 'Lab 2', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g9b.bio9'], subject_id: subjectIds['river.bio9'], section: 'G9-B', teacher_id: teacherIds['michael.brown'], schedule: 'TTh 10:00-11:30', room: 'Lab 2', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g10a.geo10'], subject_id: subjectIds['river.geo10'], section: 'G10-A', teacher_id: teacherIds['emily.davis'], schedule: 'MWF 8:00-9:00', room: '203', term_id: term2Id, school_id: school2Id, created_at: now },
    { id: classIds['river.g10a.chem10'], subject_id: subjectIds['river.chem10'], section: 'G10-A', teacher_id: teacherIds['michael.brown'], schedule: 'TTh 8:00-9:30', room: 'Lab 3', term_id: term2Id, school_id: school2Id, created_at: now },
  ])

  /* ── Enrollments ── */
  const enrollments: { studentId: string; classId: string }[] = []
  const sectionClassMap: Record<string, string[]> = {
    'G7-A': ['spfld.g7a.math7', 'spfld.g7a.eng7', 'spfld.g7a.sci7'],
    'G7-B': ['spfld.g7b.math7', 'spfld.g7b.eng7', 'spfld.g7b.sci7'],
    'G8-A': ['spfld.g8a.math8', 'spfld.g8a.eng8'],
    'G9-A': ['river.g9a.algebra9', 'river.g9a.lit9', 'river.g9a.bio9'],
    'G9-B': ['river.g9b.algebra9', 'river.g9b.lit9', 'river.g9b.bio9'],
    'G10-A': ['river.g10a.geo10', 'river.g10a.chem10'],
  }
  for (const s of students) {
    const classes = sectionClassMap[s.section] || []
    for (const ck of classes) {
      enrollments.push({ studentId: s.id, classId: classIds[ck] })
    }
  }
  await db('enrollments').insert(
    enrollments.map(e => ({ id: randomUUID(), student_id: e.studentId, class_id: e.classId, term_id: e.classId.startsWith('spfld') ? term1Id : term2Id }))
  )

  console.log('Seed complete!')
  console.log(`  Schools: 2`)
  console.log(`  Teachers: ${teachers.length}`)
  console.log(`  Students: ${students.length}`)
  console.log(`  Subjects: ${subjects.length}`)
  console.log(`  Classes: ${Object.keys(classIds).length}`)
  console.log(`  Enrollments: ${enrollments.length}`)
  console.log()
  console.log('Test accounts (password: test123):')
  console.log('  john.smith (teacher, Springfield)')
  console.log('  sarah.johnson (teacher, Springfield)')
  console.log('  michael.brown (teacher, Riverside)')
  console.log('  emily.davis (teacher, Riverside)')
  console.log('  alice.cooper (student)')
  console.log('  bob.martinez (student)')
  console.log('  iris.thompson (student)')
  console.log('  mia.andersen (student)')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
