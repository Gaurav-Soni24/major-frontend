import { api, unwrap } from "./client.js";

/**
 * AI routes (teacher). Rate limited to 10 generations per 10 minutes; `AI_UNAVAILABLE` means Gemini failed.
 * The AI call can take a while, so these use a 90 second timeout.
 */
const SLOW = { timeout: 90000 };

/**
 * Draft a whole quiz from a syllabus.
 * @param {{ syllabus: string, field?: string, difficulty?: string, totalMarks?: number, questionCounts: Partial<Record<"single"|"multiple"|"text"|"integer"|"code", number>> }} input
 * @returns {Promise<{ success: boolean, data: { title?: string, questions: any[] } }>}
 */
export function generateQuiz(input) {
  return unwrap(api.post("/ai/generate-quiz", input, SLOW));
}

/**
 * Replace one question with a fresh one of the same type.
 * @param {{ syllabus: string, field?: string, difficulty?: string, type: "single"|"multiple"|"text"|"integer"|"code" }} input
 * @returns {Promise<{ success: boolean, data: any }>}
 */
export function regenerateQuestion(input) {
  return unwrap(api.post("/ai/regenerate-question", input, SLOW));
}
