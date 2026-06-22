# AGENTS.md — ACADEMIX

## Stack

pnpm workspace monorepo: `@academix/portal` (port 5173), `@academix/admin` (port 5174), `@academix/shared`. Vite 6 + React 18 + TypeScript per app. Firebase Auth + Firestore backend. Tailwind CSS v4 via `@tailwindcss/vite` — PostCSS intentionally empty, do not add plugins. Font: `'Google Sans', 'Inter', system-ui, sans-serif` via `@theme inline` CSS vars.

## Commands

```sh
pnpm install            # install all workspace deps
pnpm dev                # runs both portal + admin concurrently
pnpm dev:portal         # portal only, port 5173
pnpm dev:admin          # admin only, port 5174
pnpm build              # build all packages (shared → portal → admin)
```

No test, lint, format, or typecheck tasks exist. Each app builds via `tsc -b && vite build`.

## Architecture — don't guess these

- **Two independent SPAs** sharing a Firebase project via `@academix/shared` (source-level dep, no build step). Each has its own `vite.config.ts`, `tsconfig.json`, `.env`.
- **Manual `useState` page routing** — no `<Routes>` or React Router imports. Look for `const [page, setPage] = useState(...)` + `switch (page)`. Pages are function components keyed by string.
- **Admin role guard** in `admin/src/contexts/AuthContext.tsx` — immediately signs out any user whose Firestore profile does not have `role === 'admin'`. Admin `signIn` also checks role before allowing login.
- **Firebase email convention**: stored internally as `{id}@schoolms.edu`. LoginPage auto-appends `@schoolms.edu` if the input has no `@`. Password reset also auto-appends. `@x` is rejected by Firebase Auth — use `.edu` domains only.
- **Admin creates subjects with grade levels and grading components**. Teachers cannot create subjects — they only create class instances (section + schedule + room) from admin-assigned subjects in `TeacherClasses.tsx`.
- **Subjects have `gradeLevel`** (e.g. `G7`) — teacher classes view groups subjects by this field.
- **Grading components** (`{ name, weight }[]`) are defined per-subject by admin, weights must sum to 100%. Scores stored per-component in `grades` collection; final grade computed client-side.
- **Bulk student creation** in admin UserManagement: textarea format `ID,LastName,FirstName,Section,Birthday(YYYYMMDD)`. Firebase Auth password: `LastName.FirstName(Birthday)`.
- **Seat plan** uses free-form canvas (`ClassroomElement[]` with `{x,y,width,height}` positions). NFC attendance via Web NFC API (Android) or manual UID / `?nfc_uid=` URL param (iPhone fallback).
- **Dark mode**: persisted to localStorage, toggled via `ThemeContext`. Custom brand palette with CSS variables.
- **Toast** system via `showToast()` + `<ToastContainer />` in each app. **ConfirmDialog**, **Spinner** in `components/ui/`.
- **Google Drive integration**: Teachers paste Drive share URLs in `materials` collection — students see them and click to open in Drive. `extractDriveFileId()` parses URLs, `getDriveViewUrl()` builds the redirect link.
- **Grade computation** in `packages/shared/src/utils/grades.ts` — DepEd transmutation table (60–100 scale), `computeFinalGrade()`, `transmute()`, `getGradeDescriptor()`. Report Cards page prints SF9-style cards per student.

## Firestore collections

| Collection | Key fields |
|---|---|
| `users` | `email`, `name`, `role`, `section`, `nfcUid` |
| `terms` | `label`, `semester`, `isActive`, `isArchived` |
| `subjects` | `code`, `title`, `teacherId`, `termId`, `gradeLevel`, `gradingComponents[]` |
| `classes` | `subjectId`, `section`, `teacherId`, `schedule`, `room`, `termId` |
| `enrollments` | `studentId`, `classId`, `termId` |
| `grades` | `studentId`, `classId`, `componentId`, `score`, `maxScore` |
| `attendance` | `studentId`, `classId`, `date`, `status`, `recordedBy` |
| `sections` | `name`, `gradeLevel` |
| `materials` | `classId`, `teacherId`, `title`, `driveUrl`, `driveFileId` |
| `announcements`, `assignments`, `submissions`, `notifications`, `seatPlans`, `auditLogs`, `gradeReleases` | various |

## Style

- Inline Tailwind classes only. No CSS modules or styled-components.
- Color palette: navy `#1e3a5f`, gold `#8b6914` / `#c4a32a`, warm background `#f8f5f0`. All exposed as CSS variables via `@theme inline` in each app's `styles/theme.css`.
- `VITE_FIREBASE_*` env vars are read at each app root (e.g. `apps/portal/.env`), not the monorepo root.

## Gotchas

- Active Firebase project: `school-a1540` (API key `AIzaSyDhgy4dIduBgjLojuWW4eQzUw1jV38GZmU`). Admin account: `dev-cyril@schoolms.edu` / `cyril2026` (login: `dev-cyril`, app auto-appends `@schoolms.edu`).
- No emulators — connects directly to production.
- When creating Firestore documents via code, spread `id` from the snapshot (`{ id: d.id, ...d.data() }`) — documents don't store their own id.
- The `packages/shared/` entrypoint (`src/index.ts`) re-exports types + firebase config. It is a workspace dependency with `"main": "src/index.ts"` (no build output).
