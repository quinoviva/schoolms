import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { checkConnection } from './database.js'
import schoolsRouter from './routes/schools.js'
import usersRouter from './routes/users.js'
import termsRouter from './routes/terms.js'
import subjectsRouter from './routes/subjects.js'
import classesRouter from './routes/classes.js'
import enrollmentsRouter from './routes/enrollments.js'
import gradesRouter from './routes/grades.js'
import attendanceRouter from './routes/attendance.js'
import sectionsRouter from './routes/sections.js'
import announcementsRouter from './routes/announcements.js'
import assignmentsRouter from './routes/assignments.js'
import submissionsRouter from './routes/submissions.js'
import notificationsRouter from './routes/notifications.js'
import driveLinksRouter from './routes/driveLinks.js'
import seatPlansRouter from './routes/seatPlans.js'
import gradeReleasesRouter from './routes/gradeReleases.js'
import auditLogsRouter from './routes/auditLogs.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

app.get('/api/health', async (_req, res) => {
  try {
    await checkConnection()
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

app.use('/api/schools', schoolsRouter)
app.use('/api/users', usersRouter)
app.use('/api/terms', termsRouter)
app.use('/api/subjects', subjectsRouter)
app.use('/api/classes', classesRouter)
app.use('/api/enrollments', enrollmentsRouter)
app.use('/api/grades', gradesRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/sections', sectionsRouter)
app.use('/api/announcements', announcementsRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/drive-links', driveLinksRouter)
app.use('/api/seat-plans', seatPlansRouter)
app.use('/api/grade-releases', gradeReleasesRouter)
app.use('/api/audit-logs', auditLogsRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
