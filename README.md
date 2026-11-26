# Quizify — AI-Powered Assessment Platform (Frontend)

Quizify lets teachers create quizzes (manually or with AI from a syllabus), share them with a link, and run **proctored online tests** with camera, tab-switch and copy-paste monitoring. This is the frontend of my **B.Tech final-year project** at Government Engineering College, Bilaspur.

- **Live demo:** https://major-frontend-seven.vercel.app
- **Backend repo:** https://github.com/Gaurav-Soni24/major-backend

## Features

**For teachers**
- Register / log in (email + password or Google) and manage quizzes from a dashboard.
- Create a quiz manually or **generate questions with AI** from a syllabus, difficulty and question counts, and regenerate single questions.
- Five question types: single choice, multiple choice, text, integer and **code** (in-browser CodeMirror editor).
- Quiz settings: time limit, passing score, shuffled questions/options, password protection, custom registration fields.
- Public quiz links, plus a toggle to publish or unpublish a quiz.
- Submissions list, per-student details with answers, AI feedback and flagged snapshots, and a **PDF report** export.

**For students**
- Open a quiz link, verify with Google, and attempt the quiz in a timed, distraction-free page.

**Anti-cheating (proctoring)**
- **AI camera monitoring** with face detection (face-api.js / TensorFlow.js) that records strikes and flags suspicious snapshots.
- **Tab-switch** and **copy-paste** detection.
- Configurable strike tolerance with **auto-submit** when the limit is exceeded.

## Tech stack

Next.js (App Router), React, JavaScript, CSS Modules, Chart.js, CodeMirror, face-api.js / TensorFlow.js (BlazeFace), jsPDF, Axios, `@react-oauth/google`.

## Run locally

```bash
git clone https://github.com/Gaurav-Soni24/major-frontend.git
cd major-frontend
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. You also need the [backend](https://github.com/Gaurav-Soni24/major-backend) running.

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Quizify backend API (for example `http://localhost:5000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID used for sign-in |

## Deployment

Deployed on Vercel. Every push to `master` triggers a new deployment.

## Related

- Backend: https://github.com/Gaurav-Soni24/major-backend
- Portfolio: https://gauravsoni.space
