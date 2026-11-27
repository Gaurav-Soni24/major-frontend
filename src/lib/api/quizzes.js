import { api, PUBLIC, unwrap } from "./client.js";

/**
 * Quiz routes (teacher unless noted). All resolve with the response body and reject with `ApiError`.
 *
 * @typedef {"single"|"multiple"|"text"|"integer"|"code"} QuestionType
 * @typedef {{ text: string, isCorrect?: boolean }} QuizOption
 * @typedef {{ _id?: string, type: QuestionType, text: string, marks: number, options?: QuizOption[], correctAnswer?: string, aiGradingRubric?: string, codeLanguage?: "javascript"|"python", starterCode?: string }} QuizQuestion
 * @typedef {{ title: string, description?: string, instructions?: string[], timeLimit?: number|null, passingScore: number, customFields?: Array<{name:string,type:"text"|"number"}>, password?: string, settings?: { shuffleQuestions?: boolean, shuffleOptions?: boolean, showAnswers?: boolean }, antiCheatSettings?: { aiCamera?: boolean, tabSwitch?: boolean, copyPaste?: boolean, toleranceStrikes?: number }, questions: QuizQuestion[] }} QuizInput
 * @typedef {{ _id: string, title: string, description?: string, isPublic: boolean, timeLimit: number|null, passingScore: number, createdAt: string, updatedAt: string, questionCount: number, totalMarks: number, hasPassword: boolean, stats: { attempts: number, submitted: number, inProgress: number, flagged: number, avgPercentage: number, passRate: number } }} QuizListItem
 * @typedef {{ page: number, limit: number, total: number, pages: number }} Pagination
 */

/**
 * @param {QuizInput} quiz
 * @returns {Promise<{ success: boolean, quizId: string }>}
 */
export function createQuiz(quiz) {
  return unwrap(api.post("/quizzes/create", quiz));
}

/**
 * @param {{ page?: number, limit?: number, search?: string, status?: "all"|"published"|"draft", sort?: "newest"|"oldest"|"title" }} [params]
 * @returns {Promise<{ success: boolean, quizzes: QuizListItem[], pagination?: Pagination }>}
 */
export function listMyQuizzes(params = {}) {
  return unwrap(api.get("/quizzes/my-quizzes", { params: clean(params) }));
}

/**
 * Owner only. Includes correct answers (for the editor).
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, quiz?: QuizInput & { _id: string, isPublic: boolean }, data?: any }>}
 */
export function getQuiz(quizId) {
  return unwrap(api.get(`/quizzes/${enc(quizId)}`));
}

/**
 * Rejected with `QUIZ_HAS_SUBMISSIONS` (409) when questions, timeLimit or passingScore change after submissions exist.
 * @param {string} quizId
 * @param {QuizInput} quiz
 */
export function updateQuiz(quizId, quiz) {
  return unwrap(api.put(`/quizzes/${enc(quizId)}`, quiz));
}

/**
 * Copies a quiz as an unpublished draft.
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, quizId: string }>}
 */
export function duplicateQuiz(quizId) {
  return unwrap(api.post(`/quizzes/${enc(quizId)}/duplicate`));
}

/**
 * Publish or unpublish. The server refuses to publish an invalid quiz.
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, isPublic?: boolean, data?: any }>}
 */
export function togglePublic(quizId) {
  return unwrap(api.post("/quizzes/toggle-public", { quizId }));
}

/**
 * Also deletes the quiz's submissions.
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, deletedSubmissions?: number }>}
 */
export function deleteQuiz(quizId) {
  return unwrap(api.delete(`/quizzes/${enc(quizId)}`));
}

/**
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, summary: { attempts: number, submitted: number, avgPercentage: number, medianPercentage: number, highest: number, lowest: number, passRate: number, avgDurationSeconds: number }, scoreDistribution: Array<{ range: string, count: number }>, questions: Array<{ index: number, _id: string, type: QuestionType, text: string, marks: number, answered: number, correctRate: number, avgMarks: number }> }>}
 */
export function getQuizAnalytics(quizId) {
  return unwrap(api.get(`/quizzes/${enc(quizId)}/analytics`));
}

/**
 * Student-facing quiz (no answers, rubrics or password). Public route.
 * 403 `QUIZ_NOT_PUBLISHED` when the quiz is a draft.
 * @param {string} quizId
 * @returns {Promise<{ success: boolean, data: any, serverTime?: string }>}
 */
export function getPublicQuiz(quizId) {
  return unwrap(api.get(`/quizzes/public/${enc(quizId)}`, PUBLIC));
}

/** @param {string} id */
function enc(id) {
  return encodeURIComponent(id);
}

/** Drop empty query params so URLs stay clean. @param {Record<string, any>} params */
function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"));
}
