import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const sa = JSON.parse(readFileSync('serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(sa) })

const db = getFirestore()
const auth = getAuth()

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
function uid(prefix, n) {
  return `${prefix}-${String(n).padStart(4, '0')}`
}

async function set(collection, id, data) {
  await db.collection(collection).doc(id).set(data)
  console.log(`  ✓ ${collection}/${id}`)
}

async function createAuthUser(email, password, displayName) {
  try {
    const user = await auth.createUser({ email, password, displayName })
    console.log(`  ✓ Auth: ${email} (${user.uid})`)
    return user.uid
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await auth.getUserByEmail(email)
      console.log(`  ~ Auth: ${email} already exists (${user.uid})`)
      return user.uid
    }
    throw err
  }
}

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */
const TERM = {
  label: 'SY 2025-2026',
  semester: '1st Semester',
  isActive: true,
  isArchived: false,
}

const SECTIONS = [
  { id: 'G7-MENDEL', name: 'G7-Mendel', gradeLevel: 'G7' },
  { id: 'G8-DARWIN', name: 'G8-Darwin', gradeLevel: 'G8' },
  { id: 'G9-EINSTEIN', name: 'G9-Einstein', gradeLevel: 'G9' },
  { id: 'G10-NEWTON', name: 'G10-Newton', gradeLevel: 'G10' },
]

const COMPONENTS = [
  { name: 'Written Work', weight: 30 },
  { name: 'Performance Task', weight: 50 },
  { name: 'Quarterly Assessment', weight: 20 },
]

const SUBJECTS = [
  { id: 'ENGL7', title: 'English 7', gradeLevel: 'G7', teacherId: 'teacher1' },
  { id: 'MATH7', title: 'Mathematics 7', gradeLevel: 'G7', teacherId: 'teacher2' },
  { id: 'ENGL8', title: 'English 8', gradeLevel: 'G8', teacherId: 'teacher1' },
  { id: 'MATH8', title: 'Mathematics 8', gradeLevel: 'G8', teacherId: 'teacher2' },
  { id: 'ENGL9', title: 'English 9', gradeLevel: 'G9', teacherId: 'teacher1' },
  { id: 'MATH9', title: 'Mathematics 9', gradeLevel: 'G9', teacherId: 'teacher2' },
  { id: 'ENGL10', title: 'English 10', gradeLevel: 'G10', teacherId: 'teacher1' },
  { id: 'MATH10', title: 'Mathematics 10', gradeLevel: 'G10', teacherId: 'teacher2' },
]

const TEACHERS = [
  { id: 'teacher1', name: 'Juan Dela Cruz', email: 'juan.delacruz@schoolms.edu', password: 'DelaCruz(19900115)' },
  { id: 'teacher2', name: 'Maria Santos', email: 'maria.santos@schoolms.edu', password: 'Santos(19900320)' },
]

const STUDENTS = [
  { section: 'G7-MENDEL', id: 'STU001', lastName: 'Alcantara', firstName: 'Ana', birthday: '20100115' },
  { section: 'G7-MENDEL', id: 'STU002', lastName: 'Bautista', firstName: 'Ben', birthday: '20100420' },
  { section: 'G7-MENDEL', id: 'STU003', lastName: 'Cruz', firstName: 'Carla', birthday: '20100710' },
  { section: 'G8-DARWIN', id: 'STU004', lastName: 'Dimagiba', firstName: 'David', birthday: '20090905' },
  { section: 'G8-DARWIN', id: 'STU005', lastName: 'Espiritu', firstName: 'Elena', birthday: '20091130' },
  { section: 'G8-DARWIN', id: 'STU006', lastName: 'Fernandez', firstName: 'Frank', birthday: '20100215' },
  { section: 'G9-EINSTEIN', id: 'STU007', lastName: 'Garcia', firstName: 'Gina', birthday: '20080820' },
  { section: 'G9-EINSTEIN', id: 'STU008', lastName: 'Hernandez', firstName: 'Henry', birthday: '20081010' },
  { section: 'G9-EINSTEIN', id: 'STU009', lastName: 'Ignacio', firstName: 'Iris', birthday: '20090105' },
  { section: 'G10-NEWTON', id: 'STU010', lastName: 'Jimenez', firstName: 'James', birthday: '20070715' },
  { section: 'G10-NEWTON', id: 'STU011', lastName: 'King', firstName: 'Karen', birthday: '20070920' },
  { section: 'G10-NEWTON', id: 'STU012', lastName: 'Lopez', firstName: 'Leo', birthday: '20071201' },
]

/* ================================================================== */
/*  MAIN                                                               */
/* ================================================================== */
async function seed() {
  console.log('\n=== Seeding test data ===\n')

  /* ---- term ------------------------------------------------------- */
  console.log('[Term]')
  await set('terms', 'TERM-001', TERM)

  /* ---- sections --------------------------------------------------- */
  console.log('\n[Sections]')
  for (const s of SECTIONS) {
    await set('sections', s.id, { name: s.name, gradeLevel: s.gradeLevel })
  }

  /* ---- teachers (Auth + Firestore) -------------------------------- */
  console.log('\n[Teachers]')
  const teacherUids = {}
  for (const t of TEACHERS) {
    const authEmail = `${t.id}@schoolms.edu`
    let uid = await createAuthUser(authEmail, t.password, t.name)
    // If user already existed with different uid, use the existing one
    await set('users', uid, {
      email: t.email,
      name: t.name,
      role: 'teacher',
      section: '',
      nfcUid: '',
    })
    teacherUids[t.id] = uid
  }

  /* ---- subjects --------------------------------------------------- */
  console.log('\n[Subjects]')
  for (const s of SUBJECTS) {
    await set('subjects', s.id, {
      code: s.id,
      title: s.title,
      teacherId: teacherUids[s.teacherId],
      termId: 'TERM-001',
      gradeLevel: s.gradeLevel,
      gradingComponents: COMPONENTS,
    })
  }

  /* ---- students (Auth + Firestore) -------------------------------- */
  console.log('\n[Students]')
  const studentUids = {}
  for (const s of STUDENTS) {
    const authEmail = `${s.id}@schoolms.edu`
    const displayName = `${s.lastName}, ${s.firstName}`
    const password = `${s.lastName}.${s.firstName}(${s.birthday})`
    let uid = await createAuthUser(authEmail, password, displayName)
    await set('users', uid, {
      email: authEmail,
      name: displayName,
      firstName: s.firstName,
      lastName: s.lastName,
      role: 'student',
      section: s.section,
      birthday: s.birthday,
      nfcUid: '',
    })
    studentUids[s.id] = uid
  }

  /* ---- classes ---------------------------------------------------- */
  console.log('\n[Classes]')
  const classIds = []
  let classNum = 0
  for (const subj of SUBJECTS) {
    const section = SECTIONS.find(s => s.gradeLevel === subj.gradeLevel)
    classNum++
    const cid = `CLASS-${String(classNum).padStart(3, '0')}`
    await set('classes', cid, {
      subjectId: subj.id,
      section: section.id,
      teacherId: teacherUids[subj.teacherId],
      schedule: `${['MWF', 'TTh'][classNum % 2]} ${7 + (classNum % 6)}:00-${7 + (classNum % 6) + 1}:00`,
      room: `Rm ${200 + classNum}`,
      termId: 'TERM-001',
    })
    classIds.push({ id: cid, subjectId: subj.id, section: section.id })
  }

  /* ---- enrollments ------------------------------------------------ */
  console.log('\n[Enrollments]')
  let enrollCount = 0
  for (const stu of STUDENTS) {
    const sectionClasses = classIds.filter(c => c.section === stu.section)
    for (const cls of sectionClasses) {
      enrollCount++
      await set('enrollments', `ENROLL-${String(enrollCount).padStart(4, '0')}`, {
        studentId: studentUids[stu.id],
        classId: cls.id,
        termId: 'TERM-001',
      })
    }
  }

  /* ---- sample grades ---------------------------------------------- */
  console.log('\n[Grades]')
  let gradeCount = 0
  const componentNames = ['Written Work', 'Performance Task', 'Quarterly Assessment']
  for (const stu of STUDENTS) {
    const sectionClasses = classIds.filter(c => c.section === stu.section)
    for (const cls of sectionClasses) {
      for (const comp of COMPONENTS) {
        gradeCount++
        const score = Math.floor(Math.random() * 31) + 70 // 70-100
        await set('grades', `GRADE-${String(gradeCount).padStart(4, '0')}`, {
          studentId: studentUids[stu.id],
          classId: cls.id,
          componentId: comp.name,
          score,
          maxScore: 100,
        })
      }
    }
  }

  /* ---- sample attendance ------------------------------------------ */
  console.log('\n[Attendance]')
  let attCount = 0
  const statuses = ['present', 'present', 'present', 'present', 'late', 'absent']
  const dates = ['2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05', '2025-06-06']
  for (const stu of STUDENTS) {
    const sectionClasses = classIds.filter(c => c.section === stu.section)
    for (const cls of sectionClasses) {
      for (const date of dates) {
        attCount++
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        await set('attendance', `ATT-${String(attCount).padStart(4, '0')}`, {
          studentId: studentUids[stu.id],
          classId: cls.id,
          date,
          status,
          recordedBy: teacherUids['teacher1'],
        })
      }
    }
  }

  /* ---- sample materials ------------------------------------------- */
  console.log('\n[Materials]')
  for (let i = 0; i < Math.min(classIds.length, 4); i++) {
    const cls = classIds[i]
    const subj = SUBJECTS.find(s => s.id === cls.subjectId)
    await set('materials', `MAT-${String(i + 1).padStart(3, '0')}`, {
      classId: cls.id,
      teacherId: teacherUids[subj.teacherId],
      title: `${subj.title} - Lesson ${i + 1} Notes`,
      driveUrl: 'https://docs.google.com/document/d/sample/edit',
      driveFileId: 'sample',
      createdAt: new Date().toISOString(),
    })
  }

  /* ---- sample announcements --------------------------------------- */
  console.log('\n[Announcements]')
  const announcements = [
    { title: 'Welcome to the New School Year!', content: 'Welcome back to school! We look forward to a productive SY 2025-2026.', author: 'teacher1' },
    { title: 'Parent-Teacher Conference', content: 'Parent-Teacher conference will be held on July 15, 2025.', author: 'teacher1' },
    { title: 'Math Quiz Next Week', content: 'There will be a quiz on Algebra next Friday.', author: 'teacher2' },
  ]
  for (let i = 0; i < announcements.length; i++) {
    const a = announcements[i]
    await set('announcements', `ANN-${String(i + 1).padStart(3, '0')}`, {
      title: a.title,
      content: a.content,
      teacherId: teacherUids[a.author],
      classIds: [],
      createdAt: new Date().toISOString(),
    })
  }

  console.log('\n=== Seed complete! ===')
  console.log(`  Teachers: ${TEACHERS.length}`)
  console.log(`  Students: ${STUDENTS.length}`)
  console.log(`  Subjects: ${SUBJECTS.length}`)
  console.log(`  Classes:  ${classIds.length}`)
  console.log(`  Enrollments: ${enrollCount}`)
  console.log(`  Grades:   ${gradeCount}`)
  console.log(`  Attendance: ${attCount}`)
}

seed().catch(err => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})
