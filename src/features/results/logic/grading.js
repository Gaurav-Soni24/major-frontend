/**
 * Validate a marks field. Returns `{ value }` or `{ error }`.
 * @param {string|number} input @param {number} max question marks
 */
export function parseMarks(input, max) {
  const raw = String(input ?? "").trim().replace(",", ".");
  if (raw === "") return { error: "Enter the marks awarded." };
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: "Use a number such as 2 or 1.5." };
  const value = Number(raw);
  if (value > max) return { error: `At most ${Math.round(max * 100) / 100} marks for this question.` };
  return { value };
}

/** Questions the teacher still has to look at. @param {any[]} questions */
export const reviewIndexes = (questions) => (questions || []).map((q, i) => (q.needsReview ? i : -1)).filter((i) => i >= 0);

const patchQuestion = (q, grade) => ({
  ...q,
  marksObtained: grade.marksObtained,
  isCorrect: grade.marksObtained > 0,
  needsReview: false,
  manuallyGraded: true,
  teacherFeedback: grade.feedback ?? q.teacherFeedback,
});

/**
 * Merge a server grade response into the cached submission (returns a new object).
 * @param {any} submission @param {number} index @param {{ marksObtained: number, feedback?: string }} grade
 * @param {{ status: string, needsReview: boolean, score: any }} response
 */
export function applyGrade(submission, index, grade, response) {
  return {
    ...submission,
    status: response.status,
    needsReview: response.needsReview,
    score: response.score,
    questions: submission.questions.map((q, i) => (i === index ? patchQuestion(q, grade) : q)),
  };
}

/** Optimistic version of the same update before the server answers (score recomputed locally). */
export function optimisticGrade(submission, index, grade) {
  const questions = submission.questions.map((q, i) => (i === index ? patchQuestion(q, grade) : q));
  const total = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const got = questions.reduce((s, q) => s + (Number(q.marksObtained) || 0), 0);
  const needsReview = questions.some((q) => q.needsReview);
  return {
    ...submission,
    needsReview,
    status: needsReview ? "submitted" : "graded",
    score: { totalMarks: total, obtainedMarks: Math.round(got * 100) / 100, percentage: total > 0 ? Math.round((got / total) * 10000) / 100 : 0 },
    questions,
  };
}

/** Render an answer value as lines of text. @param {any} v */
export function answerLines(v) {
  if (v === null || v === undefined || v === "") return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}
