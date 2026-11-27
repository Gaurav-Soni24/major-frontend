# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences. **Teachers and trainers** (role `teacher`, plus `admin` in the schema) who create assessments, share a link and review submissions. **Students** who open a shared quiz link, verify with Google, optionally enter a quiz password and custom details (e.g. roll number), then attempt the quiz under optional proctoring. Both often use phones; students may be on weak networks.

## Product Purpose
Quizify is an AI-assisted online assessment platform (B.Tech final-year project, Government Engineering College Bilaspur). Teachers generate or write quizzes (Google Gemini can draft questions from a syllabus), configure timing, shuffling and proctoring, publish a link and review scored, flagged submissions. Students attempt in a distraction-free player. Success: a teacher can create and share a reliable quiz in minutes; a student always knows where they are, what is left and that their answers are safe.

## Positioning
Assessment platform with built-in proctoring (webcam face monitoring, tab-switch and copy-paste detection, strike limits with auto-submit, flagged snapshots) and AI grading for subjective and code answers.

## Operating Context
Frontend Next.js 16 App Router (JavaScript, CSS Modules) on Vercel; backend Express 5 + MongoDB (Mongoose) on Render; Google sign-in for teachers and students; Gemini for generation and grading. Question types: single, multiple, integer, text, code.

## Capabilities and Constraints
Preserve all five question types and existing proctoring. No invented features. Environment values are not available during this work: use `.env.example`, never invent credentials. Never fabricate analytics. Not allowed in this phase: commit, push, deploy.

## Brand Commitments
Name "Quizify". No existing visual identity worth preserving (default Next.js look); the identity is to be re-created. Must not reuse the identities of Velo (race kit), Gaurav's portfolio (book series) or Framivo (theatre / spike tape).

## Evidence on Hand
Public README, live demo https://major-frontend-sable.vercel.app. Old marketing stats on the landing ("12,450 educators", "845K quizzes", "136 countries") are placeholders and must not appear as facts. No testimonials, customer logos or pricing exist: do not invent them.

## Product Principles
Calm under pressure: the student view is quiet and never loses answers. The server is the source of truth for time, scores and permissions. Show real data only. Fewer, clearer steps for teachers.
