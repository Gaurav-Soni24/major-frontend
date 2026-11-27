import { api, PUBLIC, studentConfig, unwrap } from "./client.js";

/**
 * Submission routes.
 *
 * Student flow (no teacher token is ever sent):
 *   1. `verifyGoogle`   -> `studentToken`
 *   2. `startAttempt(…, studentToken)` -> `attemptToken`, `deadlineAt`, saved answers
 *   3. `saveAnswers(…, attemptToken)` repeatedly (autosave)
 *   4. `submitAttempt(…, attemptToken)` once; `getResult` survives a refresh
 * Teacher review routes use the teacher Bearer token automatically.
 *
 * @typedef {{ questionId: string, userAnswer: any }} AnswerEntry
 * @typedef {{ tabSwitches?: number, webcamStrikes?: number, copyPasteAttempts?: number }} AntiCheatCounters
 * @typedef {{ totalMarks: number, obtainedMarks: number, percentage: number }} Score
 * @typedef {{ success: boolean, status: string, score: Score, passed: boolean, passingScore: number, needsReview: boolean, result: null | { questions: Array<{ index: number, type: string, text: string, marks: number, marksObtained: number, isCorrect: boolean, userAnswer: any, correctAnswer: any, aiFeedback?: string }> } }} SubmissionResult
 * @typedef {{ page: number, limit: number, total: number, pages: number }} Pagination
 */

/** @param {string} id */
const enc = (id) => encodeURIComponent(id);

/**
 * Verify a Google credential. Pass `"portal-auth"` as quizId for the student portal.
 * @param {{ quizId: string, credential: string }} input
 * @returns {Promise<{ success: boolean, email: string, name: string, googleId: string, studentToken: string, status: "new"|"in-progress"|"submitted", submissionId?: string }>}
 */
export function verifyGoogle({ quizId, credential }) {
  return unwrap(api.post("/submissions/verify-google", { quizId, credential }, PUBLIC));
}

/**
 * Start or resume an attempt. Name and email come from the student token on the server.
 * @param {{ quizId: string, customData?: Record<string, string|number>, password?: string }} input
 * @param {string} studentToken
 * @returns {Promise<{ success: boolean, submissionId: string, attemptToken?: string, startedAt: string, deadlineAt: string|null, serverTime: string, resumed: boolean, answers: AnswerEntry[], antiCheat: AntiCheatCounters }>}
 */
export function startAttempt({ quizId, customData, password }, studentToken) {
  return unwrap(api.post("/submissions/start-attempt", { quizId, customData, password }, studentConfig(studentToken)));
}

/**
 * Autosave. Merges by question id. Counters only ever go up.
 * Rejects with ALREADY_SUBMITTED (409) or ATTEMPT_EXPIRED (410).
 * @param {string} submissionId
 * @param {{ answers: AnswerEntry[], antiCheat?: AntiCheatCounters }} body
 * @param {string} attemptToken
 * @returns {Promise<{ success: boolean, savedAt: string, remainingSeconds: number|null, serverTime: string }>}
 */
export function saveAnswers(submissionId, body, attemptToken) {
  return unwrap(api.put(`/submissions/${enc(submissionId)}/answers`, body, studentConfig(null, attemptToken)));
}

/**
 * Record a proctoring event; the image (base64, <= 400 kb) is optional.
 * @param {{ submissionId: string, imageBase64?: string, reason: string }} body
 * @param {string} attemptToken
 */
export function flagActivity(body, attemptToken) {
  return unwrap(api.post("/submissions/flag", body, studentConfig(null, attemptToken)));
}

/**
 * Final submit. Idempotent: repeat calls return the stored result.
 * @param {{ submissionId: string, answers?: AnswerEntry[], antiCheat?: AntiCheatCounters }} body
 * @param {string} attemptToken
 * @returns {Promise<SubmissionResult>}
 */
export function submitAttempt(body, attemptToken) {
  return unwrap(api.post("/submissions", body, studentConfig(null, attemptToken)));
}

/**
 * Result for a finished attempt. Use either token.
 * @param {string} submissionId
 * @param {{ attemptToken?: string, studentToken?: string }} tokens
 * @returns {Promise<SubmissionResult>}
 */
export function getResult(submissionId, { attemptToken, studentToken }) {
  return unwrap(api.get(`/submissions/${enc(submissionId)}/result`, studentConfig(studentToken, attemptToken)));
}

/**
 * Student portal list. The student token's email must equal `email`.
 * @param {string} email
 * @param {string} studentToken
 * @returns {Promise<{ success: boolean, submissions: Array<{ _id: string, quizId: string, quizTitle: string, status: string, score: Score, passed: boolean, submittedAt: string }> }>}
 */
export function getStudentSubmissions(email, studentToken) {
  return unwrap(api.get(`/submissions/student/${enc(email)}`, studentConfig(studentToken)));
}

/**
 * Teacher: submissions of one quiz.
 * @param {string} quizId
 * @param {{ page?: number, limit?: number, status?: "all"|"submitted"|"in-progress"|"graded", flagged?: boolean, search?: string, sort?: "newest"|"score" }} [params]
 * @returns {Promise<{ success: boolean, submissions: any[], pagination?: Pagination, summary?: { count: number, submitted: number, inProgress: number, flagged: number, avgPercentage: number, passRate: number } }>}
 */
export function listQuizSubmissions(quizId, params = {}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all" && v !== false),
  );
  return unwrap(api.get(`/submissions/quiz/${enc(quizId)}`, { params: query }));
}

/**
 * Teacher: one submission with flagged images and a trimmed quiz.
 * @param {string} submissionId
 */
export function getSubmissionDetails(submissionId) {
  return unwrap(api.get(`/submissions/details/${enc(submissionId)}`));
}

/**
 * Teacher: manually grade one question (0 <= marksObtained <= question marks).
 * @param {string} submissionId
 * @param {{ questionIndex: number, marksObtained: number, feedback?: string }} body
 */
export function gradeQuestion(submissionId, body) {
  return unwrap(api.patch(`/submissions/details/${enc(submissionId)}/grade`, body));
}

/**
 * Teacher: discard a submission (lets the student retry).
 * @param {string} submissionId
 */
export function deleteSubmission(submissionId) {
  return unwrap(api.delete(`/submissions/details/${enc(submissionId)}`));
}
