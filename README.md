# Quizify — AI-Powered Assessment Platform (Frontend)

Quizify lets teachers create quizzes (manually or with AI from a syllabus), share them with a link, and run **proctored online tests** with camera, tab-switch and copy-paste monitoring. This is the frontend of my **B.Tech final-year project** at Government Engineering College, Bilaspur.

- **Live demo:** https://major-frontend-sable.vercel.app
- **Backend repo:** https://github.com/Gaurav-Soni24/major-backend

## Features

**For teachers**
- Register / log in (email + password or Google). Overview with real activity numbers, a paginated quizzes list (search, status, sort), and a profile page with password change.
- **Quiz editor** (create and edit): five question types (single, multiple, integer, text, code), live validation that mirrors the API, undo / redo, drag or keyboard reordering, **AI generation** from a syllabus and single-question regeneration, student preview, draft autosave and restore, publish checklist and a share dialog.
- Quiz settings: time limit, passing score, shuffled questions and options, show answers, quiz password, custom registration fields, proctoring options.
- **Results and analytics** per quiz (filters, CSV / XLSX export, score distribution, per-question stats) and a **submission review** page with flagged snapshots, manual grading and a PDF report.

**For students**
- Open the quiz link, verify with Google, optionally enter the quiz password and details, then attempt in a quiet player: server-synced timer, **autosave with offline retry**, resume after a reload, question palette, mark for review, keyboard shortcuts and a mobile layout. Results page and a past-results portal.

**Proctoring (all optional per quiz)**
- Webcam face monitoring (face-api.js, model weights are served from `/models`), tab-switch and copy-paste detection, strike tolerance from the quiz settings, auto-submit, flagged snapshots.

## Tech stack

Next.js 16 (App Router), React 19, JavaScript, CSS Modules with design tokens (`src/styles/tokens.css`), CodeMirror (lazy), face-api.js (lazy), xlsx, jsPDF, Axios, `@react-oauth/google`. No UI framework.

## Project structure

```
src/app          routes (thin pages)
src/components   ui kit (@/components/ui), charts, layout shell, landing, auth
src/features     attempt, dashboard, profile, quiz-editor, quizzes-list, results, student-portal
src/lib          api client (@/lib/api), auth session, utils, validation
tests            node --test unit tests for the pure logic
```

## Run locally

```bash
git clone https://github.com/Gaurav-Soni24/major-frontend.git
cd major-frontend
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. You also need the [backend](https://github.com/Gaurav-Soni24/major-backend) running.

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test` (unit tests, no browser or env values needed).

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL **including `/api`** (for example `http://localhost:5000/api`). A value without `/api` is accepted too. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID. Without it the Google buttons show a disabled "not configured" state. |
| `NEXT_PUBLIC_SITE_URL` | Optional public URL for canonical links, Open Graph and the sitemap. |
| `NEXT_DIST_DIR` | Optional build directory so several dev servers can share the folder. |

## Deployment

Deployed on Vercel. Every push to `master` triggers a new deployment.

## Related

- Backend: https://github.com/Gaurav-Soni24/major-backend
- Portfolio: https://gauravsoni.space
